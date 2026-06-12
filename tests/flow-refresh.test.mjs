/**
 * flow-refresh.test.mjs — the diff-scoped citation classifier (wiki-flow-refresh.mjs).
 *
 * The contract under test: --apply may rewrite ONLY provably-safe citations
 * (cited bytes identical to what the author verified — untouched/shifted) and
 * must leave touched/gone/unknown at their OLD sha, so wiki-flow-check keeps
 * failing on exactly the citations that still need a human. Each test builds a
 * tiny git repo with a source file + a flow page citing it, mutates the source
 * in the working tree (the recorded blob stays in the object store via the
 * commit), and asserts the classification / apply behaviour.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { PLUGIN, git, node, nodeFail } from './_helpers.mjs';

const REFRESH = join(PLUGIN, 'scripts', 'wiki-flow-refresh.mjs');
const RENDER = join(PLUGIN, 'scripts', 'wiki-flow-render.mjs');
const CHECK = join(PLUGIN, 'scripts', 'wiki-flow-check.mjs');

const SRC = [
  '// app',                      // 1
  'function alpha() {',          // 2
  '  callBeta();',               // 3
  '}',                           // 4
  'function beta() {',           // 5
  '  if (bad) reportFail();',    // 6
  '}',                           // 7
  'function reportFail() {',     // 8
  "  console.error('fail');",    // 9
  '}',                           // 10
].join('\n') + '\n';

const pageText = (sha) => `---
title: "Flow: sample"
summary: refresh fixture
category: flows
kind: explanation
flow_schema: flow-meta/v1
flow_scenario: "alpha calls beta"
flow_steps:
  - id: a
    actor: app
    action: "alpha runs"
    anchor_path: src/app.mjs
    anchor_sha: ${sha}
    anchor_match: "function alpha"
  - id: b
    actor: app
    action: "beta validates"
    anchor_path: src/app.mjs
    anchor_sha: ${sha}
    anchor_match: "function beta"
  - id: f
    actor: app
    action: "failure reported"
    anchor_path: src/app.mjs
    anchor_sha: ${sha}
    anchor_match: "console.error('fail')"
flow_edges:
  - from: a
    to: b
    kind: call
    evidence: verified
    call_anchor_path: src/app.mjs
    call_anchor_lines: 3
    call_anchor_sha: ${sha}
    call_match: "callBeta()"
    callee_token: "callBeta"
flow_branches:
  - at: b
    to: f
    condition: "bad input"
    kind: error
    cite_path: src/app.mjs
    cite_lines: 5-7
    cite_sha: ${sha}
    cite_match: "if (bad) reportFail"
covers:
  - path: src/app.mjs
    sha: ${sha}
generated_at_commit: abc1234
last_refreshed: 2026-06-12
---

# Flow: sample

<!-- FLOW-RENDER:START — generated from flow-meta; do not hand-edit (run wiki-flow-render.mjs) -->
<!-- FLOW-RENDER:END -->
`;

/** Tiny repo: committed src/app.mjs + a rendered flow page citing it. */
function flowFixture(t) {
  const dir = mkdtempSync(join(tmpdir(), 'flowrefresh-test-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  git(dir, ['init', '-q']);
  mkdirSync(join(dir, 'src'));
  writeFileSync(join(dir, 'src', 'app.mjs'), SRC);
  git(dir, ['add', '-A']);
  git(dir, ['-c', 'user.email=t@x', '-c', 'user.name=t', 'commit', '-qm', 'init']);
  const sha = git(dir, ['hash-object', 'src/app.mjs']);
  const page = join(dir, 'flow.md');
  writeFileSync(page, pageText(sha));
  node(dir, [RENDER, page]);
  return { dir, page, sha };
}

const plan = (dir, page, ...flags) => {
  const r = nodeFail(dir, [REFRESH, page, '--json', ...flags]);
  return { code: r.status, json: JSON.parse(r.stdout)[0] };
};
const byLabel = (json, label) => json.citations.find((c) => c.label === label);
const check = (dir, page) => {
  const r = nodeFail(dir, [CHECK, page, '--json']);
  return { code: r.status, json: JSON.parse(r.stdout)[0] };
};

test('clean fixture: everything current, flow-check passes, exit 0', (t) => {
  const { dir, page } = flowFixture(t);
  assert.equal(check(dir, page).code, 0, 'fixture must be green before any mutation');
  const r = plan(dir, page);
  assert.equal(r.code, 0);
  assert.ok(r.json.citations.length >= 5, 'all five citations collected');
  assert.ok(r.json.citations.every((c) => c.class === 'current'), JSON.stringify(r.json.citations));
});

test('pure shift: classified shifted, --apply rewrites lines + shas, page returns to green', (t) => {
  const { dir, page } = flowFixture(t);
  writeFileSync(join(dir, 'src', 'app.mjs'), '// new\n// header\n' + SRC); // +2 lines on top
  const before = plan(dir, page);
  assert.equal(before.code, 0, 'a pure shift needs no human — exit 0');
  assert.ok(before.json.citations.every((c) => c.class === 'shifted'), JSON.stringify(before.json.citations));

  const applied = plan(dir, page, '--apply');
  assert.equal(applied.code, 0);
  const text = readFileSync(page, 'utf8');
  const newSha = git(dir, ['hash-object', 'src/app.mjs']);
  assert.match(text, /call_anchor_lines: 5\n/, 'edge call site 3 → 5');
  assert.match(text, /cite_lines: 7-9\n/, 'branch span 5-7 → 7-9');
  assert.ok(!text.includes('call_anchor_lines: 3'), 'old range gone');
  assert.equal((text.match(new RegExp(newSha, 'g')) || []).length, 5, 'exactly the 5 inline shas re-recorded');
});

test('--apply never rewrites covers: — page-level blessing stays wiki-stamp turf', (t) => {
  const { dir, page, sha } = flowFixture(t);
  writeFileSync(join(dir, 'src', 'app.mjs'), '// new\n' + SRC);
  plan(dir, page, '--apply');
  const text = readFileSync(page, 'utf8');
  assert.match(text, new RegExp(`covers:\\n  - path: src/app\\.mjs\\n    sha: ${sha}`), 'covers sha untouched');
});

test('after a clean apply, the page passes wiki-flow-check and a re-run is all current', (t) => {
  const { dir, page } = flowFixture(t);
  writeFileSync(join(dir, 'src', 'app.mjs'), '// new\n// header\n' + SRC);
  plan(dir, page, '--apply');
  const c = check(dir, page);
  assert.equal(c.code, 0, JSON.stringify(c.json?.errors));
  assert.equal(c.json.tier, 'branch-audited');
  const again = plan(dir, page);
  assert.ok(again.json.citations.every((x) => x.class === 'current'), 'idempotent');
});

test('touched span: NEVER auto-fixed — flow-check keeps failing on exactly that citation', (t) => {
  const { dir, page, sha } = flowFixture(t);
  // edit the cited call line itself (match survives on the line — not gone, touched)
  writeFileSync(join(dir, 'src', 'app.mjs'), SRC.replace('  callBeta();', '  callBeta(); // reviewed'));
  const before = plan(dir, page);
  assert.equal(before.code, 1, 'a touched citation is a worklist — exit 1');
  assert.equal(byLabel(before.json, 'edge a->b').class, 'touched');

  const applied = plan(dir, page, '--apply');
  assert.equal(applied.code, 1, 'still exit 1 after apply — the worklist remains');
  const text = readFileSync(page, 'utf8');
  assert.match(text, new RegExp(`call_anchor_sha: ${sha}`), 'touched edge stays at the OLD sha');

  const c = check(dir, page);
  assert.equal(c.code, 1);
  const moved = c.json.errors.filter((e) => e.includes('moved'));
  assert.equal(moved.length, 1, JSON.stringify(c.json.errors));
  assert.ok(moved[0].includes('edge a->b'), 'the checker worklist is exactly the touched citation');
});

test('gone: a match deleted from the file is classified gone, never auto-fixed', (t) => {
  const { dir, page } = flowFixture(t);
  writeFileSync(join(dir, 'src', 'app.mjs'), SRC.replace('  if (bad) reportFail();', '  if (bad) explode();'));
  const r = plan(dir, page);
  assert.equal(r.code, 1);
  assert.equal(byLabel(r.json, 'branch b->f').class, 'gone');
  // surrounding citations on untouched lines are still safe
  assert.equal(byLabel(r.json, 'edge a->b').class, 'untouched');
});

test('insertion INSIDE a cited span is touched, not shifted', (t) => {
  const { dir, page } = flowFixture(t);
  writeFileSync(join(dir, 'src', 'app.mjs'),
    SRC.replace('function beta() {\n', 'function beta() {\n  // inserted inside the cited 5-7 span\n'));
  const r = plan(dir, page);
  assert.equal(byLabel(r.json, 'branch b->f').class, 'touched', JSON.stringify(r.json.citations));
  assert.equal(byLabel(r.json, 'edge a->b').class, 'untouched', 'span before the insertion is unaffected');
});

test('unknown: a recorded sha not in the object store degrades to re-verify, never auto-fixed', (t) => {
  const { dir, page } = flowFixture(t);
  const fake = '1234567890abcdef1234567890abcdef12345678';
  writeFileSync(page, readFileSync(page, 'utf8').replaceAll(/anchor_sha: [0-9a-f]{40}/g, `anchor_sha: ${fake}`));
  node(dir, [RENDER, page]);
  const r = plan(dir, page, '--apply');
  assert.equal(r.code, 1);
  assert.equal(byLabel(r.json, 'step a').class, 'unknown');
  assert.match(readFileSync(page, 'utf8'), new RegExp(`anchor_sha: ${fake}`), 'unknown citations untouched by apply');
});

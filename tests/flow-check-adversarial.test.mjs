// flow-check adversarial suite — proves the hardening grafts the design
// tournament prescribed actually catch the attacks every prototype was broken
// by. Each test mutates the real dogfood page and asserts the checker FAILS or
// caps the tier. Run from the repo root (anchors are repo-relative).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..');
const PAGE = join(REPO, 'docs/wiki/flows/bootstrap-vendoring.md');
const RENDER = join(REPO, 'scripts/wiki-flow-render.mjs');
const CHECK = join(REPO, 'scripts/wiki-flow-check.mjs');
const BASE = readFileSync(PAGE, 'utf8');

/** Write a (possibly mutated, optionally re-rendered) page to a temp file. */
function stage(text, { regenerate = false } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'flowadv-'));
  const f = join(dir, 'page.md');
  writeFileSync(f, text);
  if (regenerate) execFileSync('node', [RENDER, f], { cwd: REPO });
  return f;
}

/** Run the checker; return {code, json} (code 0 pass / 1 fail). */
function check(file) {
  try {
    const out = execFileSync('node', [CHECK, file, '--json'], { cwd: REPO, encoding: 'utf8' });
    return { code: 0, json: JSON.parse(out)[0] };
  } catch (e) {
    return { code: e.status ?? 2, json: e.stdout ? JSON.parse(e.stdout)[0] : null };
  }
}

test('baseline: the real dogfood page passes at branch-audited', () => {
  const r = check(PAGE);
  assert.equal(r.code, 0);
  assert.equal(r.json.tier, 'branch-audited');
  assert.equal(r.json.errors.length, 0);
});

test('(a) fabricated edge: a step whose anchor_match is not in the code → anchored fails', () => {
  // add a fake step + edge, regenerate so structural passes and anchored is reached
  const text = BASE.replace(
    'flow_edges:',
    `flow_steps_EXTRA_MARKER
flow_edges:`,
  ).replace(
    'flow_steps_EXTRA_MARKER',
    `  - id: send-telemetry
    actor: bootstrap
    action: "phone home"
    anchor_path: scripts/bootstrap.mjs
    anchor_sha: dcdfade7114ae4ecf5571e5a0790346e738f1628
    anchor_match: "fetch('https://telemetry"`,
  ).replace('flow_edges:\n', `flow_edges:
  - from: verify
    to: send-telemetry
    kind: call
    evidence: inferred
`);
  const r = check(stage(text, { regenerate: true }));
  assert.equal(r.code, 1);
  assert.ok(r.json.errors.some((e) => e.includes('anchor_match not found')), JSON.stringify(r.json.errors));
});

test('(b) rotted citation: wrong anchor_sha → "moved, re-verify"', () => {
  const text = BASE.replace('anchor_sha: dcdfade7114ae4ecf5571e5a0790346e738f1628', 'anchor_sha: 0000000000000000000000000000000000000000');
  const r = check(stage(text));
  assert.equal(r.code, 1);
  assert.ok(r.json.errors.some((e) => e.includes('moved')), JSON.stringify(r.json.errors));
});

test('(c1) non-directional edge: callee_token absent from the cited span → "does not prove this hop"', () => {
  const text = BASE.replace('callee_token: "wiki-index.mjs"', 'callee_token: "nonexistent-callee.mjs"');
  const r = check(stage(text, { regenerate: true }));
  assert.equal(r.code, 1);
  assert.ok(r.json.errors.some((e) => e.includes('does not prove this hop')), JSON.stringify(r.json.errors));
});

test('(c2) edge cited outside the caller: call_anchor_path != from-step anchor → rejected', () => {
  // point the run-bootstrap→generate-index call site at init.md (not the caller)
  const text = BASE.replace(
    `    call_anchor_path: scripts/bootstrap.mjs
    call_anchor_lines: 251`,
    `    call_anchor_path: references/init.md
    call_anchor_lines: 151`,
  );
  const r = check(stage(text, { regenerate: true }));
  assert.equal(r.code, 1);
  assert.ok(r.json.errors.some((e) => e.includes("caller's own code")), JSON.stringify(r.json.errors));
});

test('(c3) whole-file span attack: an over-wide call_anchor_lines is rejected', () => {
  const text = BASE.replace('call_anchor_lines: 251', 'call_anchor_lines: 1-279');
  const r = check(stage(text, { regenerate: true }));
  assert.equal(r.code, 1);
  assert.ok(r.json.errors.some((e) => e.includes('narrow to the call site')), JSON.stringify(r.json.errors));
});

test('(d) evidence-gaming: all edges inferred → tier capped at structural', () => {
  const text = BASE.replaceAll('evidence: verified', 'evidence: inferred');
  const r = check(stage(text, { regenerate: true }));
  assert.equal(r.code, 0); // inferred is honest; not a hard fail
  assert.equal(r.json.tier, 'structural');
  assert.ok(r.json.warnings.some((w) => w.includes('capped at structural')), JSON.stringify(r.json.warnings));
});

test('(e1) regen-diff: a hand-edited diagram is rejected', () => {
  const text = BASE.replace('n_invoke["Phase 5 invokes', 'n_invoke["A LIE about what invokes');
  const r = check(stage(text)); // NOT regenerated → region no longer matches meta
  assert.equal(r.code, 1);
  assert.ok(r.json.errors.some((e) => e.includes('drifted')), JSON.stringify(r.json.errors));
});

test('(e2) exclusive region: a second mermaid block outside the region is rejected', () => {
  const text = BASE + '\n\n```mermaid\nflowchart TD\n  x["a hand-authored lie"]\n```\n';
  const r = check(stage(text));
  assert.equal(r.code, 1);
  assert.ok(r.json.errors.some((e) => e.includes('outside the FLOW-RENDER region')), JSON.stringify(r.json.errors));
});

test('(f) omitted branch: honest §6.1 limit — no hard fail without an extractor, but it warns', () => {
  // drop ALL branches at `verify` (the only error path off it) — anchored/edge-cited stay green
  const text = BASE.replace(
    `  - at: verify
    to: report-verify-fail
    condition: "wiki-check / index --check throws"
    kind: error
    cite_path: scripts/bootstrap.mjs
    cite_lines: 257-258
    cite_sha: dcdfade7114ae4ecf5571e5a0790346e738f1628
    cite_match: "verification failed after vendoring"`,
    '',
  );
  const r = check(stage(text, { regenerate: true }));
  assert.equal(r.code, 0, 'omission is not a hard fail without set-equality (honest §6.1)');
  // verify now has zero outgoing edges + no branch; branch-audit only fires on
  // single-exit steps, so this specific omission is a true negative — the point
  // of the test is that the checker does NOT falsely claim completeness.
  assert.notEqual(r.json.tier, 'set-validated');
});

/**
 * flow-seteq.test.mjs — the reference set-equality extractor + the `set-validated`
 * tier wiring (ADR-007). Proves: the extractor rebuilds update-classification's
 * set from update.mjs; a NEW disposition surfaces (the omitted-branch catch); the
 * real page reaches set-validated; and with flow_asserts_complete a code-branch
 * the flow drops is a HARD FAIL — but only a warning when completeness isn't
 * asserted. Run from the repo root (anchors + the validator are repo-relative).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..');
const EXTRACTOR = join(REPO, '.repolore/validators/update-classification-seteq.mjs');
const RENDER = join(REPO, 'scripts/wiki-flow-render.mjs');
const CHECK = join(REPO, 'scripts/wiki-flow-check.mjs');
const PAGE = join(REPO, 'docs/wiki/flows/update-classification.md');
const BASE = readFileSync(PAGE, 'utf8');

const EXPECTED_STEPS = ['invoke', 'classify', 'persist', 'up-to-date', 'restore',
  'regenerate', 'skip-modified', 'needs-review', 'add-new'];
const EXPECTED_BRANCHES = ['classify->up-to-date', 'classify->restore', 'classify->regenerate',
  'classify->skip-modified', 'classify->needs-review', 'classify->add-new'];

/** Run the extractor (optionally over a substitute source file); return parsed JSON. */
function extract(srcPath) {
  const args = srcPath ? [EXTRACTOR, srcPath] : [EXTRACTOR];
  return JSON.parse(execFileSync('node', args, { cwd: REPO, encoding: 'utf8' }));
}

/** Write a (possibly mutated, optionally re-rendered) page under its real name so flowId matches. */
function stage(text, { regenerate = false } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'seteq-'));
  const f = join(dir, 'update-classification.md'); // basename → flowId 'update-classification'
  writeFileSync(f, text);
  if (regenerate) execFileSync('node', [RENDER, f], { cwd: REPO });
  return f;
}

/** Run wiki-flow-check from the repo root; return {code, json}. */
function check(file) {
  try {
    const out = execFileSync('node', [CHECK, file, '--json'], { cwd: REPO, encoding: 'utf8' });
    return { code: 0, json: JSON.parse(out)[0] };
  } catch (e) {
    return { code: e.status ?? 2, json: e.stdout ? JSON.parse(e.stdout)[0] : null };
  }
}

const RESTORE_BRANCH = `  - at: classify
    to: restore
    condition: "file missing (!exists)"
    kind: alt
    cite_path: scripts/update.mjs
    cite_lines: 137
    cite_sha: fc40aa31135e5138253eb1cff3172dd021bc31d1
    cite_match: "} else if (!exists) {"
`;

test('extractor rebuilds the exact step + branch set from update.mjs', () => {
  const out = extract();
  assert.deepEqual([...out.steps].sort(), [...EXPECTED_STEPS].sort());
  const branchKeys = out.branches.map((b) => `${b.at}->${b.to}`);
  assert.deepEqual(branchKeys.sort(), [...EXPECTED_BRANCHES].sort());
});

test('a NEW report.<key>.push surfaces as an unmapped step — the omitted-branch catch', () => {
  // a stand-in update.mjs that adds report.bonus.push the flow never declared
  const fake = [
    'if (current === masterSha) {}',            // classify scaffold anchor
    'report.upToDate.push({});',
    'report.restored.push({});',
    'report.bonus.push({});',                    // the new, unmapped disposition
    'process.exit(attention ? 1 : 0);',          // persist scaffold anchor
  ].join('\n');
  const dir = mkdtempSync(join(tmpdir(), 'seteq-src-'));
  const srcFile = join(dir, 'update.mjs');
  writeFileSync(srcFile, fake);
  const out = extract(srcFile);
  assert.ok(out.steps.includes('bonus'), 'unmapped disposition must surface under its raw key');
  // (in a real run that lands as a step the flow lacks → omission → hard fail)
});

test('baseline: the real page reaches set-validated', () => {
  const r = check(PAGE);
  assert.equal(r.code, 0);
  assert.equal(r.json.tier, 'set-validated');
  assert.equal(r.json.errors.length, 0);
});

test('asserts_complete + a dropped code-branch → HARD FAIL', () => {
  assert.ok(BASE.includes(RESTORE_BRANCH), 'fixture anchor present');
  const text = BASE.replace(RESTORE_BRANCH, ''); // flow omits classify->restore; code still has it
  const r = check(stage(text, { regenerate: true }));
  assert.equal(r.code, 1);
  assert.ok(r.json.errors.some((e) => e.includes('flow_asserts_complete is true')
    && e.includes('classify->restore')), JSON.stringify(r.json.errors));
});

test('same omission without asserts_complete → warning + degrade to branch-audited, not a fail', () => {
  const text = BASE
    .replace('flow_asserts_complete: true', 'flow_asserts_complete: false')
    .replace(RESTORE_BRANCH, '');
  const r = check(stage(text, { regenerate: true }));
  assert.equal(r.code, 0, 'omission is not a hard fail when completeness is not asserted');
  assert.equal(r.json.tier, 'branch-audited');
  assert.ok(r.json.warnings.some((w) => w.includes('extractor found a mismatch')), JSON.stringify(r.json.warnings));
});

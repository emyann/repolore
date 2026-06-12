/**
 * update.test.mjs — deterministic tests for the safe-update path.
 *
 * Starting state is always a freshly bootstrapped fixture; each test then
 * fakes one drift situation and asserts update.mjs classifies and applies
 * it correctly. Run with: node --test tests/
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  readFileSync, writeFileSync, rmSync, existsSync,
} from 'node:fs';
import { join } from 'node:path';
import { PLUGIN, UPDATE, bootstrapped, node, nodeFail, git } from './_helpers.mjs';

const masterOf = (name) => readFileSync(join(PLUGIN, 'scripts', name), 'utf8');
const manifestOf = (dir) => JSON.parse(readFileSync(join(dir, '.repolore/manifest.json'), 'utf8'));
const setManifestSha = (dir, rel, sha) => {
  const m = manifestOf(dir);
  m.generatedFiles.find((f) => f.path === rel).sha = sha;
  writeFileSync(join(dir, '.repolore/manifest.json'), JSON.stringify(m, null, 2) + '\n');
};

test('update: fresh bootstrap has nothing to do', (t) => {
  const dir = bootstrapped(t);
  const out = JSON.parse(node(dir, [UPDATE, '--dry-run', '--json']));
  assert.equal(out.mode, 'dry-run');
  assert.equal(out.upToDate.length, 14, 'all tracked files current');
  for (const k of ['updated', 'restored', 'added', 'skippedModified', 'needsReview', 'manifestFixed']) {
    assert.deepEqual(out[k], [], `${k} must be empty`);
  }
  node(dir, [UPDATE]); // real run also exits 0
});

test('update: outdated-pristine file is regenerated and re-recorded', (t) => {
  const dir = bootstrapped(t);
  const rel = '.repolore/scripts/wiki-check.mjs';
  // Simulate "vendored by an older version": different content, manifest in agreement.
  writeFileSync(join(dir, rel), '// old vendored version\n');
  setManifestSha(dir, rel, git(dir, ['hash-object', rel]));

  const dry = JSON.parse(node(dir, [UPDATE, '--dry-run', '--json']));
  assert.deepEqual(dry.updated.map((f) => f.path), [rel]);
  assert.equal(readFileSync(join(dir, rel), 'utf8'), '// old vendored version\n', 'dry-run must not write');

  node(dir, [UPDATE]);
  assert.equal(readFileSync(join(dir, rel), 'utf8'), masterOf('wiki-check.mjs'), 'regenerated from master');
  const entry = manifestOf(dir).generatedFiles.find((f) => f.path === rel);
  assert.equal(entry.sha, git(dir, ['hash-object', rel]), 'manifest re-recorded');
});

test('update: locally modified file is skipped; --force overwrites with consent', (t) => {
  const dir = bootstrapped(t);
  const rel = '.repolore/scripts/lib.mjs';
  writeFileSync(join(dir, rel), '// my local hack\n'); // manifest NOT updated → modified

  const r1 = nodeFail(dir, [UPDATE]);
  assert.equal(r1.status, 1, 'attention exit code');
  assert.match(r1.stdout, /SKIP\s+\.repolore\/scripts\/lib\.mjs/);
  assert.match(r1.stdout, /--force/);
  assert.equal(readFileSync(join(dir, rel), 'utf8'), '// my local hack\n', 'local edit untouched');

  node(dir, [UPDATE, '--force', rel]);
  assert.equal(readFileSync(join(dir, rel), 'utf8'), masterOf('lib.mjs'), 'forced to master');
});

test('update: missing vendored file is restored', (t) => {
  const dir = bootstrapped(t);
  const rel = '.repolore/scripts/wiki-stamp.mjs';
  rmSync(join(dir, rel));
  const out = JSON.parse(node(dir, [UPDATE, '--json']));
  assert.deepEqual(out.restored.map((f) => f.path), [rel]);
  assert.equal(readFileSync(join(dir, rel), 'utf8'), masterOf('wiki-stamp.mjs'));
});

test('update: manually-updated file just gets its manifest sha fixed', (t) => {
  const dir = bootstrapped(t);
  const rel = '.repolore/scripts/wiki-index.mjs';
  setManifestSha(dir, rel, 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef'); // file matches master, record lies
  const out = JSON.parse(node(dir, [UPDATE, '--json']));
  assert.deepEqual(out.manifestFixed.map((f) => f.path), [rel]);
  const entry = manifestOf(dir).generatedFiles.find((f) => f.path === rel);
  assert.equal(entry.sha, git(dir, ['hash-object', rel]));
});

test('update: AGENTS.md regenerates from the template, preserving the scope summary', (t) => {
  const dir = bootstrapped(t);
  const rel = 'docs/wiki/AGENTS.md';
  // Simulate an older template's output: tweak a template-origin sentence, manifest in agreement.
  const aged = readFileSync(join(dir, rel), 'utf8')
    .replace('Code wins every conflict.', 'Code wins every argument.');
  writeFileSync(join(dir, rel), aged);
  setManifestSha(dir, rel, git(dir, ['hash-object', rel]));

  const out = JSON.parse(node(dir, [UPDATE, '--json']));
  assert.deepEqual(out.updated.map((f) => f.path), [rel]);
  const text = readFileSync(join(dir, rel), 'utf8');
  assert.match(text, /Code wins every conflict\./, 'template content restored');
  assert.match(text, /Covers src\/\. Tests excluded by the default noise filter\./, 'repo scope summary preserved');
  assert.match(text, /fixture/, 'project name preserved');
  assert.ok(!/\{\{[A-Z_]+\}\}/.test(text), 'no leftover placeholders');
});

test('update: records the installed pluginVersion', (t) => {
  const dir = bootstrapped(t);
  const m = manifestOf(dir);
  m.pluginVersion = '0.0.1'; // pretend an ancient vendoring
  writeFileSync(join(dir, '.repolore/manifest.json'), JSON.stringify(m, null, 2) + '\n');
  node(dir, [UPDATE]);
  const pluginJson = JSON.parse(readFileSync(join(PLUGIN, '.claude-plugin', 'plugin.json'), 'utf8'));
  assert.equal(manifestOf(dir).pluginVersion, pluginJson.version);
});

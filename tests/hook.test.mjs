/**
 * hook.test.mjs — lifecycle tests for the post-commit nudge and its installer.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  readFileSync, writeFileSync, existsSync, mkdirSync, statSync, copyFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { bootstrapped, node, git } from './_helpers.mjs';

const INSTALL = '.repolore/scripts/wiki-install-hook.mjs';
const BEGIN = '# >>> repolore wiki nudge (non-blocking) >>>';

const commitAll = (dir, msg) => {
  git(dir, ['add', '-A']);
  // The nudge surfaces on git commit's stderr — capture both streams.
  const r = spawnSync('git', ['-c', 'user.email=t@x', '-c', 'user.name=t', 'commit', '-m', msg],
    { cwd: dir, encoding: 'utf8' });
  assert.equal(r.status, 0, `commit must never be blocked: ${r.stderr}`);
  return r.stdout + r.stderr;
};

test('hook: install creates an executable post-commit with the marker block', (t) => {
  const dir = bootstrapped(t);
  const out = node(dir, [INSTALL]);
  assert.match(out, /post-commit wiki nudge installed/);
  const hook = join(dir, '.git', 'hooks', 'post-commit');
  const text = readFileSync(hook, 'utf8');
  assert.match(text, /^#!\/bin\/sh\n/);
  assert.ok(text.includes(BEGIN));
  assert.ok(text.includes('wiki-hook.mjs'));
  assert.ok(statSync(hook).mode & 0o100, 'hook must be executable');
});

test('hook: install is idempotent; uninstall removes exactly the block', (t) => {
  const dir = bootstrapped(t);
  node(dir, [INSTALL]);
  const out2 = node(dir, [INSTALL]);
  assert.match(out2, /already installed/);
  const hook = join(dir, '.git', 'hooks', 'post-commit');
  assert.equal((readFileSync(hook, 'utf8').match(/>>> repolore/g) ?? []).length, 1);

  node(dir, [INSTALL, '--uninstall']);
  assert.ok(!readFileSync(hook, 'utf8').includes(BEGIN), 'block removed');
});

test('hook: chains an existing post-commit hook instead of replacing it', (t) => {
  const dir = bootstrapped(t);
  const hook = join(dir, '.git', 'hooks', 'post-commit');
  writeFileSync(hook, '#!/bin/sh\necho PRE-EXISTING-HOOK\n');
  node(dir, [INSTALL]);
  const text = readFileSync(hook, 'utf8');
  assert.ok(text.includes('PRE-EXISTING-HOOK'), 'existing content preserved');
  assert.ok(text.includes(BEGIN), 'block appended');
  node(dir, [INSTALL, '--uninstall']);
  const after = readFileSync(hook, 'utf8');
  assert.ok(after.includes('PRE-EXISTING-HOOK') && !after.includes(BEGIN));
});

test('hook: respects core.hooksPath (husky-style)', (t) => {
  const dir = bootstrapped(t);
  mkdirSync(join(dir, '.githooks'), { recursive: true });
  git(dir, ['config', 'core.hooksPath', '.githooks']);
  const out = node(dir, [INSTALL]);
  assert.match(out, /core\.hooksPath/);
  assert.ok(existsSync(join(dir, '.githooks', 'post-commit')));
  assert.ok(!existsSync(join(dir, '.git', 'hooks', 'post-commit')), 'did not write to .git/hooks');
});

test('hook: silent on a green commit, nudges on staleness, never blocks', (t) => {
  const dir = bootstrapped(t);
  node(dir, [INSTALL]);

  // Seed a page covering src/a.ts so there is something to go stale.
  const page = join(dir, 'docs/wiki/architecture/overview.md');
  const text = readFileSync(join(dir, 'docs/wiki/_templates/page.md'), 'utf8')
    .replaceAll('TITLE HERE', 'Overview')
    .replace('summary: One line, rendered verbatim in the generated index.md.', 'summary: Shape.')
    .replace('category: concepts', 'category: architecture')
    .replace('relative/path/to/source.ts', 'src/a.ts');
  writeFileSync(page, text);
  node(dir, ['.repolore/scripts/wiki-stamp.mjs', 'docs/wiki/architecture/overview.md']);
  node(dir, ['.repolore/scripts/wiki-index.mjs']);
  const green = commitAll(dir, 'docs: seed overview');
  assert.ok(!green.includes('STALE'), `green commit must be silent, got: ${green}`);

  // Change the covered file → the page is stale → the very commit that
  // staled it gets the nudge, and the commit still succeeds.
  writeFileSync(join(dir, 'src', 'a.ts'), 'export const a = 2;\n');
  const nudged = commitAll(dir, 'feat: change a');
  assert.ok(nudged.includes('STALE') || nudged.includes('stale'),
    `expected staleness nudge in commit output, got: ${nudged}`);
  assert.equal(git(dir, ['log', '-1', '--format=%s']), 'feat: change a', 'commit succeeded despite nudge');
});

test('hook: new-page nudge fires for added page-worthy files', (t) => {
  const dir = bootstrapped(t);
  node(dir, [INSTALL]);
  commitAll(dir, 'chore: baseline');
  mkdirSync(join(dir, 'src', 'services'), { recursive: true });
  writeFileSync(join(dir, 'src', 'services', 'payments.ts'), 'export const pay = 1;\n');
  const out = commitAll(dir, 'feat: payments service');
  assert.match(out, /payments\.ts/, 'page-worthy new file should be nudged');
  assert.match(out, /reminder, not a blocker/i);
});

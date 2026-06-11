/**
 * _helpers.mjs — shared fixture/exec helpers for the deterministic tests.
 * Not matched by the tests/*.test.mjs glob, so never run as a suite itself.
 */
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const PLUGIN = join(fileURLToPath(import.meta.url), '..', '..');
export const BOOTSTRAP = join(PLUGIN, 'scripts', 'bootstrap.mjs');
export const UPDATE = join(PLUGIN, 'scripts', 'update.mjs');

export const sh = (cwd, cmd, args, opts = {}) =>
  execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts });
export const git = (cwd, args) => sh(cwd, 'git', args).trim();
export const node = (cwd, args) => sh(cwd, 'node', args);

/** Run a node script expecting failure; returns {status, stdout, stderr}. */
export function nodeFail(cwd, args) {
  try {
    return { status: 0, stdout: node(cwd, args), stderr: '' };
  } catch (e) {
    return { status: e.status, stdout: String(e.stdout), stderr: String(e.stderr) };
  }
}

/** Tiny TS project: 3 in-scope sources + a test file the noise filter drops. */
export function makeFixture(t) {
  const dir = mkdtempSync(join(tmpdir(), 'repolore-test-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  git(dir, ['init', '-q']);
  mkdirSync(join(dir, 'src', 'services'), { recursive: true });
  mkdirSync(join(dir, 'src', 'routes'), { recursive: true });
  writeFileSync(join(dir, 'src', 'a.ts'), 'export const a = 1;\n');
  writeFileSync(join(dir, 'src', 'services', 'billing.ts'), 'export const svc = 1;\n');
  writeFileSync(join(dir, 'src', 'routes', 'orders.ts'), 'export const r = 1;\n');
  writeFileSync(join(dir, 'src', 'a.test.ts'), 'import { a } from "./a";\n');
  writeFileSync(join(dir, 'README.md'), '# fixture\n');
  git(dir, ['add', '-A']);
  git(dir, ['-c', 'user.email=t@x', '-c', 'user.name=t', 'commit', '-qm', 'init']);
  return dir;
}

export function writeConfig(dir, overrides = {}) {
  const cfg = {
    projectName: 'fixture',
    wikiRoot: 'docs/wiki',
    scopeSummary: 'Covers src/. Tests excluded by the default noise filter.',
    repoNotes: 'fixture is a tiny service.\nRoutes and services live under src/.',
    scope: { include: ['src/**'], exclude: [] },
    pages: [
      { slug: 'architecture/overview', summary: 'System shape and main components.' },
      { slug: 'features/billing', summary: 'Billing service history.' },
    ],
    ...overrides,
  };
  const file = join(dir, 'init.json');
  writeFileSync(file, JSON.stringify(cfg));
  return file;
}

/** Fixture repo with a completed bootstrap — the starting state for update tests. */
export function bootstrapped(t) {
  const dir = makeFixture(t);
  const cfg = writeConfig(dir);
  node(dir, [BOOTSTRAP, '--config', cfg]);
  return dir;
}

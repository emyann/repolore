/**
 * bootstrap.test.mjs — deterministic tests for the init vendoring path.
 *
 * Each test builds a throwaway fixture repo in a temp dir and drives
 * scripts/bootstrap.mjs against it. Run with: node --test tests/
 *
 * The invariant these tests anchor: the in-scope file count bootstrap shows
 * at the approval gate (--dry-run) is the same number wiki-coverage reports
 * as the baseline afterwards — same walk, same globs, same defaults.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  writeFileSync, existsSync, readFileSync, lstatSync, readlinkSync, copyFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { PLUGIN, BOOTSTRAP, makeFixture, writeConfig, node, nodeFail, git } from './_helpers.mjs';

test('dry-run reports the scope census and writes nothing', (t) => {
  const dir = makeFixture(t);
  const cfg = writeConfig(dir);
  const out = JSON.parse(node(dir, [BOOTSTRAP, '--config', cfg, '--dry-run', '--json']));
  assert.equal(out.mode, 'dry-run');
  assert.equal(out.inScope, 3, 'three sources in scope; a.test.ts dropped as noise');
  assert.deepEqual(out.byTopDir, [{ dir: 'src', count: 3 }]);
  assert.equal(out.pages, 2);
  assert.ok(!existsSync(join(dir, 'docs')), 'dry-run must not create the wiki');
  assert.ok(!existsSync(join(dir, '.repolore')), 'dry-run must not create .repolore');
});

test('dry-run needs only the scope block (phase-2 usage)', (t) => {
  const dir = makeFixture(t);
  const file = join(dir, 'scope-only.json');
  writeFileSync(file, JSON.stringify({ scope: { include: ['src/**'] } }));
  const out = JSON.parse(node(dir, [BOOTSTRAP, '--config', file, '--dry-run', '--json']));
  assert.equal(out.inScope, 3);
});

test('bootstrap vendors everything, verified, with no leftover placeholders', (t) => {
  const dir = makeFixture(t);
  const cfg = writeConfig(dir);
  const out = JSON.parse(node(dir, [BOOTSTRAP, '--config', cfg, '--json']));
  assert.equal(out.mode, 'bootstrap');
  assert.deepEqual(out.verified, ['index generated', 'wiki-check clean', 'index --check clean']);

  for (const rel of [
    'docs/wiki/AGENTS.md', 'docs/wiki/wiki.config.yml', 'docs/wiki/index.md',
    'docs/wiki/GLOSSARY.md', 'docs/wiki/log.md',
    'docs/wiki/_templates/page.md', 'docs/wiki/_templates/decision.md',
    '.repolore/manifest.json',
    '.repolore/scripts/lib.mjs', '.repolore/scripts/wiki-check.mjs',
    '.repolore/scripts/wiki-coverage.mjs', '.repolore/scripts/wiki-stamp.mjs',
    '.repolore/scripts/wiki-index.mjs',
  ]) assert.ok(existsSync(join(dir, rel)), `missing ${rel}`);

  const link = join(dir, 'docs/wiki/CLAUDE.md');
  assert.ok(lstatSync(link).isSymbolicLink(), 'CLAUDE.md must be a symlink');
  assert.equal(readlinkSync(link), 'AGENTS.md');

  for (const cat of ['architecture', 'concepts', 'features', 'flows', 'decisions', 'gotchas', 'howto']) {
    assert.ok(existsSync(join(dir, 'docs/wiki', cat)), `missing category dir ${cat}`);
  }

  // Instantiated files carry no surviving {{PLACEHOLDER}}s.
  for (const f of ['AGENTS.md', 'wiki.config.yml']) {
    const text = readFileSync(join(dir, 'docs/wiki', f), 'utf8');
    assert.ok(!/\{\{[A-Z_]+\}\}/.test(text), `unreplaced placeholder in ${f}`);
  }
  const agents = readFileSync(join(dir, 'docs/wiki/AGENTS.md'), 'utf8');
  assert.match(agents, /fixture/, 'project name instantiated');
  assert.match(agents, /\.repolore\/scripts/, 'scripts dir instantiated');

  // Manifest tracks every vendored file by its real blob SHA.
  const manifest = JSON.parse(readFileSync(join(dir, '.repolore/manifest.json'), 'utf8'));
  assert.equal(manifest.tool, 'repolore');
  assert.equal(manifest.wikiRoot, 'docs/wiki');
  const pluginJson = JSON.parse(readFileSync(join(PLUGIN, '.claude-plugin', 'plugin.json'), 'utf8'));
  assert.equal(manifest.pluginVersion, pluginJson.version, 'manifest records the vendoring plugin version');
  assert.equal(manifest.generatedFiles.length, 8, '5 scripts + AGENTS + 2 templates');
  for (const { path, sha } of manifest.generatedFiles) {
    assert.equal(git(dir, ['hash-object', path]), sha, `manifest sha drift for ${path}`);
  }
  for (const repoOwned of ['wiki.config.yml', 'GLOSSARY.md', 'log.md']) {
    assert.ok(!manifest.generatedFiles.some((f) => f.path.endsWith(repoOwned)),
      `${repoOwned} is repo-owned content, never manifest-tracked`);
  }

  // Vendored checks run clean in the target repo.
  node(dir, ['.repolore/scripts/wiki-check.mjs']);
  node(dir, ['.repolore/scripts/wiki-index.mjs', '--check']);
});

test('the approval-gate count equals the coverage baseline', (t) => {
  const dir = makeFixture(t);
  const cfg = writeConfig(dir);
  const gate = JSON.parse(node(dir, [BOOTSTRAP, '--config', cfg, '--dry-run', '--json']));
  node(dir, [BOOTSTRAP, '--config', cfg]);
  const baseline = JSON.parse(node(dir, ['.repolore/scripts/wiki-coverage.mjs', '--json']));
  assert.equal(baseline.total, gate.inScope, 'gate number and baseline must be the same number');
  assert.equal(baseline.covered, 0, 'fresh init covers nothing yet');
});

test('re-running bootstrap on an initialized repo is refused', (t) => {
  const dir = makeFixture(t);
  const cfg = writeConfig(dir);
  node(dir, [BOOTSTRAP, '--config', cfg]);
  const { status, stderr } = nodeFail(dir, [BOOTSTRAP, '--config', cfg]);
  assert.equal(status, 2);
  assert.match(stderr, /already (exists|initialized)/);
});

test('config validation rejects the obvious mistakes', (t) => {
  const dir = makeFixture(t);
  const cases = [
    [{ scope: { include: [] } }, /scope\.include/],
    [{ pages: [{ slug: 'no-category', summary: 'x' }] }, /category\/name/],
    [{ projectName: '' }, /projectName/],
    [{ wikiRoot: '/abs/path' }, /repo-relative/],
  ];
  for (const [overrides, re] of cases) {
    const file = join(dir, 'bad.json');
    writeFileSync(file, JSON.stringify({
      projectName: 'fixture', scopeSummary: 's', repoNotes: 'r',
      scope: { include: ['src/**'] }, pages: [], ...overrides,
    }));
    const { status, stderr } = nodeFail(dir, [BOOTSTRAP, '--config', file]);
    assert.equal(status, 2, `expected rejection for ${JSON.stringify(overrides)}`);
    assert.match(stderr, re);
  }
});

test('seeded page path: template → stamp → index → fresh and covered', (t) => {
  const dir = makeFixture(t);
  const cfg = writeConfig(dir);
  node(dir, [BOOTSTRAP, '--config', cfg]);

  const page = join(dir, 'docs/wiki/architecture/overview.md');
  copyFileSync(join(dir, 'docs/wiki/_templates/page.md'), page);
  let text = readFileSync(page, 'utf8')
    .replaceAll('TITLE HERE', 'Overview')
    .replace('summary: One line, rendered verbatim in the generated index.md.', 'summary: System shape.')
    .replace('category: concepts', 'category: architecture')
    .replace('relative/path/to/source.ts', 'src/a.ts');
  writeFileSync(page, text);

  node(dir, ['.repolore/scripts/wiki-stamp.mjs', 'docs/wiki/architecture/overview.md']);
  node(dir, ['.repolore/scripts/wiki-index.mjs']);
  node(dir, ['.repolore/scripts/wiki-check.mjs']); // must exit 0 → page fresh
  const cov = JSON.parse(node(dir, ['.repolore/scripts/wiki-coverage.mjs', '--json']));
  assert.equal(cov.covered, 1, 'stamped overview covers src/a.ts');
  const index = readFileSync(join(dir, 'docs/wiki/index.md'), 'utf8');
  assert.match(index, /\[Overview\]\(\.\/architecture\/overview\.md\): System shape\./);
});

test('page plan: backlog surfaces in index and check; drift is flagged', (t) => {
  const dir = makeFixture(t);
  const cfg = writeConfig(dir); // two planned pages, none drafted
  node(dir, [BOOTSTRAP, '--config', cfg]);

  const idx = readFileSync(join(dir, 'docs/wiki/index.md'), 'utf8');
  assert.match(idx, /## Planned \(not yet written\)/);
  assert.match(idx, /- architecture\/overview: System shape and main components\./);
  assert.match(idx, /- features\/billing: Billing service history\./);

  let chk = JSON.parse(node(dir, ['.repolore/scripts/wiki-check.mjs', '--json']));
  assert.deepEqual(chk.plan, {
    total: 2, written: 0,
    backlog: ['architecture/overview', 'features/billing'], drift: [],
  });

  // Draft the overview but "forget" to flip its plan status → drift flagged,
  // backlog shrinks, the index's Planned section loses the entry.
  const page = join(dir, 'docs/wiki/architecture/overview.md');
  const text = readFileSync(join(dir, 'docs/wiki/_templates/page.md'), 'utf8')
    .replaceAll('TITLE HERE', 'Overview')
    .replace('summary: One line, rendered verbatim in the generated index.md.', 'summary: System shape.')
    .replace('category: concepts', 'category: architecture')
    .replace('relative/path/to/source.ts', 'src/a.ts');
  writeFileSync(page, text);
  node(dir, ['.repolore/scripts/wiki-stamp.mjs', 'docs/wiki/architecture/overview.md']);
  node(dir, ['.repolore/scripts/wiki-index.mjs']);

  chk = JSON.parse(node(dir, ['.repolore/scripts/wiki-check.mjs', '--json']));
  assert.equal(chk.plan.written, 1);
  assert.deepEqual(chk.plan.backlog, ['features/billing']);
  assert.ok(chk.plan.drift.some((d) => d.includes('architecture/overview') && d.includes('flip to seeded')));

  const idx2 = readFileSync(join(dir, 'docs/wiki/index.md'), 'utf8');
  assert.doesNotMatch(idx2, /- architecture\/overview: System shape and main components\./);
  assert.match(idx2, /- features\/billing: /);
});

test('free-text YAML values are quoted, so ": " in summaries stays valid YAML', (t) => {
  const dir = makeFixture(t);
  const cfg = writeConfig(dir, {
    projectName: 'fixture: the sequel',
    pages: [{ slug: 'features/api', summary: 'Order endpoints: POST /orders creates "things".' }],
  });
  node(dir, [BOOTSTRAP, '--config', cfg]);
  const raw = readFileSync(join(dir, 'docs/wiki/wiki.config.yml'), 'utf8');
  assert.match(raw, /title: "fixture: the sequel"/);
  assert.match(raw, /summary: "Order endpoints: POST \/orders creates \\"things\\"\."/);
  // the vendored line-based parser still reads the quoted title
  const idx = readFileSync(join(dir, 'docs/wiki/index.md'), 'utf8');
  assert.match(idx, /^# fixture: the sequel — wiki index/);
});

test('config text containing literal {{PLACEHOLDER}} does not trip the leftover check', (t) => {
  const dir = makeFixture(t);
  const cfg = writeConfig(dir, {
    scopeSummary: 'Templates carry {{PLACEHOLDER}}s and are out of scope by policy.',
  });
  node(dir, [BOOTSTRAP, '--config', cfg]); // must not fail
  const agents = readFileSync(join(dir, 'docs/wiki/AGENTS.md'), 'utf8');
  assert.match(agents, /carry \{\{PLACEHOLDER\}\}s/, 'user text preserved verbatim');
});

test('empty exclude list parses as no exclusions (comment placeholder)', (t) => {
  const dir = makeFixture(t);
  const cfg = writeConfig(dir); // exclude: []
  node(dir, [BOOTSTRAP, '--config', cfg]);
  const raw = readFileSync(join(dir, 'docs/wiki/wiki.config.yml'), 'utf8');
  assert.match(raw, /exclude:\n    # \(none\)/);
  const cov = JSON.parse(node(dir, ['.repolore/scripts/wiki-coverage.mjs', '--json']));
  assert.equal(cov.total, 3, 'comment line must not register as an exclude glob');
});

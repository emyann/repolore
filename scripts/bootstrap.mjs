#!/usr/bin/env node
/**
 * bootstrap.mjs — one-shot mechanical vendoring for the repolore init workflow.
 *
 * The init skill makes the judgment calls (stack detection, scope, the page
 * manifest, prose) and encodes them in a single JSON config; this script does
 * every mechanical step in one deterministic shot — directories, vendored
 * scripts, instantiated templates, the CLAUDE.md import, `.repolore/manifest.json`
 * with blob SHAs, the generated index, and verification. Keeping the
 * mechanical work out of the LLM makes init faster and removes the
 * transcription-error surface.
 *
 *   node bootstrap.mjs --config <init.json>            # vendor everything
 *   node bootstrap.mjs --config <init.json> --dry-run  # validate + preview only
 *   node bootstrap.mjs ... --json                      # machine-readable output
 *
 * `--dry-run` never writes: it validates the config and reports the in-scope
 * source-file count (same semantics as wiki-coverage.mjs — the number shown
 * at the approval gate equals the later coverage baseline), grouped by
 * top-level directory. Run it with just `scope` filled in for the phase-2
 * scope question, and again with the full config at the phase-4 gate.
 *
 * Config shape (only `scope` is required for --dry-run):
 *   {
 *     "projectName": "acme",
 *     "wikiRoot": "docs/wiki",
 *     "scriptsDir": ".repolore/scripts",        // optional, this is the default
 *     "pageBudget": 50,                          // optional
 *     "scopeSummary": "prose for AGENTS.md",
 *     "repoNotes": "3-6 lines for wiki.config.yml",
 *     "scope": { "include": ["src/**"], "exclude": ["src/generated/**"] },
 *     "pages": [ { "slug": "architecture/overview", "summary": "…" } ]
 *   }
 *
 * Stdlib-only (node + git), like every repolore script. This file stays in
 * the plugin — it is NOT vendored into target repos (init-time tool only).
 *
 * Exit code: 0 on success, 2 on any validation or verification failure.
 */
import {
  readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync,
} from 'node:fs';
import { join, dirname, isAbsolute } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  repoRoot, blobSha, fail, collectInScopeSources, DEFAULT_CATEGORIES, localToday,
  VENDORED_SCRIPTS,
} from './lib.mjs';

const PLUGIN_SCRIPTS = dirname(fileURLToPath(import.meta.url));
const PLUGIN_TEMPLATES = join(PLUGIN_SCRIPTS, '..', 'templates');
/** repolore version, recorded in the repo manifest so the check workflow can
 *  nudge when the installed plugin is newer than the vendored tooling. */
const pluginVersion = (() => {
  try {
    return JSON.parse(readFileSync(join(PLUGIN_SCRIPTS, '..', '.claude-plugin', 'plugin.json'), 'utf8')).version ?? null;
  } catch { return null; }
})();
const argv = process.argv.slice(2);
const DRY_RUN = argv.includes('--dry-run');
const JSON_OUT = argv.includes('--json');
const cfgIdx = argv.indexOf('--config');
if (cfgIdx === -1 || !argv[cfgIdx + 1]) fail('usage: bootstrap.mjs --config <init.json> [--dry-run] [--json]');

const root = repoRoot();

let cfg;
try {
  cfg = JSON.parse(readFileSync(argv[cfgIdx + 1], 'utf8'));
} catch (e) {
  fail(`cannot read config ${argv[cfgIdx + 1]}: ${e.message}`);
}

// --- validation ------------------------------------------------------------

const problems = [];
const isStr = (v) => typeof v === 'string' && v.trim().length > 0;

if (!Array.isArray(cfg.scope?.include) || cfg.scope.include.length === 0) {
  problems.push('scope.include must be a non-empty array of globs — scope is the key init decision');
}
if (cfg.scope?.exclude !== undefined && !Array.isArray(cfg.scope.exclude)) {
  problems.push('scope.exclude must be an array when present');
}
const wikiRoot = cfg.wikiRoot ?? 'docs/wiki';
if (isAbsolute(wikiRoot) || wikiRoot.startsWith('..') || wikiRoot === '.' || wikiRoot === '') {
  problems.push(`wikiRoot must be a repo-relative directory, got "${wikiRoot}"`);
}
const scriptsDir = cfg.scriptsDir ?? '.repolore/scripts';
const pageBudget = cfg.pageBudget ?? 50;
if (!Number.isInteger(pageBudget) || pageBudget < 1) problems.push('pageBudget must be a positive integer');

const pages = cfg.pages ?? [];
for (const p of pages) {
  if (!isStr(p.slug) || !p.slug.includes('/')) problems.push(`page slug must be "category/name", got "${p.slug}"`);
  if (!isStr(p.summary)) problems.push(`page "${p.slug}" needs a one-line summary`);
}

if (!DRY_RUN) {
  for (const key of ['projectName', 'scopeSummary', 'repoNotes']) {
    if (!isStr(cfg[key])) problems.push(`${key} is required (non-empty string)`);
  }
  if (existsSync(join(root, '.repolore', 'manifest.json'))) {
    problems.push('.repolore/manifest.json already exists — this repo is initialized; use the repolore check/refresh workflows');
  }
  if (existsSync(join(root, wikiRoot, 'wiki.config.yml'))) {
    problems.push(`${wikiRoot}/wiki.config.yml already exists — adopt the existing wiki instead of overwriting it`);
  }
}
if (problems.length) fail(`invalid config:\n  - ${problems.join('\n  - ')}`);

// --- in-scope census (shared semantics with wiki-coverage.mjs) --------------

const sources = collectInScopeSources(root, {
  include: cfg.scope.include,
  exclude: cfg.scope.exclude ?? [],
  wikiRel: wikiRoot,
});
const byTopDir = new Map();
for (const f of sources) {
  const top = f.includes('/') ? f.slice(0, f.indexOf('/')) : '(root)';
  byTopDir.set(top, (byTopDir.get(top) ?? 0) + 1);
}
const dirCounts = [...byTopDir.entries()].sort((a, b) => b[1] - a[1]);

if (DRY_RUN) {
  if (JSON_OUT) {
    console.log(JSON.stringify({
      mode: 'dry-run', repoRoot: root, wikiRoot, scriptsDir, pageBudget,
      inScope: sources.length,
      byTopDir: dirCounts.map(([dir, count]) => ({ dir, count })),
      pages: pages.length,
    }, null, 2));
  } else {
    console.log('\nrepolore bootstrap — dry run (nothing written)\n');
    console.log(`  Wiki root:    ${wikiRoot}`);
    console.log(`  Scripts dir:  ${scriptsDir}`);
    console.log(`  In scope:     ${sources.length} source file(s)`);
    for (const [dir, count] of dirCounts.slice(0, 12)) {
      console.log(`    ${String(count).padStart(5)}  ${dir}`);
    }
    if (dirCounts.length > 12) console.log(`           … +${dirCounts.length - 12} more directories`);
    console.log(`  Pages:        ${pages.length} planned (soft budget ${pageBudget})\n`);
  }
  process.exit(0);
}

// --- vendoring ---------------------------------------------------------------

const tpl = (name) => readFileSync(join(PLUGIN_TEMPLATES, name), 'utf8');
const written = [];
const write = (rel, content) => {
  const abs = join(root, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content);
  written.push(rel);
};

/** Replace {{PLACEHOLDER}}s; every placeholder the TEMPLATE declares must get
 *  a replacement. Checked against the template, not the output — substituted
 *  user content may legitimately contain `{{…}}` text. */
function instantiate(name, replacements) {
  const template = tpl(name);
  const expected = new Set([...template.matchAll(/\{\{([A-Z_]+)\}\}/g)].map((m) => m[1]));
  let text = template;
  for (const [key, value] of Object.entries(replacements)) {
    text = text.replaceAll(`{{${key}}}`, value);
    expected.delete(key);
  }
  if (expected.size) fail(`internal: unreplaced placeholder {{${[...expected][0]}}} in ${name}`);
  return text;
}

// 1. Wiki skeleton.
for (const cat of DEFAULT_CATEGORIES) mkdirSync(join(root, wikiRoot, cat), { recursive: true });
mkdirSync(join(root, wikiRoot, '_templates'), { recursive: true });

// 2. Vendored scripts (copied unmodified).
for (const s of VENDORED_SCRIPTS) {
  const rel = join(scriptsDir, s);
  mkdirSync(join(root, scriptsDir), { recursive: true });
  copyFileSync(join(PLUGIN_SCRIPTS, s), join(root, rel));
  written.push(rel);
}

// 3. AGENTS.md + a CLAUDE.md that imports it, so Claude Code auto-loads the
// same guidance in-tree. An `@AGENTS.md` import (not a symlink) keeps AGENTS.md
// the one canonical file while staying portable: no Windows dev-mode or CI
// symlink-following caveat, and no copy-fallback that could drift. The bridge
// is written raw (not via write()) so it stays out of the manifest — it has no
// master to regenerate from, exactly like the symlink it replaces.
// See decisions/adr-008-per-harness-entry-point-bridging.
write(join(wikiRoot, 'AGENTS.md'), instantiate('AGENTS.md', {
  WIKI_DIR: wikiRoot,
  PROJECT_NAME: cfg.projectName,
  SCRIPTS_DIR: scriptsDir,
  SCOPE_SUMMARY: cfg.scopeSummary.trim(),
  PAGE_BUDGET: String(pageBudget),
}));
const claudeBridge = join(root, wikiRoot, 'CLAUDE.md');
if (!existsSync(claudeBridge)) {
  writeFileSync(claudeBridge, '@AGENTS.md\n');
}

// 4. wiki.config.yml — globs at 4-space indent, repo notes folded into the
//    `repo_notes: |` block, page-plan entries at 2-space indent. Free-text
//    values are double-quoted: summaries routinely contain ": " and an
//    unquoted one is invalid strict YAML — our line-based parser tolerates
//    it, but yamllint/IDEs/external consumers will not.
const yq = (s) => `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
const globLines = (globs) => (globs.length ? globs.map((g) => `    - "${g}"`).join('\n') : '    # (none)');
const planLines = pages.length
  ? pages.map((p) => `  - slug: ${p.slug}\n    summary: ${yq(p.summary)}\n    status: ${p.status ?? 'planned'}`).join('\n')
  : '  # (none yet — add entries as pages are planned)';
write(join(wikiRoot, 'wiki.config.yml'), instantiate('wiki.config.yml', {
  PROJECT_NAME: yq(cfg.projectName),
  REPO_NOTES: cfg.repoNotes.trim().split('\n').join('\n  '),
  SCOPE_INCLUDE: globLines(cfg.scope.include),
  SCOPE_EXCLUDE: globLines(cfg.scope.exclude ?? []),
  PAGE_PLAN: planLines,
}).replace(/^(\s*page_budget:)\s*\d+/m, `$1 ${pageBudget}`));

// 5. Static templates and journals (copied unmodified).
write(join(wikiRoot, '_templates', 'page.md'), tpl('page.md'));
write(join(wikiRoot, '_templates', 'decision.md'), tpl('decision.md'));
write(join(wikiRoot, '_templates', 'flow.md'), tpl('flow.md'));
write(join(wikiRoot, 'GLOSSARY.md'), tpl('GLOSSARY.md'));
write(join(wikiRoot, 'log.md'), tpl('log.md'));

// 6. .repolore/manifest.json — every regenerable vendored file with its blob
//    SHA, so a future `update` can regenerate untouched files and surface
//    edited ones. wiki.config.yml, GLOSSARY.md and log.md are deliberately
//    absent: they are content surfaces owned by the repo (and expected to
//    change) from the moment they are written.
const repoOwned = new Set(['wiki.config.yml', 'GLOSSARY.md', 'log.md'].map((f) => join(wikiRoot, f)));
const trackedRels = written.filter((r) => !repoOwned.has(r));
write(join('.repolore', 'manifest.json'), JSON.stringify({
  tool: 'repolore',
  schemaVersion: 1,
  pluginVersion,
  wikiRoot,
  scriptsDir,
  initializedAt: localToday(),
  generatedFiles: trackedRels.map((rel) => ({ path: rel, sha: blobSha(root, rel) })),
}, null, 2) + '\n');

// 7. Generate the index, then verify everything we just wrote.
const run = (args) => execFileSync('node', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const verified = [];
try {
  run([join(scriptsDir, 'wiki-index.mjs')]);
  verified.push('index generated');
  run([join(scriptsDir, 'wiki-check.mjs'), '--quiet']);
  verified.push('wiki-check clean');
  run([join(scriptsDir, 'wiki-index.mjs'), '--check']);
  verified.push('index --check clean');
} catch (e) {
  fail(`verification failed after vendoring: ${e.stderr || e.stdout || e.message}`);
}

// --- report ------------------------------------------------------------------

if (JSON_OUT) {
  console.log(JSON.stringify({
    mode: 'bootstrap', repoRoot: root, wikiRoot, scriptsDir, pageBudget,
    written, verified,
    inScope: sources.length,
    byTopDir: dirCounts.map(([dir, count]) => ({ dir, count })),
    pages: pages.length,
  }, null, 2));
} else {
  console.log('\nrepolore bootstrap — complete\n');
  console.log(`  Wiki:      ${wikiRoot}/ (AGENTS.md + CLAUDE.md import, wiki.config.yml, templates, glossary, log, generated index)`);
  console.log(`  Tooling:   ${scriptsDir}/ (${VENDORED_SCRIPTS.length} scripts) + .repolore/manifest.json (${trackedRels.length} files tracked by blob SHA)`);
  console.log(`  Verified:  ${verified.join(', ')}`);
  console.log(`  Page plan: ${pages.length} page(s) (soft budget ${pageBudget})`);
  console.log(`  Baseline:  ${sources.length} in-scope source file(s) — wiki-coverage.mjs reports how many a page covers as the wiki grows\n`);
}
process.exit(0);

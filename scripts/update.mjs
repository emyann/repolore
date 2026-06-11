#!/usr/bin/env node
/**
 * update.mjs — bring a repo's vendored repolore layer up to the installed
 * version, safely.
 *
 * `.repolore/manifest.json` records the blob SHA every vendored file had
 * when it was written; that record is what makes this safe. Per tracked
 * file, comparing (recorded, current, master) yields the classification:
 *
 *   current == master                      → up-to-date (manifest fixed if it lagged)
 *   current == recorded, != master         → pristine but outdated → regenerated
 *   current != recorded, != master         → LOCALLY MODIFIED → skipped (use --force <path>)
 *   current missing                        → restored from master
 *   in VENDORED_SCRIPTS but not tracked    → new in this version → added
 *
 *   node update.mjs --dry-run         # classify only, write nothing
 *   node update.mjs                   # apply safe updates
 *   node update.mjs --force <path>    # also overwrite a locally-modified file
 *   node update.mjs ... --json        # machine-readable
 *
 * Scripts and `_templates/*` are copied unmodified from the masters.
 * `<wikiRoot>/AGENTS.md` is re-instantiated from the template: WIKI_DIR /
 * SCRIPTS_DIR come from the manifest, PROJECT_NAME / PAGE_BUDGET from
 * wiki.config.yml, and SCOPE_SUMMARY is extracted from the existing file's
 * "## Scope" section — if that section can't be located, the file is left
 * alone and reported for manual review.
 *
 * After applying, manifest SHAs are refreshed and `pluginVersion` is set to
 * the installed version. This script never touches wiki pages, the config,
 * the glossary, or the log — those are the repo's content, not tooling.
 *
 * Like bootstrap.mjs, this stays in the plugin — it is NOT vendored.
 *
 * Exit code: 0 clean (including nothing to do), 1 when skipped/needs-review
 * items remain, 2 on fatal errors.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  repoRoot, blobSha, fail, loadConfig, configScalar, VENDORED_SCRIPTS,
} from './lib.mjs';

const PLUGIN_SCRIPTS = dirname(fileURLToPath(import.meta.url));
const PLUGIN_TEMPLATES = join(PLUGIN_SCRIPTS, '..', 'templates');

const argv = process.argv.slice(2);
const DRY = argv.includes('--dry-run');
const JSON_OUT = argv.includes('--json');
const forced = new Set();
for (let i = 0; i < argv.length; i++) if (argv[i] === '--force' && argv[i + 1]) forced.add(argv[++i]);

const root = repoRoot();
const manifestPath = join(root, '.repolore', 'manifest.json');
if (!existsSync(manifestPath)) fail('no .repolore/manifest.json — this repo has no repolore wiki to update (run init first)');
let manifest;
try {
  manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
} catch (e) {
  fail(`cannot parse ${manifestPath}: ${e.message}`);
}
const { wikiRoot, scriptsDir } = manifest;

const installedVersion = (() => {
  try {
    return JSON.parse(readFileSync(join(PLUGIN_SCRIPTS, '..', '.claude-plugin', 'plugin.json'), 'utf8')).version ?? null;
  } catch { return null; }
})();

const hashContent = (content) =>
  execFileSync('git', ['hash-object', '--stdin'], { cwd: root, input: content, encoding: 'utf8' }).trim();

/** Re-instantiate the AGENTS.md template, preserving the repo's own values. */
function regenerateAgents(currentText) {
  const scopeM = currentText?.match(/## Scope\n\n([\s\S]*?)\n\nSee `wiki\.config\.yml`/);
  if (!scopeM) return null;
  const { raw } = loadConfig(join(root, wikiRoot));
  const replacements = {
    WIKI_DIR: wikiRoot,
    SCRIPTS_DIR: scriptsDir,
    PROJECT_NAME: configScalar(raw, 'wiki', 'title') ?? 'this project',
    PAGE_BUDGET: configScalar(raw, 'wiki', 'page_budget') ?? '50',
    SCOPE_SUMMARY: scopeM[1].trim(),
  };
  let text = readFileSync(join(PLUGIN_TEMPLATES, 'AGENTS.md'), 'utf8');
  for (const [key, value] of Object.entries(replacements)) text = text.replaceAll(`{{${key}}}`, value);
  return text;
}

/** Master content for a tracked path, or null when this tool doesn't own it. */
function masterContent(rel, currentText) {
  if (rel.startsWith(scriptsDir + '/')) {
    const name = basename(rel);
    if (!VENDORED_SCRIPTS.includes(name)) return null;
    return readFileSync(join(PLUGIN_SCRIPTS, name), 'utf8');
  }
  if (rel === join(wikiRoot, '_templates', 'page.md')) return readFileSync(join(PLUGIN_TEMPLATES, 'page.md'), 'utf8');
  if (rel === join(wikiRoot, '_templates', 'decision.md')) return readFileSync(join(PLUGIN_TEMPLATES, 'decision.md'), 'utf8');
  if (rel === join(wikiRoot, 'AGENTS.md')) return regenerateAgents(currentText);
  return null;
}

const report = {
  fromVersion: manifest.pluginVersion ?? null,
  toVersion: installedVersion,
  upToDate: [], updated: [], restored: [], added: [], manifestFixed: [],
  skippedModified: [], needsReview: [], unknown: [],
};

const apply = (rel, content) => {
  if (DRY) return;
  const abs = join(root, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content);
};

for (const entry of manifest.generatedFiles) {
  const rel = entry.path;
  const abs = join(root, rel);
  const exists = existsSync(abs);
  const currentText = exists ? readFileSync(abs, 'utf8') : null;
  const current = exists ? blobSha(root, rel) : null;

  const master = masterContent(rel, currentText);
  if (master === null) {
    if (rel === join(wikiRoot, 'AGENTS.md')) report.needsReview.push({ path: rel, reason: 'cannot locate the "## Scope" section to preserve — update it by hand from templates/AGENTS.md' });
    else report.unknown.push({ path: rel, reason: 'not a file this version of repolore vendors' });
    continue;
  }
  const masterSha = hashContent(master);

  if (current === masterSha) {
    if (entry.sha !== current) { entry.sha = current; report.manifestFixed.push({ path: rel }); }
    else report.upToDate.push({ path: rel });
  } else if (!exists) {
    apply(rel, master); entry.sha = masterSha;
    report.restored.push({ path: rel });
  } else if (current === entry.sha || forced.has(rel)) {
    apply(rel, master); entry.sha = masterSha;
    report.updated.push({ path: rel, forced: forced.has(rel) && current !== entry.sha });
  } else {
    report.skippedModified.push({
      path: rel,
      reason: `locally modified — review with: git diff ${entry.sha} ${current}; pass --force ${rel} to overwrite`,
    });
  }
}

// Scripts this version vendors that the manifest predates entirely.
for (const name of VENDORED_SCRIPTS) {
  const rel = join(scriptsDir, name);
  if (manifest.generatedFiles.some((f) => f.path === rel)) continue;
  const master = readFileSync(join(PLUGIN_SCRIPTS, name), 'utf8');
  const sha = hashContent(master);
  apply(rel, master);
  if (!DRY) manifest.generatedFiles.push({ path: rel, sha });
  report.added.push({ path: rel });
}

const changed = report.updated.length + report.restored.length + report.added.length + report.manifestFixed.length;
const attention = report.skippedModified.length + report.needsReview.length;

if (!DRY && (changed || manifest.pluginVersion !== installedVersion)) {
  if (installedVersion) manifest.pluginVersion = installedVersion;
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
}

if (JSON_OUT) {
  console.log(JSON.stringify({ mode: DRY ? 'dry-run' : 'update', ...report }, null, 2));
} else {
  const arrow = `${report.fromVersion ?? '(unrecorded)'} → ${report.toVersion ?? '(unknown)'}`;
  console.log(`\nrepolore update — ${arrow}${DRY ? '   (dry run, nothing written)' : ''}\n`);
  console.log(`  up-to-date: ${report.upToDate.length} file(s)`);
  for (const f of report.updated) console.log(`  UPDATE   ${f.path}${f.forced ? '  (forced over local edits)' : ''}`);
  for (const f of report.restored) console.log(`  RESTORE  ${f.path}  (was missing)`);
  for (const f of report.added) console.log(`  ADD      ${f.path}  (new in this version)`);
  for (const f of report.manifestFixed) console.log(`  FIXED    manifest sha for ${f.path}  (file already matched the master)`);
  for (const f of report.skippedModified) console.log(`  SKIP     ${f.path}\n           ${f.reason}`);
  for (const f of report.needsReview) console.log(`  REVIEW   ${f.path}\n           ${f.reason}`);
  if (!DRY && changed) console.log(`\n  Now: regenerate the index (node ${scriptsDir}/wiki-index.mjs), re-run wiki-check, and commit.`);
  if (DRY && (changed || attention)) console.log(`\n  Apply with: node <SKILL_ROOT>/scripts/update.mjs`);
  if (!changed && !attention) console.log('\n  Nothing to do — vendored layer matches the installed version.');
  console.log('');
}
process.exit(attention ? 1 : 0);

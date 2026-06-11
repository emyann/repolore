#!/usr/bin/env node
/**
 * wiki-check.mjs — staleness detector for the LLM-maintained wiki.
 *
 * Each wiki page lists, in its frontmatter, the source files it `covers` and
 * the git blob SHA each had when the page was written. This script re-hashes
 * those files and compares: any mismatch means the source moved on and the
 * page is stale.
 *
 *   node wiki-check.mjs                    # report
 *   node wiki-check.mjs --json             # machine-readable
 *   node wiki-check.mjs --quiet            # print nothing if all fresh
 *   node wiki-check.mjs --wiki-root <dir>  # override wiki location
 *
 * Status is COMPUTED, never written: no frontmatter field, no state file.
 * Recomputing takes well under a second; committing volatile check-state
 * only creates dirty trees and merge conflicts. The reader-visible freshness
 * signal is `generated_at_commit` / `last_refreshed`, written at refresh time
 * by wiki-stamp.mjs.
 *
 * Exit code: 0 if every page is fresh/unmanaged, 1 if any page is stale or
 * malformed. Hooks and reminders should ignore the exit code (report, never
 * block); CI may choose to consume it.
 */
import { readFileSync } from 'node:fs';
import { relative } from 'node:path';
import {
  repoRoot, findWikiRoot, walkPages, splitFrontmatter, parseCovers, blobSha,
  loadConfig, configScalar,
} from './lib.mjs';

const argv = process.argv.slice(2);
const JSON_OUT = argv.includes('--json');
const QUIET = argv.includes('--quiet');

const root = repoRoot();
const wikiRoot = findWikiRoot(root, argv);
const { raw } = loadConfig(wikiRoot);
const pageBudget = Number(configScalar(raw, 'wiki', 'page_budget') ?? 50);

const results = [];
const legacyPages = [];
for (const file of walkPages(wikiRoot)) {
  const rel = relative(root, file);
  const parts = splitFrontmatter(readFileSync(file, 'utf8'));
  if (!parts) { results.push({ page: rel, status: 'malformed' }); continue; }
  // Legacy tooling-owned fields (decisions/ legitimately use `status:` for
  // their lifecycle — proposed/accepted/superseded — so only flag the old
  // computed freshness values).
  if (/^status:\s*(fresh|stale|unmanaged)\s*$/m.test(parts.fm) || /^last_checked:/m.test(parts.fm)) legacyPages.push(rel);

  const covers = parseCovers(parts.fm);
  if (covers.length === 0) { results.push({ page: rel, status: 'unmanaged' }); continue; }

  const stale = [];
  for (const c of covers) {
    if (!c.sha) { stale.push({ path: c.path, reason: 'no sha recorded — run wiki-stamp.mjs after refreshing' }); continue; }
    const actual = blobSha(root, c.path);
    if (actual === null) stale.push({ path: c.path, reason: 'covered file deleted or moved' });
    else if (actual !== c.sha) stale.push({ path: c.path, reason: 'covered file changed' });
  }
  results.push({ page: rel, status: stale.length ? 'stale' : 'fresh', stale });
}

const stale = results.filter((r) => r.status === 'stale');
const malformed = results.filter((r) => r.status === 'malformed');
const unmanaged = results.filter((r) => r.status === 'unmanaged');
const overBudget = results.length > pageBudget;
const clean = stale.length === 0 && malformed.length === 0;

if (JSON_OUT) {
  console.log(JSON.stringify({
    pages: results,
    counts: { total: results.length, fresh: results.length - stale.length - malformed.length - unmanaged.length, stale: stale.length, malformed: malformed.length, unmanaged: unmanaged.length },
    page_budget: pageBudget,
    over_budget: overBudget,
    legacy_fields: legacyPages,
  }, null, 2));
  process.exit(clean ? 0 : 1);
}

if (!(QUIET && clean && !overBudget && legacyPages.length === 0)) {
  console.log(`\nWiki freshness — ${results.length} page(s) checked\n`);
  for (const r of stale) {
    console.log(`  STALE      ${r.page}`);
    for (const s of r.stale) console.log(`             - ${s.path}  (${s.reason})`);
  }
  for (const r of malformed) console.log(`  MALFORMED  ${r.page}  (missing/broken frontmatter)`);
  for (const r of unmanaged) console.log(`  UNMANAGED  ${r.page}  (no \`covers:\` — staleness cannot be tracked)`);
  if (clean && unmanaged.length === 0) console.log('  All pages fresh.');
  else if (clean) console.log(`\n  ${results.length - unmanaged.length} fresh, ${unmanaged.length} unmanaged.`);
  else console.log(`\n  ${stale.length} stale, ${malformed.length} malformed — run /repolore:refresh (or see the refresh workflow in AGENTS.md).`);
  if (overBudget) console.log(`\n  ⚠ ${results.length} pages exceeds the soft page budget (${pageBudget}). Consider merging or archiving — a curated wiki beats a sprawling one. (Tune wiki.page_budget in wiki.config.yml.)`);
  if (legacyPages.length) console.log(`\n  ⚠ ${legacyPages.length} page(s) carry legacy \`status:\`/\`last_checked:\` fields. Status is computed now — delete those lines.`);
  console.log('');
}

process.exit(clean ? 0 : 1);

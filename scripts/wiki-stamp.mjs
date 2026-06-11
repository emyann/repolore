#!/usr/bin/env node
/**
 * wiki-stamp.mjs — mechanical covers-SHA bookkeeping for wiki pages.
 *
 * After you write or refresh a page, run this instead of hand-computing
 * `git hash-object` for every covered file. For each given page it:
 *
 *   1. re-hashes every `covers:` path and writes the current blob SHA,
 *   2. sets `generated_at_commit:` to the current short HEAD SHA,
 *   3. sets `last_refreshed:` to today.
 *
 *   node wiki-stamp.mjs <page.md> [<page.md> ...]   # stamp specific pages
 *   node wiki-stamp.mjs --all                       # stamp every page (see warning)
 *   node wiki-stamp.mjs ... --wiki-root <dir>       # override wiki location
 *
 * ⚠ Stamping BLESSES the page: it tells the checker "this prose reflects the
 * code as it is right now". Stamp AFTER refreshing the content, never instead
 * of refreshing it. `--all` re-blesses every page wholesale and is only safe
 * immediately after a full audit/refresh pass.
 *
 * Exit code: 0 on success, 1 if any page needs attention (no covers, missing
 * covered files, malformed frontmatter).
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import {
  repoRoot, findWikiRoot, walkPages, splitFrontmatter, parseCovers, blobSha, git, fail,
} from './lib.mjs';

const argv = process.argv.slice(2);
const ALL = argv.includes('--all');
const rootIdx = argv.indexOf('--wiki-root');
const wikiRootValueIdx = rootIdx === -1 ? -1 : rootIdx + 1;
const pageArgs = argv.filter((a, i) => !a.startsWith('--') && i !== wikiRootValueIdx);

const root = repoRoot();
const wikiRoot = findWikiRoot(root, argv);

let pages;
if (ALL) {
  pages = walkPages(wikiRoot);
  console.log('⚠ stamping ALL pages — this marks every page as reflecting the current code.');
} else {
  if (pageArgs.length === 0) fail('no pages given — usage: wiki-stamp.mjs <page.md> [...] | --all');
  pages = pageArgs.map((p) => {
    const fromCwd = resolve(process.cwd(), p);
    const fromRoot = resolve(root, p);
    if (existsSync(fromCwd)) return fromCwd;
    if (existsSync(fromRoot)) return fromRoot;
    fail(`page not found: ${p}`);
  });
}

const shortHead = git(root, ['rev-parse', '--short', 'HEAD']);
const today = new Date().toISOString().slice(0, 10);

/** Replace a top-level frontmatter scalar, appending it when absent. */
function setScalar(fm, key, value) {
  const re = new RegExp(`^${key}:.*$`, 'm');
  if (re.test(fm)) return fm.replace(re, `${key}: ${value}`);
  if (!fm.endsWith('\n')) fm += '\n';
  return fm + `${key}: ${value}\n`;
}

/** Rewrite the covers block with fresh SHAs, preserving entry order. */
function setCovers(fm, covers) {
  const block = ['covers:', ...covers.map((c) => `  - path: ${c.path}\n    sha: ${c.sha}`)].join('\n');
  const ls = fm.split('\n');
  const start = ls.findIndex((l) => /^covers:\s*$/.test(l));
  if (start === -1) return fm + block + '\n';
  let end = start + 1;
  while (end < ls.length && !/^\S/.test(ls[end])) end++;
  const out = [...ls.slice(0, start), block, ...ls.slice(end)].join('\n');
  return out.endsWith('\n') ? out : out + '\n';
}

let attention = 0;
for (const file of pages) {
  const rel = relative(root, file);
  const text = readFileSync(file, 'utf8');
  const parts = splitFrontmatter(text);
  if (!parts) { console.log(`  SKIP   ${rel}  (malformed frontmatter)`); attention++; continue; }

  const covers = parseCovers(parts.fm);
  if (covers.length === 0) { console.log(`  SKIP   ${rel}  (no covers: list — add the source files this page distils)`); attention++; continue; }

  let changed = 0;
  const missing = [];
  for (const c of covers) {
    const actual = blobSha(root, c.path);
    if (actual === null) { missing.push(c.path); continue; }
    if (actual !== c.sha) { c.sha = actual; changed++; }
  }

  let fm = setCovers(parts.fm, covers);
  fm = setScalar(fm, 'generated_at_commit', shortHead);
  fm = setScalar(fm, 'last_refreshed', today);
  if (!fm.endsWith('\n')) fm += '\n';
  writeFileSync(file, `---\n${fm}---${parts.body}`);

  const note = missing.length ? `  ⚠ missing covered file(s): ${missing.join(', ')} — remove or fix those entries` : '';
  console.log(`  STAMP  ${rel}  (${changed} sha(s) updated, @${shortHead})${note}`);
  if (missing.length) attention++;
}

if (attention) console.log(`\n  ${attention} page(s) need attention (see SKIP/⚠ above).`);
process.exit(attention ? 1 : 0);

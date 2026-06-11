/**
 * lib.mjs — shared helpers for the repolore check scripts.
 *
 * Stdlib-only (node + git): these files are vendored into target repos and
 * must never require an npm install. They parse exactly the controlled
 * schema documented in the wiki's AGENTS.md — not arbitrary YAML.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, isAbsolute, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

/** Special wiki files that are never pages (any level). */
export const SKIP_FILES = new Set([
  'index.md', 'AGENTS.md', 'CLAUDE.md', 'README.md', 'GLOSSARY.md', 'log.md',
]);
/** Directories inside the wiki that never hold pages. */
export const SKIP_DIRS = new Set(['_templates', '_audit']);

/** Default category order for the generated index; `categories:` in wiki.config.yml overrides. */
export const DEFAULT_CATEGORIES = [
  'architecture', 'concepts', 'features', 'flows', 'decisions', 'gotchas', 'howto',
];

export function fail(msg) {
  console.error(`repolore: ${msg}`);
  process.exit(2);
}

export function git(cwd, args) {
  return execFileSync('git', args, {
    cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
}

export function repoRoot() {
  try {
    return git(process.cwd(), ['rev-parse', '--show-toplevel']);
  } catch {
    fail('not inside a git repository');
  }
}

/**
 * Locate the wiki root. Precedence: --wiki-root flag, REPOLORE_ROOT env var,
 * the `wikiRoot` field of .repolore/manifest.json at the repo root.
 */
export function findWikiRoot(root, argv) {
  const i = argv.indexOf('--wiki-root');
  let dir = null;
  if (i !== -1 && argv[i + 1]) dir = argv[i + 1];
  else if (process.env.REPOLORE_ROOT) dir = process.env.REPOLORE_ROOT;
  else {
    const manifest = join(root, '.repolore', 'manifest.json');
    if (existsSync(manifest)) {
      try { dir = JSON.parse(readFileSync(manifest, 'utf8')).wikiRoot; } catch { /* unreadable → fall through */ }
    }
  }
  if (!dir) fail('cannot locate the wiki — pass --wiki-root <dir>, set REPOLORE_ROOT, or run /repolore:init (it writes .repolore/manifest.json)');
  const abs = isAbsolute(dir) ? dir : resolve(root, dir);
  if (!existsSync(abs)) fail(`wiki root does not exist: ${abs}`);
  return abs;
}

/** git blob SHA of a working-tree file, or null if it is gone. */
export function blobSha(root, path) {
  try {
    return git(root, ['hash-object', path]);
  } catch {
    return null;
  }
}

/** Recursively collect wiki page files (.md, excluding special files/dirs). */
export function walkPages(wikiRoot) {
  const out = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) {
        if (!SKIP_DIRS.has(e.name) && !e.name.startsWith('.')) walk(join(dir, e.name));
      } else if (e.name.endsWith('.md') && !SKIP_FILES.has(e.name)) {
        out.push(join(dir, e.name));
      }
    }
  };
  walk(wikiRoot);
  return out.sort();
}

/** Split a `---`-delimited YAML frontmatter block off the top of a document. */
export function splitFrontmatter(text) {
  if (!text.startsWith('---\n')) return null;
  const end = text.indexOf('\n---', 4);
  if (end === -1) return null;
  return { fm: text.slice(4, end + 1), body: text.slice(end + 4) };
}

/** Top-level scalar field of a frontmatter block, quotes stripped. */
export function fmScalar(fm, key) {
  const m = fm.match(new RegExp(`^${key}:[ \\t]*(.+?)[ \\t]*$`, 'm'));
  if (!m) return null;
  const v = m[1].replace(/^["']|["']$/g, '');
  return v === '' ? null : v;
}

/** Lines belonging to a top-level `key:` block (until the next top-level key). */
function blockLines(text, key) {
  const ls = text.split('\n');
  const start = ls.findIndex((l) => new RegExp(`^${key}:\\s*$`).test(l));
  if (start === -1) return [];
  const out = [];
  for (let i = start + 1; i < ls.length; i++) {
    if (/^\S/.test(ls[i])) break;
    out.push(ls[i]);
  }
  return out;
}

/** List field: inline `key: [a, b]` or block `key:` + `- a` lines. */
export function fmList(fm, key) {
  const inline = fm.match(new RegExp(`^${key}:[ \\t]*\\[(.*)\\][ \\t]*$`, 'm'));
  if (inline) {
    return inline[1].split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
  }
  return blockLines(fm, key)
    .map((l) => l.match(/^\s*-\s*["']?(.+?)["']?\s*$/))
    .filter(Boolean)
    .map((m) => m[1]);
}

/** The `covers:` list of `{path, sha}` entries. */
export function parseCovers(fm) {
  const covers = [];
  let cur = null;
  for (const line of blockLines(fm, 'covers')) {
    const pathM = line.match(/^\s*-\s*path:\s*(.+?)\s*$/);
    const shaM = line.match(/^\s*sha:\s*(.+?)\s*$/);
    if (pathM) { cur = { path: pathM[1], sha: null }; covers.push(cur); }
    else if (shaM && cur) { cur.sha = shaM[1]; }
  }
  return covers;
}

/** Raw wiki.config.yml text ('' when absent — every consumer has defaults). */
export function loadConfig(wikiRoot) {
  const file = join(wikiRoot, 'wiki.config.yml');
  return { raw: existsSync(file) ? readFileSync(file, 'utf8') : '', file };
}

/** Two-level lists, e.g. `scope:` → `{include: [...], exclude: [...]}`. */
export function configLists(raw, key) {
  const out = {};
  let cur = null;
  for (const line of blockLines(raw, key)) {
    const k = line.match(/^\s{2}([\w-]+):\s*$/);
    if (k) { cur = k[1]; out[cur] = []; continue; }
    const inline = line.match(/^\s{2}([\w-]+):\s*\[(.*)\]\s*$/);
    if (inline) {
      out[inline[1]] = inline[2].split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
      cur = null;
      continue;
    }
    const item = line.match(/^\s{4}-\s*["']?([^"'\n]+?)["']?\s*$/);
    if (item && cur) out[cur].push(item[1]);
  }
  return out;
}

/** Scalar under a top-level block, e.g. (`wiki`, `page_budget`). */
export function configScalar(raw, key, sub) {
  for (const line of blockLines(raw, key)) {
    const m = line.match(new RegExp(`^\\s{2}${sub}:\\s*(.+?)\\s*$`));
    if (m) return m[1].replace(/^["']|["']$/g, '');
  }
  return null;
}

/** Top-level list, e.g. `categories:` (inline or block form). */
export function configList(raw, key) {
  return fmList(raw, key);
}

/** Translate a gitignore-ish glob to an anchored RegExp over a repo-relative path. */
export function globToRegex(glob) {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        i++;
        if (glob[i + 1] === '/') { i++; re += '(?:.*/)?'; } // '**/' = zero or more dirs
        else re += '.*';
      } else {
        re += '[^/]*';
      }
    } else if (c === '/') {
      re += '/';
    } else if ('.+?^${}()|[]\\'.includes(c)) {
      re += '\\' + c;
    } else {
      re += c;
    }
  }
  return new RegExp('^' + re + '$');
}

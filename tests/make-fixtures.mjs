#!/usr/bin/env node
/**
 * make-fixtures.mjs — builds the scenario repos for the agentic init-UX test.
 *
 *   node tests/make-fixtures.mjs <base-dir>
 *
 * Creates three small git repos under <base-dir> (which must not exist) and
 * prints their paths as JSON. Every repo gets a `baseline` git tag so the
 * validator can count commits made by the init run.
 *
 *   s1-defaults     typical TS side project; root CLAUDE.md with commit
 *                   conventions and NO trailing newline (the phase-6 edge)
 *   s2-no-context   same project, no agent context file at all
 *   s3-already-init same project, already initialized by bootstrap + committed
 *                   (the phase-0 abort path)
 */
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const BOOTSTRAP = join(fileURLToPath(import.meta.url), '..', '..', 'scripts', 'bootstrap.mjs');

const base = process.argv[2];
if (!base) { console.error('usage: make-fixtures.mjs <base-dir>'); process.exit(2); }
if (existsSync(base)) { console.error(`refusing to reuse ${base} — pass a fresh directory`); process.exit(2); }

const git = (cwd, args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

/** A believable little order service: routes + services + tests + README. */
function project(dir) {
  mkdirSync(join(dir, 'src', 'services'), { recursive: true });
  mkdirSync(join(dir, 'src', 'routes'), { recursive: true });
  writeFileSync(join(dir, 'package.json'), JSON.stringify({
    name: 'orderly', version: '0.1.0', type: 'module',
    scripts: { start: 'node src/index.ts' },
  }, null, 2) + '\n');
  writeFileSync(join(dir, 'README.md'),
    '# orderly\n\nA tiny order-tracking service. Orders come in via HTTP routes,\n'
    + 'pricing and discount rules live in services, state is in-memory.\n');
  writeFileSync(join(dir, 'src', 'index.ts'),
    'import { registerOrderRoutes } from "./routes/orders.ts";\n\n'
    + '// Entry point: wires routes onto a bare HTTP server (no framework).\n'
    + 'const routes = new Map();\nregisterOrderRoutes(routes);\n'
    + 'export { routes };\n');
  writeFileSync(join(dir, 'src', 'routes', 'orders.ts'),
    'import { priceOrder } from "../services/pricing.ts";\n\n'
    + 'export function registerOrderRoutes(routes) {\n'
    + '  routes.set("POST /orders", (body) => ({ id: crypto.randomUUID(), total: priceOrder(body.items) }));\n'
    + '  routes.set("GET /orders/:id", (id) => ({ id, status: "pending" }));\n'
    + '}\n');
  writeFileSync(join(dir, 'src', 'services', 'pricing.ts'),
    '// Discount rule: orders of 10+ items get 5% off — agreed with sales 2025-11.\n'
    + 'export function priceOrder(items) {\n'
    + '  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);\n'
    + '  const qty = items.reduce((s, i) => s + i.qty, 0);\n'
    + '  return qty >= 10 ? subtotal * 0.95 : subtotal;\n'
    + '}\n');
  writeFileSync(join(dir, 'src', 'services', 'pricing.test.ts'),
    'import { priceOrder } from "./pricing.ts";\n// noise-filtered by coverage\n');
}

function commitAll(dir, msg) {
  git(dir, ['add', '-A']);
  git(dir, ['-c', 'user.email=fixture@test', '-c', 'user.name=fixture', 'commit', '-qm', msg]);
}

function repo(name) {
  const dir = join(base, name);
  mkdirSync(dir, { recursive: true });
  git(dir, ['init', '-q']);
  git(dir, ['config', 'user.email', 'fixture@test']);
  git(dir, ['config', 'user.name', 'fixture']);
  project(dir);
  return dir;
}

// s1 — CLAUDE.md with conventions, deliberately missing its trailing newline.
const s1 = repo('s1-defaults');
writeFileSync(join(s1, 'CLAUDE.md'),
  '# orderly — agent guidance\n\n'
  + '## Commit Message Guidelines\n\n'
  + '- Never include `Co-Authored-By` lines in commit messages\n'
  + '- Use conventional commit prefixes (feat:, fix:, docs:)'); // no trailing \n
commitAll(s1, 'feat: initial order service');
git(s1, ['tag', 'baseline']);

// s2 — no agent context file at all.
const s2 = repo('s2-no-context');
commitAll(s2, 'feat: initial order service');
git(s2, ['tag', 'baseline']);

// s3 — already initialized: real bootstrap run, committed.
const s3 = repo('s3-already-init');
commitAll(s3, 'feat: initial order service');
const cfg = join(base, 's3-init.json');
writeFileSync(cfg, JSON.stringify({
  projectName: 'orderly',
  wikiRoot: 'docs/wiki',
  scopeSummary: 'Covers src/. Tests are noise-filtered.',
  repoNotes: 'orderly is a tiny order-tracking service.\nRoutes and services under src/.',
  scope: { include: ['src/**'], exclude: [] },
  pages: [{ slug: 'architecture/overview', summary: 'System shape.' }],
}));
execFileSync('node', [BOOTSTRAP, '--config', cfg], { cwd: s3, stdio: 'ignore' });
commitAll(s3, 'docs: initialize repolore wiki');
git(s3, ['tag', 'baseline']);

console.log(JSON.stringify({ s1, s2, s3 }, null, 2));

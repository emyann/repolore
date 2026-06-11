#!/usr/bin/env node
/**
 * validate-fixture.mjs — mechanical end-state assertions for the agentic
 * init-UX test. Run AFTER an agent has executed /repolore:init in a fixture
 * built by make-fixtures.mjs:
 *
 *   node tests/validate-fixture.mjs --scenario s1|s2|s3 --fixture <dir>
 *
 * Prints one PASS/FAIL line per check and exits 0 only if all pass. This
 * layer owns everything objectively checkable about the end state; the
 * workflow's judge stage grades the *experience* (report framing, ordering,
 * gates) which no file inspection can see.
 */
import { readFileSync, existsSync, lstatSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const argv = process.argv.slice(2);
const arg = (name) => { const i = argv.indexOf(name); return i === -1 ? null : argv[i + 1]; };
const scenario = arg('--scenario');
const fixture = arg('--fixture');
if (!scenario || !fixture) { console.error('usage: validate-fixture.mjs --scenario s1|s2|s3 --fixture <dir>'); process.exit(2); }

const git = (args) => execFileSync('git', args, { cwd: fixture, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const node = (args) => execFileSync('node', args, { cwd: fixture, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const read = (rel) => readFileSync(join(fixture, rel), 'utf8');

let failures = 0;
function check(name, fn) {
  try {
    const detail = fn();
    console.log(`  PASS  ${name}${detail ? ` — ${detail}` : ''}`);
  } catch (e) {
    failures++;
    console.log(`  FAIL  ${name} — ${e.message}`);
  }
}
const expect = (cond, msg) => { if (!cond) throw new Error(msg); };

const commitsSinceBaseline = () => Number(git(['rev-list', '--count', 'baseline..HEAD']));

// --- s3: the abort path — nothing may have changed -------------------------
if (scenario === 's3') {
  check('no new commits (init must abort on an initialized repo)', () => {
    expect(commitsSinceBaseline() === 0, `${commitsSinceBaseline()} commit(s) after baseline`);
  });
  check('working tree untouched', () => {
    const dirty = git(['status', '--porcelain']);
    expect(dirty === '', `dirty:\n${dirty}`);
  });
  console.log(failures ? `\n${failures} check(s) failed` : '\nall checks passed');
  process.exit(failures ? 1 : 0);
}

// --- s1 + s2: the full init path --------------------------------------------

check('vendored layout exists', () => {
  for (const rel of [
    '.repolore/manifest.json', '.repolore/scripts/wiki-check.mjs',
    'docs/wiki/AGENTS.md', 'docs/wiki/wiki.config.yml', 'docs/wiki/index.md',
    'docs/wiki/GLOSSARY.md', 'docs/wiki/log.md', 'docs/wiki/_templates/page.md',
  ]) expect(existsSync(join(fixture, rel)), `missing ${rel}`);
});

check('in-wiki CLAUDE.md imports AGENTS.md (portable bridge, not a symlink)', () => {
  const bridge = join(fixture, 'docs/wiki/CLAUDE.md');
  expect(existsSync(bridge), 'missing');
  expect(!lstatSync(bridge).isSymbolicLink(), 'still a symlink — should be a regular file');
  expect(read('docs/wiki/CLAUDE.md').trim() === '@AGENTS.md', 'does not import AGENTS.md');
});

check('manifest SHAs match the working tree (no hand-retyped files)', () => {
  const manifest = JSON.parse(read('.repolore/manifest.json'));
  for (const { path, sha } of manifest.generatedFiles) {
    expect(git(['hash-object', path]) === sha, `drift in ${path}`);
  }
  return `${manifest.generatedFiles.length} files`;
});

check('wiki-check exits clean', () => { node(['.repolore/scripts/wiki-check.mjs']); });
check('index is current', () => { node(['.repolore/scripts/wiki-index.mjs', '--check']); });

check('overview page seeded, stamped, and cited', () => {
  const page = read('docs/wiki/architecture/overview.md');
  expect(!page.includes('RUN-wiki-stamp-TO-FILL'), 'page was not stamped');
  expect(/^\s*sha: [0-9a-f]{40}$/m.test(page), 'covers entries carry no real blob SHA');
  const cites = [...page.matchAll(/`([\w./-]+\.(?:ts|js|mjs|json|md|yml))(?::[\d-]+)?`/g)].map((m) => m[1]);
  expect(cites.length > 0, 'no inline citations found in the page body');
  const real = cites.filter((c) => existsSync(join(fixture, c)));
  expect(real.length > 0, `citations point at no existing file: ${cites.join(', ')}`);
  return `${cites.length} citation(s)`;
});

check('manifest entry for the overview is status: seeded', () => {
  const cfgRaw = read('docs/wiki/wiki.config.yml');
  const entry = cfgRaw.match(/- slug: architecture\/overview[\s\S]*?status: (\w+)/);
  expect(entry, 'architecture/overview missing from pages manifest');
  expect(entry[1] === 'seeded', `status is "${entry[1]}"`);
});

check('log.md has the birth entry', () => {
  expect(/^## \d{4}-\d{2}-\d{2} — /m.test(read('docs/wiki/log.md')), 'no dated journal line appended');
});

check('exactly one commit, conventional message, clean tree', () => {
  expect(commitsSinceBaseline() === 1, `${commitsSinceBaseline()} commit(s) after baseline — expected exactly 1`);
  const subject = git(['log', '-1', '--format=%s']);
  expect(/^docs: initialize repolore/.test(subject), `subject "${subject}"`);
  const dirty = git(['status', '--porcelain']);
  expect(dirty === '', `uncommitted leftovers:\n${dirty}`);
});

check('no init config file leaked into the repo', () => {
  for (const leak of ['init.json', '.repolore/init.json', 'repolore-init.json']) {
    expect(!existsSync(join(fixture, leak)), `${leak} committed into the repo`);
  }
});

if (scenario === 's1') {
  check('pointer block appended to root CLAUDE.md exactly once', () => {
    const text = read('CLAUDE.md');
    const count = (text.match(/## Project wiki \(LLM-maintained\)/g) ?? []).length;
    expect(count === 1, `${count} occurrence(s)`);
  });
  check('blank line separates the block (trailing-newline edge handled)', () => {
    const text = read('CLAUDE.md');
    expect(/\(feat:, fix:, docs:\)\n\n## Project wiki/.test(text),
      'heading not separated from prior content by exactly one blank line');
    expect(text.endsWith('\n'), 'file still lacks a trailing newline');
  });
  check('original CLAUDE.md content preserved', () => {
    expect(read('CLAUDE.md').includes('## Commit Message Guidelines'), 'pre-existing section lost');
  });
  check('repo commit conventions respected (no Co-Authored-By)', () => {
    const body = git(['log', '-1', '--format=%B']);
    expect(!/Co-Authored-By/i.test(body), 'commit carries a Co-Authored-By trailer the repo forbids');
  });
}

if (scenario === 's2') {
  check('no context file created uninvited', () => {
    for (const f of ['CLAUDE.md', 'AGENTS.md', '.github/copilot-instructions.md']) {
      expect(!existsSync(join(fixture, f)), `${f} was created without consent`);
    }
  });
}

console.log(failures ? `\n${failures} check(s) failed` : '\nall checks passed');
process.exit(failures ? 1 : 0);

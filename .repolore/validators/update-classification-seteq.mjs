#!/usr/bin/env node
/**
 * update-classification-seteq.mjs — REFERENCE user-space set-equality extractor.
 *
 * This is the worked example for the `set-validated` tier (the top of the flow
 * verification ladder, ADR-007). It rebuilds the step/edge/branch SET of
 * `docs/wiki/flows/update-classification.md` *from the code* and prints it as
 * JSON; `wiki-flow-check.mjs` set-compares that against the page's flow-meta and,
 * because the page sets `flow_asserts_complete: true`, turns any mismatch into a
 * HARD FAIL. That is the only check that catches an **omitted branch** — a new
 * disposition added to `update.mjs` that nobody wrote into the flow.
 *
 * WHY THIS LIVES IN USER SPACE (not vendored): set-equality needs to enumerate a
 * flow's real branches from code, which in the general case needs language-aware
 * parsing — the bake-off proved every AST engine is unaffordable for the ~30KB
 * vendored layer (web-tree-sitter ~752KB WASM; a Rust binary ~800KB/platform).
 * So it lives here, in the repo, free to use anything. This one stays Node-stdlib
 * because `update.mjs`'s dispositions are a CLOSED, statically-enumerable set —
 * every outcome is a `report.<key>.push(...)` call site — so a plain scan is
 * sound. Open-world request/async flows can't do this and honestly top out at
 * `branch-audited` (contract: references/flow.md §set-validated).
 *
 * Output contract (stdout, parsed by wiki-flow-check.mjs):
 *   { "steps": ["id", ...],
 *     "edges": [{"from":"a","to":"b"}],
 *     "branches": [{"at":"x","to":"y","condition":"..."}] }
 *
 * HONESTY LINE — what is derived vs. declared:
 *   • DERIVED from code: the disposition set (every `report.<key>.push` in
 *     update.mjs) → the classification steps and the classify→* branches. A new,
 *     unmapped `report.<key>.push` is emitted under its RAW key, so it lands as a
 *     step the flow lacks → omission → hard fail. That is the catch.
 *   • DECLARED (scaffold): invoke / classify / persist are the flow's structural
 *     spine, not dispositions; they are asserted present (their anchors must
 *     still occur in the code) but their ids are fixed here.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// repo root is two dirs up from .repolore/validators/ — robust to the caller's cwd.
// argv[2] overrides the source path (used by the tests to exercise the catch).
const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const srcPath = process.argv[2] || join(REPO_ROOT, 'scripts', 'update.mjs');
const src = readFileSync(srcPath, 'utf8');

// Each report.<key>.push disposition → the flow step it is schematically folded
// into. Keys NOT in this map are intentionally left to surface as unmapped (a
// new outcome the flow author has not yet accounted for).
const DISPOSITION_TO_STEP = {
  upToDate: 'up-to-date',
  manifestFixed: 'up-to-date',   // the "current==master but record lagged" sub-case
  restored: 'restore',
  updated: 'regenerate',
  skippedModified: 'skip-modified',
  needsReview: 'needs-review',
  unknown: 'needs-review',       // both null-master cases collapse into one step
  added: 'add-new',
};

// The structural spine: asserted-present anchors, fixed ids (see HONESTY LINE).
const SCAFFOLD = [
  { id: 'invoke', mustContain: null },                  // lives in references/update.md, not this file
  { id: 'classify', mustContain: 'if (current === masterSha)' },
  { id: 'persist', mustContain: 'process.exit(attention' },
];
for (const s of SCAFFOLD) {
  if (s.mustContain && !src.includes(s.mustContain)) {
    process.stderr.write(`scaffold step "${s.id}" anchor vanished from update.mjs: ${s.mustContain}\n`);
    process.exit(3); // a hard extractor error → degrades the tier, never silently passes
  }
}

// Scan the closed disposition set from the code.
const dispositions = [...src.matchAll(/report\.(\w+)\.push/g)].map((m) => m[1]);
const seen = new Set();
const stepSet = new Set(SCAFFOLD.map((s) => s.id));
const branchSet = new Map(); // at->to identity → branch object

for (const key of dispositions) {
  if (seen.has(key)) continue;
  seen.add(key);
  const step = DISPOSITION_TO_STEP[key] ?? key; // unmapped key surfaces under its raw name
  stepSet.add(step);
  const k = `classify->${step}`;
  if (!branchSet.has(k)) branchSet.set(k, { at: 'classify', to: step, condition: `disposition: report.${key}` });
}

const out = {
  steps: [...stepSet],
  edges: [{ from: 'invoke', to: 'classify' }, { from: 'classify', to: 'persist' }],
  branches: [...branchSet.values()],
};
process.stdout.write(JSON.stringify(out, null, 2) + '\n');

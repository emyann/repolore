/**
 * wiki-stamp.test.mjs — the inline flow `*_sha` stamping that 0.4.1 shipped
 * broken. The template + references/flow.md promise wiki-stamp fills every
 * `*_sha` (anchor_sha / call_anchor_sha / cite_sha) from its sibling `*_path`;
 * before the fix it only stamped `covers`, so a freshly authored flow page
 * failed wiki-flow-check on the WRITTEN-BY-wiki-stamp placeholders. These tests
 * pin: each sha adopts ITS OWN path's hash (no cross-item bleed), covers stays
 * handled, the pass is idempotent, and an orphan sha (no sibling path) is left
 * for flow-check to flag.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { PLUGIN, bootstrapped, node, git } from './_helpers.mjs';

const STAMP = join(PLUGIN, 'scripts', 'wiki-stamp.mjs');

const PAGE = `---
title: "Flow: sample"
summary: stamp fixture
category: flows
kind: explanation
flow_schema: flow-meta/v1
flow_scenario: "sample"
flow_steps:
  - id: one
    actor: x
    action: "a"
    anchor_path: src/a.ts
    anchor_sha: WRITTEN-BY-wiki-stamp
    anchor_match: "export const a"
  - id: two
    actor: x
    action: "b"
    anchor_path: src/services/billing.ts
    anchor_sha: WRITTEN-BY-wiki-stamp
    anchor_match: "export const svc"
flow_edges:
  - from: one
    to: two
    kind: call
    evidence: verified
    call_anchor_path: src/a.ts
    call_anchor_lines: 1
    call_anchor_sha: WRITTEN-BY-wiki-stamp
    call_match: "export const a"
    callee_token: "a"
flow_branches:
  - at: two
    to: one
    condition: "loops"
    kind: alt
    cite_path: src/routes/orders.ts
    cite_lines: 1
    cite_sha: WRITTEN-BY-wiki-stamp
    cite_match: "export const r"
covers:
  - path: src/a.ts
    sha: WRITTEN-BY-wiki-stamp
generated_at_commit: WRITTEN-BY-wiki-stamp
last_refreshed: WRITTEN-BY-wiki-stamp
---

body
`;

function writeFlowPage(dir, body) {
  mkdirSync(join(dir, 'docs', 'wiki', 'flows'), { recursive: true });
  const p = join(dir, 'docs', 'wiki', 'flows', 'sample.md');
  writeFileSync(p, body);
  return p;
}

test('wiki-stamp fills each inline flow *_sha from its own sibling *_path', (t) => {
  const dir = bootstrapped(t);
  const page = writeFlowPage(dir, PAGE);
  node(dir, [STAMP, page]);
  const out = readFileSync(page, 'utf8');

  const shaA = git(dir, ['hash-object', 'src/a.ts']);
  const shaSvc = git(dir, ['hash-object', 'src/services/billing.ts']);
  const shaR = git(dir, ['hash-object', 'src/routes/orders.ts']);
  assert.notEqual(shaA, shaSvc, 'fixture files must hash differently for this test to mean anything');

  // each *_sha adopts the hash of the path declared above it in the SAME item
  assert.match(out, new RegExp(`anchor_path: src/a\\.ts\\n    anchor_sha: ${shaA}`));
  assert.match(out, new RegExp(`anchor_path: src/services/billing\\.ts\\n    anchor_sha: ${shaSvc}`));
  assert.match(out, new RegExp(`call_anchor_sha: ${shaA}`));     // edge cites src/a.ts
  assert.match(out, new RegExp(`cite_sha: ${shaR}`));            // branch cites src/routes/orders.ts
  assert.ok(!out.includes('WRITTEN-BY-wiki-stamp'), 'no placeholder survives (covers + every *_sha filled)');
});

test('the flow-sha pass is idempotent — stamping an already-stamped page is a no-op', (t) => {
  const dir = bootstrapped(t);
  const page = writeFlowPage(dir, PAGE);
  node(dir, [STAMP, page]);
  const first = readFileSync(page, 'utf8');
  node(dir, [STAMP, page]);
  assert.equal(readFileSync(page, 'utf8'), first);
});

test('a *_sha with no sibling *_path in its item is left for flow-check to flag', (t) => {
  const dir = bootstrapped(t);
  // drop the edge's call_anchor_path: its call_anchor_sha must NOT adopt the
  // previous step item's anchor_path (the per-item reset guarantees this).
  const page = writeFlowPage(dir, PAGE.replace('    call_anchor_path: src/a.ts\n', ''));
  node(dir, [STAMP, page]);
  const out = readFileSync(page, 'utf8');
  assert.match(out, /call_anchor_sha: WRITTEN-BY-wiki-stamp/, 'orphan sha untouched, not cross-bled');
});

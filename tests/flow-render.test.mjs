// flow render projections — the same flow-meta renders as a flowchart (default)
// or a sequence diagram (flow_render: sequence). Verification is unchanged; this
// is purely a rendering choice.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFlowMeta } from '../scripts/lib.mjs';
import { renderMermaid, renderSequence, renderFlowchart } from '../scripts/wiki-flow-render.mjs';

const MULTI = `flow_schema: flow-meta/v1
flow_scenario: "place an order"
flow_render: sequence
flow_steps:
  - id: request
    actor: client
    action: "POST /order"
  - id: handle
    actor: api
    action: "validate and persist"
  - id: save
    actor: db
    action: "insert row"
flow_edges:
  - from: request
    to: handle
    kind: http
    evidence: inferred
  - from: handle
    to: save
    kind: db
    evidence: inferred
flow_branches:
  - at: handle
    to: request
    condition: "validation fails"
    kind: error
`;

test('flow_render: sequence projects actors→participants, edges→messages', () => {
  const m = parseFlowMeta(MULTI);
  assert.equal(m.render, 'sequence');
  const out = renderMermaid(m);
  assert.match(out, /^```mermaid\n%% generated from flow-meta/);
  assert.match(out, /\nsequenceDiagram\n/);
  // three distinct participants, first-appearance order
  assert.match(out, /participant p_client as client/);
  assert.match(out, /participant p_api as api/);
  assert.match(out, /participant p_db as db/);
  // messages between the from/to steps' actors, labelled by the invoked
  // (to-step) operation — the conventional sequence-message label
  assert.match(out, /p_client->>p_api: validate and persist/);
  assert.match(out, /p_api->>p_db: insert row/);
  // branch is a dashed message carrying its condition
  assert.match(out, /p_api-->>p_client: error: validation fails/);
  assert.doesNotMatch(out, /flowchart/);
});

test('default (no flow_render) projects a flowchart', () => {
  const m = parseFlowMeta(MULTI.replace('flow_render: sequence\n', ''));
  assert.equal(m.render, null);
  const out = renderMermaid(m);
  assert.match(out, /\nflowchart TD\n/);
  assert.doesNotMatch(out, /sequenceDiagram/);
});

test('renderSequence and renderFlowchart are deterministic (same input → same bytes)', () => {
  const m = parseFlowMeta(MULTI);
  assert.equal(renderSequence(m), renderSequence(m));
  assert.equal(renderFlowchart(m), renderFlowchart(m));
});

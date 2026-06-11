---
title: "Flow: bootstrap-vendoring — config to verified scaffold"
summary: How init turns an approved config into a verified vendored scaffold — the one mechanical shot, its spawned checks, and its error/dry-run branches.
category: flows
kind: explanation
audience: [dev]
read_when: "touching bootstrap.mjs, the init phase-5 vendoring step, or the flow-meta tooling"
flow_schema: flow-meta/v1
flow_scenario: "init turns an approved config into a verified vendored scaffold"
flow_trigger_kind: command
flow_trigger_anchor: references/init.md
flow_asserts_complete: false
flow_steps:
  - id: invoke
    actor: init-skill
    action: "Phase 5 invokes bootstrap.mjs with the approved config"
    anchor_path: references/init.md
    anchor_sha: 7b632f359b6b70b17b211f2da6687697ddcd7c3d
    anchor_match: "scripts/bootstrap.mjs --config"
  - id: run-bootstrap
    actor: bootstrap
    action: "Parse + validate config, then vendor the scaffold (skeleton, scripts, templates, manifest) in one shot"
    anchor_path: scripts/bootstrap.mjs
    anchor_sha: 42f64b261eb399c1de827b0485a126c325a70137
    anchor_match: "copyFileSync(join(PLUGIN_SCRIPTS"
  - id: generate-index
    actor: bootstrap
    action: "Spawn wiki-index.mjs to generate the catalog"
    anchor_path: scripts/bootstrap.mjs
    anchor_sha: 42f64b261eb399c1de827b0485a126c325a70137
    anchor_match: "wiki-index.mjs'"
  - id: verify
    actor: bootstrap
    action: "Spawn wiki-check + wiki-index --check; on failure abort"
    anchor_path: scripts/bootstrap.mjs
    anchor_sha: 42f64b261eb399c1de827b0485a126c325a70137
    anchor_match: "wiki-check.mjs'"
  - id: report-invalid
    actor: bootstrap
    action: "Invalid config: print problems and exit 2"
    anchor_path: scripts/bootstrap.mjs
    anchor_sha: 42f64b261eb399c1de827b0485a126c325a70137
    anchor_match: "if (problems.length) fail"
  - id: dry-run-preview
    actor: bootstrap
    action: "Dry-run: print in-scope counts, write nothing, exit 0"
    anchor_path: scripts/bootstrap.mjs
    anchor_sha: 42f64b261eb399c1de827b0485a126c325a70137
    anchor_match: "argv.includes('--dry-run')"
  - id: report-verify-fail
    actor: bootstrap
    action: "Verification failed after vendoring: report and exit 2"
    anchor_path: scripts/bootstrap.mjs
    anchor_sha: 42f64b261eb399c1de827b0485a126c325a70137
    anchor_match: "verification failed after vendoring"
flow_edges:
  - from: invoke
    to: run-bootstrap
    kind: call
    evidence: verified
    call_anchor_path: references/init.md
    call_anchor_lines: 151
    call_anchor_sha: 7b632f359b6b70b17b211f2da6687697ddcd7c3d
    call_match: "scripts/bootstrap.mjs --config"
    callee_token: "bootstrap.mjs"
  - from: run-bootstrap
    to: generate-index
    kind: call
    evidence: verified
    call_anchor_path: scripts/bootstrap.mjs
    call_anchor_lines: 252
    call_anchor_sha: 42f64b261eb399c1de827b0485a126c325a70137
    call_match: "join(scriptsDir, 'wiki-index.mjs')"
    callee_token: "wiki-index.mjs"
  - from: generate-index
    to: verify
    kind: call
    evidence: verified
    call_anchor_path: scripts/bootstrap.mjs
    call_anchor_lines: 254
    call_anchor_sha: 42f64b261eb399c1de827b0485a126c325a70137
    call_match: "join(scriptsDir, 'wiki-check.mjs')"
    callee_token: "wiki-check.mjs"
flow_branches:
  - at: run-bootstrap
    to: report-invalid
    condition: "problems.length > 0 (config invalid)"
    kind: error
    cite_path: scripts/bootstrap.mjs
    cite_lines: 111
    cite_sha: 42f64b261eb399c1de827b0485a126c325a70137
    cite_match: "if (problems.length) fail"
  - at: run-bootstrap
    to: dry-run-preview
    condition: "--dry-run flag present"
    kind: guard
    cite_path: scripts/bootstrap.mjs
    cite_lines: 61
    cite_sha: 42f64b261eb399c1de827b0485a126c325a70137
    cite_match: "argv.includes('--dry-run')"
  - at: verify
    to: report-verify-fail
    condition: "wiki-check / index --check throws"
    kind: error
    cite_path: scripts/bootstrap.mjs
    cite_lines: 258-259
    cite_sha: 42f64b261eb399c1de827b0485a126c325a70137
    cite_match: "verification failed after vendoring"
covers:
  - path: scripts/bootstrap.mjs
    sha: 42f64b261eb399c1de827b0485a126c325a70137
  - path: references/init.md
    sha: 7b632f359b6b70b17b211f2da6687697ddcd7c3d
generated_at_commit: e9c2194
last_refreshed: 2026-06-11
related: [decisions/adr-005-bootstrap-mechanical-vendoring, architecture/overview]
---

# Flow: bootstrap-vendoring — config to verified scaffold

> One named scenario: **init turns an approved config into a verified vendored
> scaffold.** This is the v1 dogfood flow page — the diagram and tables below
> the marker are *generated* from the `flow_*` frontmatter by
> `wiki-flow-render.mjs`; never hand-edit them. Anchors live in the tables, not
> the diagram (GitHub strips Mermaid links). See `references/flow.md` for the
> schema and the verification ladder.

## Scenario

After the plan-approval gate (init phase 4), all judgement is encoded in the
config file and the vendoring is one mechanical shot: `references/init.md`
phase 5 invokes `scripts/bootstrap.mjs`, which parses and validates the config,
creates the wiki skeleton, copies the vendored scripts, instantiates the
templated files, writes the blob-SHA manifest, then **spawns** `wiki-index.mjs`
and `wiki-check.mjs` to verify its own output before reporting. Two branches
divert the happy path: an invalid config aborts early, and `--dry-run` previews
the in-scope counts without writing.

<!-- FLOW-RENDER:START — generated from flow-meta; do not hand-edit (run wiki-flow-render.mjs) -->

```mermaid
%% generated from flow-meta — do not hand-edit
flowchart TD
  n_invoke["Phase 5 invokes bootstrap.mjs with the approved config"]
  n_run_bootstrap["Parse + validate config, then vendor the scaffold (skeleton, scripts, templates, manifest) in one shot"]
  n_generate_index["Spawn wiki-index.mjs to generate the catalog"]
  n_verify["Spawn wiki-check + wiki-index --check; on failure abort"]
  n_report_invalid["Invalid config: print problems and exit 2"]
  n_dry_run_preview["Dry-run: print in-scope counts, write nothing, exit 0"]
  n_report_verify_fail["Verification failed after vendoring: report and exit 2"]
  n_invoke -->|"call"| n_run_bootstrap
  n_run_bootstrap -->|"call"| n_generate_index
  n_generate_index -->|"call"| n_verify
  n_run_bootstrap -.->|"error: problems.length > 0 (config invalid)"| n_report_invalid
  n_run_bootstrap -.->|"guard: --dry-run flag present"| n_dry_run_preview
  n_verify -.->|"error: wiki-check / index --check throws"| n_report_verify_fail
```
| # | Step | Actor | Anchor |
|---|------|-------|--------|
| 1 | invoke — Phase 5 invokes bootstrap.mjs with the approved config | init-skill | `references/init.md` — `scripts/bootstrap.mjs --config` |
| 2 | run-bootstrap — Parse + validate config, then vendor the scaffold (skeleton, scripts, templates, manifest) in one shot | bootstrap | `scripts/bootstrap.mjs` — `copyFileSync(join(PLUGIN_SCRIPTS` |
| 3 | generate-index — Spawn wiki-index.mjs to generate the catalog | bootstrap | `scripts/bootstrap.mjs` — `wiki-index.mjs'` |
| 4 | verify — Spawn wiki-check + wiki-index --check; on failure abort | bootstrap | `scripts/bootstrap.mjs` — `wiki-check.mjs'` |
| 5 | report-invalid — Invalid config: print problems and exit 2 | bootstrap | `scripts/bootstrap.mjs` — `if (problems.length) fail` |
| 6 | dry-run-preview — Dry-run: print in-scope counts, write nothing, exit 0 | bootstrap | `scripts/bootstrap.mjs` — `argv.includes('--dry-run')` |
| 7 | report-verify-fail — Verification failed after vendoring: report and exit 2 | bootstrap | `scripts/bootstrap.mjs` — `verification failed after vendoring` |

**Edges** — each `verified` hop cites the call site in the caller and names the callee:

| From → To | Kind | Evidence | Call site | Callee |
|-----------|------|----------|-----------|--------|
| invoke → run-bootstrap | call | verified | `references/init.md:151` — `scripts/bootstrap.mjs --config` | `bootstrap.mjs` |
| run-bootstrap → generate-index | call | verified | `scripts/bootstrap.mjs:252` — `join(scriptsDir, 'wiki-index.mjs')` | `wiki-index.mjs` |
| generate-index → verify | call | verified | `scripts/bootstrap.mjs:254` — `join(scriptsDir, 'wiki-check.mjs')` | `wiki-check.mjs` |

**Branches** — alternative and error paths:

| At → To | Kind | Condition | Cited at |
|---------|------|-----------|----------|
| run-bootstrap → report-invalid | error | problems.length > 0 (config invalid) | `scripts/bootstrap.mjs:111` — `if (problems.length) fail` |
| run-bootstrap → dry-run-preview | guard | --dry-run flag present | `scripts/bootstrap.mjs:61` — `argv.includes('--dry-run')` |
| verify → report-verify-fail | error | wiki-check / index --check throws | `scripts/bootstrap.mjs:258-259` — `verification failed after vendoring` |

<!-- FLOW-RENDER:END -->

## Why these edges are `verified`

Each hop cites the **call site in the caller's own code** and names the callee:
`init.md` literally runs `bootstrap.mjs --config`; `bootstrap.mjs` literally
spawns `wiki-index.mjs` and `wiki-check.mjs`. The sequential operations *inside*
the vendoring (mkdir → copy → instantiate → manifest) are collapsed into the
`run-bootstrap` step deliberately — they are statement order, not calls, and a
flow page is schematic, not a line-by-line transcript (arc42 §6).

## Completeness

`flow_asserts_complete: false` — this page makes no claim that it captures
*every* branch of `bootstrap.mjs`. Set-equality completeness checking is
available as an opt-in user-space extractor (see `references/flow.md`); without
one registered, the page honestly tops out at `branch-audited` and the
omitted-branch heuristic is advisory only.

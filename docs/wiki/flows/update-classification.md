---
title: "Flow: update-classification — the (recorded, current, master) triplet"
summary: How update classifies every tracked file from its (recorded, current, master) SHA triplet into one safe action — and never overwrites a local edit by default.
category: flows
kind: explanation
audience: [dev]
read_when: "touching update.mjs, the manifest-SHA safety model, or the verification-ladder tooling"
flow_schema: flow-meta/v1
flow_scenario: "update classifies each tracked file from its (recorded, current, master) SHA triplet and applies the one safe action"
flow_trigger_kind: command
flow_trigger_anchor: references/update.md
flow_render: flowchart
flow_asserts_complete: true
flow_steps:
  - id: invoke
    actor: update-skill
    action: "The update workflow's apply step runs update.mjs (after the dry-run was shown and consented)"
    anchor_path: references/update.md
    anchor_sha: ab8931adfd0da4955b530fc14d52850cac6e45f4
    anchor_match: "scripts/update.mjs"
  - id: classify
    actor: update
    action: "Per tracked file: hash the master content (git hash-object) and compare the (recorded=entry.sha, current, master) SHA triplet"
    anchor_path: scripts/update.mjs
    anchor_sha: fc40aa31135e5138253eb1cff3172dd021bc31d1
    anchor_match: "if (current === masterSha)"
  - id: up-to-date
    actor: update
    action: "current == master: leave the file; if the manifest SHA lagged, fix only the record (no rewrite)"
    anchor_path: scripts/update.mjs
    anchor_sha: fc40aa31135e5138253eb1cff3172dd021bc31d1
    anchor_match: "report.manifestFixed.push"
  - id: restore
    actor: update
    action: "File missing: write the master and record its SHA"
    anchor_path: scripts/update.mjs
    anchor_sha: fc40aa31135e5138253eb1cff3172dd021bc31d1
    anchor_match: "report.restored.push"
  - id: regenerate
    actor: update
    action: "Pristine-but-outdated (current == recorded) or --force: overwrite with the master and re-record"
    anchor_path: scripts/update.mjs
    anchor_sha: fc40aa31135e5138253eb1cff3172dd021bc31d1
    anchor_match: "report.updated.push"
  - id: skip-modified
    actor: update
    action: "Locally modified (current != recorded and != master): skip and print the git diff / --force <path> hint"
    anchor_path: scripts/update.mjs
    anchor_sha: fc40aa31135e5138253eb1cff3172dd021bc31d1
    anchor_match: "report.skippedModified.push"
  - id: needs-review
    actor: update
    action: "master unavailable: AGENTS.md whose '## Scope' can't be located → REVIEW; a path this version no longer vendors → unknown (both skipped)"
    anchor_path: scripts/update.mjs
    anchor_sha: fc40aa31135e5138253eb1cff3172dd021bc31d1
    anchor_match: "report.needsReview.push"
  - id: add-new
    actor: update
    action: "Second pass: vendor scripts/_templates this version adds that the manifest predates — write and append a manifest entry"
    anchor_path: scripts/update.mjs
    anchor_sha: fc40aa31135e5138253eb1cff3172dd021bc31d1
    anchor_match: "report.added.push"
  - id: persist
    actor: update
    action: "Write the manifest (refreshed SHAs + pluginVersion); exit 1 if any skipped/needs-review items remain, else 0"
    anchor_path: scripts/update.mjs
    anchor_sha: fc40aa31135e5138253eb1cff3172dd021bc31d1
    anchor_match: "process.exit(attention"
flow_edges:
  - from: invoke
    to: classify
    kind: call
    evidence: verified
    call_anchor_path: references/update.md
    call_anchor_lines: 41
    call_anchor_sha: ab8931adfd0da4955b530fc14d52850cac6e45f4
    call_match: "scripts/update.mjs"
    callee_token: "update.mjs"
  - from: classify
    to: persist
    kind: call
    evidence: inferred
flow_branches:
  - at: classify
    to: up-to-date
    condition: "current === masterSha (already the installed version)"
    kind: guard
    cite_path: scripts/update.mjs
    cite_lines: 134
    cite_sha: fc40aa31135e5138253eb1cff3172dd021bc31d1
    cite_match: "if (current === masterSha)"
  - at: classify
    to: restore
    condition: "file missing (!exists)"
    kind: alt
    cite_path: scripts/update.mjs
    cite_lines: 137
    cite_sha: fc40aa31135e5138253eb1cff3172dd021bc31d1
    cite_match: "} else if (!exists) {"
  - at: classify
    to: regenerate
    condition: "current === recorded sha, or --force <path>"
    kind: alt
    cite_path: scripts/update.mjs
    cite_lines: 140
    cite_sha: fc40aa31135e5138253eb1cff3172dd021bc31d1
    cite_match: "current === entry.sha || forced.has(rel)"
  - at: classify
    to: skip-modified
    condition: "current != recorded and != master — a local edit (overwriting is never the default)"
    kind: error
    cite_path: scripts/update.mjs
    cite_lines: 144-146
    cite_sha: fc40aa31135e5138253eb1cff3172dd021bc31d1
    cite_match: "locally modified"
  - at: classify
    to: needs-review
    condition: "masterContent is null — AGENTS.md scope unlocatable, or a path no longer vendored"
    kind: error
    cite_path: scripts/update.mjs
    cite_lines: 127-129
    cite_sha: fc40aa31135e5138253eb1cff3172dd021bc31d1
    cite_match: "if (master === null)"
  - at: classify
    to: add-new
    condition: "in VENDORED_SCRIPTS/_templates but no manifest entry — new in this version"
    kind: normal
    cite_path: scripts/update.mjs
    cite_lines: 154
    cite_sha: fc40aa31135e5138253eb1cff3172dd021bc31d1
    cite_match: "if (manifest.generatedFiles.some((f) => f.path === rel)) continue;"
covers:
  - path: scripts/update.mjs
    sha: fc40aa31135e5138253eb1cff3172dd021bc31d1
  - path: references/update.md
    sha: ab8931adfd0da4955b530fc14d52850cac6e45f4
generated_at_commit: 8ecfc10
last_refreshed: 2026-06-12
related: [flows/bootstrap-vendoring, decisions/adr-001-blob-sha-freshness-anchors, decisions/adr-002-computed-status]
---

# Flow: update-classification — the (recorded, current, master) triplet

> One named scenario: **update classifies each tracked file from its
> (recorded, current, master) SHA triplet and applies the one safe action.**
> The diagram + tables below the marker are *generated* from the `flow_*`
> frontmatter by `wiki-flow-render.mjs` — never hand-edit them. Anchors live in
> the tables, not the diagram. Schema + ladder: `references/flow.md`.

## Scenario

`update.mjs` exists to bring a repo's vendored repolore layer up to the
installed plugin version **without ever clobbering a deliberate local edit**.
The safety comes from one recorded fact: `.repolore/manifest.json` stores the
git **blob SHA** each vendored file had when it was last written (ADR-001). For
every tracked file the script forms a triplet — `recorded` (the manifest's
`entry.sha`), `current` (the working-tree blob), and `master` (the installed
plugin's copy, hashed on the fly with `git hash-object`) — and the *relationship
between the three* fully determines the action. No diffs, no heuristics: a file
is touched only when the triplet proves it is safe to.

The decision (`classify`) forks six ways: already-current (record fixed if it
lagged), missing (restored), pristine-but-outdated (regenerated), **locally
modified (skipped** — the user must opt in with `--force <path>`), master
unavailable (reported for review), and a sibling pass for scripts/templates this
version adds that the manifest predates entirely (added). After the per-file
loop the refreshed manifest and `pluginVersion` are written, and the exit code
reflects whether any skip/review items still need a human.

<!-- FLOW-RENDER:START — generated from flow-meta; do not hand-edit (run wiki-flow-render.mjs) -->

```mermaid
%% generated from flow-meta — do not hand-edit
flowchart TD
  n_invoke["The update workflow's apply step runs update.mjs (after the dry-run was shown and consented)"]
  n_classify["Per tracked file: hash the master content (git hash-object) and compare the (recorded=entry.sha, current, master) SHA triplet"]
  n_up_to_date["current == master: leave the file; if the manifest SHA lagged, fix only the record (no rewrite)"]
  n_restore["File missing: write the master and record its SHA"]
  n_regenerate["Pristine-but-outdated (current == recorded) or --force: overwrite with the master and re-record"]
  n_skip_modified["Locally modified (current != recorded and != master): skip and print the git diff / --force <path> hint"]
  n_needs_review["master unavailable: AGENTS.md whose '## Scope' can't be located → REVIEW; a path this version no longer vendors → unknown (both skipped)"]
  n_add_new["Second pass: vendor scripts/_templates this version adds that the manifest predates — write and append a manifest entry"]
  n_persist["Write the manifest (refreshed SHAs + pluginVersion); exit 1 if any skipped/needs-review items remain, else 0"]
  n_invoke -->|"call"| n_classify
  n_classify -->|"call (inferred)"| n_persist
  n_classify -.->|"guard: current === masterSha (already the installed version)"| n_up_to_date
  n_classify -.->|"alt: file missing (!exists)"| n_restore
  n_classify -.->|"alt: current === recorded sha, or --force <path>"| n_regenerate
  n_classify -.->|"error: current != recorded and != master — a local edit (overwriting is never the default)"| n_skip_modified
  n_classify -.->|"error: masterContent is null — AGENTS.md scope unlocatable, or a path no longer vendored"| n_needs_review
  n_classify -.->|"normal: in VENDORED_SCRIPTS/_templates but no manifest entry — new in this version"| n_add_new
```
| # | Step | Actor | Anchor |
|---|------|-------|--------|
| 1 | invoke — The update workflow's apply step runs update.mjs (after the dry-run was shown and consented) | update-skill | `references/update.md` — `scripts/update.mjs` |
| 2 | classify — Per tracked file: hash the master content (git hash-object) and compare the (recorded=entry.sha, current, master) SHA triplet | update | `scripts/update.mjs` — `if (current === masterSha)` |
| 3 | up-to-date — current == master: leave the file; if the manifest SHA lagged, fix only the record (no rewrite) | update | `scripts/update.mjs` — `report.manifestFixed.push` |
| 4 | restore — File missing: write the master and record its SHA | update | `scripts/update.mjs` — `report.restored.push` |
| 5 | regenerate — Pristine-but-outdated (current == recorded) or --force: overwrite with the master and re-record | update | `scripts/update.mjs` — `report.updated.push` |
| 6 | skip-modified — Locally modified (current != recorded and != master): skip and print the git diff / --force <path> hint | update | `scripts/update.mjs` — `report.skippedModified.push` |
| 7 | needs-review — master unavailable: AGENTS.md whose '## Scope' can't be located → REVIEW; a path this version no longer vendors → unknown (both skipped) | update | `scripts/update.mjs` — `report.needsReview.push` |
| 8 | add-new — Second pass: vendor scripts/_templates this version adds that the manifest predates — write and append a manifest entry | update | `scripts/update.mjs` — `report.added.push` |
| 9 | persist — Write the manifest (refreshed SHAs + pluginVersion); exit 1 if any skipped/needs-review items remain, else 0 | update | `scripts/update.mjs` — `process.exit(attention` |

**Edges** — each `verified` hop cites the call site in the caller and names the callee:

| From → To | Kind | Evidence | Call site | Callee |
|-----------|------|----------|-----------|--------|
| invoke → classify | call | verified | `references/update.md:41` — `scripts/update.mjs` | `update.mjs` |
| classify → persist | call | inferred | — | — |

**Branches** — alternative and error paths:

| At → To | Kind | Condition | Cited at |
|---------|------|-----------|----------|
| classify → up-to-date | guard | current === masterSha (already the installed version) | `scripts/update.mjs:134` — `if (current === masterSha)` |
| classify → restore | alt | file missing (!exists) | `scripts/update.mjs:137` — `} else if (!exists) {` |
| classify → regenerate | alt | current === recorded sha, or --force <path> | `scripts/update.mjs:140` — `current === entry.sha || forced.has(rel)` |
| classify → skip-modified | error | current != recorded and != master — a local edit (overwriting is never the default) | `scripts/update.mjs:144-146` — `locally modified` |
| classify → needs-review | error | masterContent is null — AGENTS.md scope unlocatable, or a path no longer vendored | `scripts/update.mjs:127-129` — `if (master === null)` |
| classify → add-new | normal | in VENDORED_SCRIPTS/_templates but no manifest entry — new in this version | `scripts/update.mjs:154` — `if (manifest.generatedFiles.some((f) => f.path === rel)) continue;` |

<!-- FLOW-RENDER:END -->

## Notes

**Why one edge is `verified` and the rest of the structure is branches.** The
only genuine *call* in this flow is the trigger: `references/update.md` literally
runs `update.mjs` (cited in the caller's own text, naming the callee — the
directional grade). Everything `update.mjs` does internally is a **decision
tree**, not a call chain, so the six outcomes are modelled as `flow_branches`
off `classify`, each citing the exact `if`/`else` fork in the code. The
`classify → persist` hop is honest statement-sequence (the manifest is written
after the loop), so it is marked `inferred` rather than dressed up as a call —
the ladder's whole point (`references/flow.md`). One verified of two edges keeps
the page above the sub-50% evidence floor that would otherwise cap it at
`structural`.

**`add-new` is a second pass, shown as a sibling outcome.** It is not literally
a branch *inside* the per-file `if/else`; it is a separate loop (`update.mjs`
after the classification loop) over `VENDORED_SCRIPTS` / `_templates` entries the
manifest has no record of. It is drawn as a `normal` fork of `classify` because,
schematically (arc42 §6), it is the sixth kind of change update applies — the
case with *no recorded SHA at all*. The cited line is the guard that decides
add-vs-skip.

## Completeness

`flow_asserts_complete: true` — this page reaches the top **`set-validated`**
tier. Because `update.mjs` is a closed world (every disposition is a
`report.<key>.push` call site), a user-space set-equality extractor rebuilds the
outcome set straight from the code and `wiki-flow-check.mjs` set-compares it
against the six branches above. The extractor is
[`.repolore/validators/update-classification-seteq.mjs`](../../../.repolore/validators/update-classification-seteq.mjs),
registered under `validators:` in `wiki.config.yml` (ADR-007 / `references/flow.md`).
With `flow_asserts_complete: true`, a **new disposition added to `update.mjs`
that nobody writes into this flow becomes a hard failure** — the only check that
catches an omitted branch. This is repolore's reference extractor: the worked
example a target repo copies for its own closed-world tool flows (open-world
request/async flows honestly stay at `branch-audited`).

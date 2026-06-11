---
title: "ADR-007: Flow verification — data-first, directional edges, vendored ladder + user-space set-equality"
summary: A flow is generated from structured flow-meta; the vendored stdlib owns structural→branch-audited with DIRECTIONAL edge citations, and set-equality completeness lives in user space (proven non-vendorable by a build-off).
category: decisions
kind: decision
audience: [dev]
read_when: "building or questioning the flow tooling, the verification tiers, or where set-equality belongs"
status: accepted
date: 2026-06-11
supersedes: ~
superseded_by: ~
covers:
  - path: scripts/wiki-flow-check.mjs
    sha: ee1144be14eb6e8200a1d176e22ebeea5597c5fd
  - path: scripts/wiki-flow-render.mjs
    sha: 96509d1e9704e938cc1a2790daef68fc599f82a2
generated_at_commit: 22ee06d
last_refreshed: 2026-06-11
related: [decisions/adr-001-blob-sha-freshness-anchors, decisions/adr-002-computed-status, decisions/adr-003-stdlib-only-vendored-scripts, decisions/adr-006-vendored-tooling]
---

# ADR-007: Flow verification — placement and the directional ladder

## Context

Flows are the hardest wiki artifact: a flow asserts *ordered runtime behaviour*
(`edges and sequence`), the exact thing LLMs are weakest at, and citation/anchor
checks catch fabrication and rot but **not absence** (`docs/RESEARCH-FLOWS.md`
§1, §6.1). The design space — how to encode flow-meta, how to verify edges, and
whether to use heavier machinery (AST extractors, Rust, tree-sitter) — was
settled by an adversarial build-off: five approaches built as real prototypes in
isolated worktrees, each judged by a correctness-breaker and a doctrine auditor
(`docs/RESEARCH-FLOWS.md` §5; the tournament synthesis). Two findings forced this
record.

**Finding 1 — every approach shared one hole.** A citation proves bytes *exist*
at a location, never that the **A→B hop is real**; a fabricated or reversed edge
dressed as an import line shipped green in all five prototypes.

**Finding 2 — set-equality is the only catch for omitted branches, and it cannot
be vendored.** The tree-sitter prototype needed ~752KB of opaque per-language
WASM (5.7MB installed); the Rust prototype an ~800KB per-platform binary — both
dwarf the entire ~30KB readable-JS vendored surface and breach ADR-003
(node+git stdlib) and ADR-006 (bare-checkout, offline).

## Decision

**A flow is structured data (`flow-meta`) from which the Mermaid diagram and
tables are generated — never the reverse** (`scripts/wiki-flow-render.mjs`). The
emitter writes a GitHub-safe subset into a delimited region; an exclusive
regenerate-and-diff equality check rejects any hand-edited or second diagram.
Encoding is line-parseable in the `parseCovers` shape (ADR-003), parsed by one
added primitive (`listOfMaps`/`parseFlowMeta` in `scripts/lib.mjs`). The typed
record is also emitted as a JSON sidecar for a future lore-builder.

**The vendored stdlib owns `structural → anchored → edge-cited → branch-audited`**
(`scripts/wiki-flow-check.mjs`), with the tier **computed per run, never
committed** (ADR-002). The fix for Finding 1 is **directional edge-citation**:
a `verified` edge must cite the call site **inside the from-step's own code**
(`call_anchor_path` equals the from-step `anchor_path`), within a bounded span
(≤40 lines, killing the whole-file-const dodge), and that span must contain
**both** `call_match` and the `callee_token`. Uncitable hops are honestly
`inferred`; a sub-50% `verified` ratio caps the tier at `structural`.

**Set-equality (`set-validated`) lives in USER SPACE** — Finding 2 — dispatched
through a `validators:` seam in `wiki.config.yml`, run by the vendored harness,
its **absence degrading the tier to `branch-audited`, never failing** (the
ADR-006 trust model: vendored checks must survive on a bare checkout).
`flow_asserts_complete: true` is a hard fail only when an extractor actually ran.

## Consequences

- The vendored flow layer stays node+git stdlib, offline, ~two added scripts;
  no AST engine, WASM, or compiled binary ever ships in a target repo.
- `edge-cited` is honest about its ceiling: it proves the caller's code names the
  callee at a bounded site — strong, but existence-grade. Directional anchoring
  was **new in v1** (no prototype built it) and is adversarially gated by
  `tests/flow-check-adversarial.test.mjs` (fabrication, rot, non-directional
  edge, whole-file span, all-inferred, region drift, second diagram).
- **Omitted branches remain generally unsolved**: without a registered extractor
  they are only advisorily warned (a window-bounded lexical heuristic, false-
  negative-prone). Set-equality is sound only in closed worlds (single-file/
  statically-enumerable tool & infra flows); open-world request/async flows top
  out at `branch-audited` for everyone.
- Bounded span width (40), the verified-ratio cap, and the directional rule may
  hit authorability on sketch/cross-file flows; `inferred` + `flow_asserts_complete:
  false` is the sanctioned honest escape.
- Deferred to v0.4 (per `docs/RESEARCH-FLOWS.md` §5.5): shipping reference
  extractors and the diff-scoped flow-refresh step. The `validators:` seam is
  built and degrades correctly now.

## Alternatives rejected

- **JSON-fence encoding** (stdlib `JSON.parse`, no hand-rolled parser): better
  parser, worse hand-authorability and git diffs; its typed-tree idea is kept as
  the lore-builder sidecar, not the page encoding.
- **Vendored AST extractor (tree-sitter / Rust)**: proven unaffordable for the
  vendored surface (Finding 2); correct home is user space.
- **Pluggable harness as the whole answer**: the seam is adopted, but it shipped
  branch citations unverified and set-eq over happy-path only — the vendored core
  had to be hardened (directional edges, branch citations at edge-cited grade)
  regardless.

<!-- Dual mutability: once status: accepted, NEVER rewrite this record.
When the decision changes, write a new ADR, set its `supersedes`, and set
`superseded_by` here. -->

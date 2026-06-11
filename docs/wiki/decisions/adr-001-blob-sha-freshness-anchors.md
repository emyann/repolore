---
title: "ADR-001: Use git blob SHAs as freshness anchors — never LLM judgment"
summary: Git blob SHAs drive staleness detection; LLM judgment is never the trigger.
category: decisions
kind: decision
audience: [dev]
read_when: "changing how staleness is detected, or tempted to let an LLM decide what is stale"
status: accepted
date: 2026-06-10
supersedes: ~
superseded_by: ~
covers:
  - path: scripts/wiki-check.mjs
    sha: b2cf4eea1c245f35f1ec4003e2b7b217e890ec00
  - path: scripts/lib.mjs
    sha: e95973935e04c2cb9b3fac373f1f431fd7def616
generated_at_commit: 22ee06d
last_refreshed: 2026-06-11
related: [decisions/adr-002-computed-status, concepts/freshness-model]
---

# ADR-001: Use git blob SHAs as freshness anchors — never LLM judgment

## Context

LLMs have a measured, systematic blind spot for *implementation drift*: when
only the code changes while documentation text stays plausible, detection
drops by 7–42 percentage points (arXiv 2604.03447, cited in
`docs/RESEARCH.md` §5c). Every auto-wiki that relied on model judgment or
wholesale regeneration (DeepWiki's opaque lag, Google Code Wiki's per-commit
rewrites) lost reader trust. Alternatives considered: line ranges (rot —
CodeTour "tour decay"), symbol anchors (per-language tooling, miss body
changes), embeddings (nondeterministic, patent-adjacent — SAP US10977031B2).

## Decision

Every page lists the files it distils in `covers:` with the git blob SHA
each had when the page was verified. Staleness = re-hash and compare —
`blobSha()` wraps `git hash-object` (`scripts/lib.mjs`), and
`scripts/wiki-check.mjs` classifies pages fresh/stale/unmanaged/malformed
from that comparison alone. SHAs are written only by `wiki-stamp.mjs`, never
by hand. The recorded SHA doubles as an exact diff baseline:
`git diff <recorded> <current>` reconstructs precisely what changed since
verification (`references/refresh.md`).

## Consequences

- Staleness detection is free, offline, language-agnostic, deterministic.
- Byte-coarse: cosmetic churn flags pages (the no-op/re-stamp triage in
  `references/refresh.md` is the mitigation); semantic wrongness behind
  unchanged bytes is NOT caught — that is a separate, honestly-documented
  drift class (a future audit workflow).
- LLM spend happens only *after* a deterministic trigger, on a precise diff.

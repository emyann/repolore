---
title: "ADR-002: Freshness status is computed on demand, never committed"
summary: Freshness status is computed on demand, never written to the tracked tree.
category: decisions
kind: decision
audience: [dev]
read_when: "tempted to add a status:/last_checked: field or commit check results"
status: accepted
date: 2026-06-10
supersedes: ~
superseded_by: ~
covers:
  - path: scripts/wiki-check.mjs
    sha: b2cf4eea1c245f35f1ec4003e2b7b217e890ec00
  - path: scripts/wiki-stamp.mjs
    sha: 670c72deed77d68517c5a55951bf946627c32038
generated_at_commit: e9c2194
last_refreshed: 2026-06-11
related: [decisions/adr-001-blob-sha-freshness-anchors, concepts/freshness-model]
---

# ADR-002: Freshness status is computed on demand, never committed

## Context

The production reference implementation that preceded repolore committed
tooling-owned `status:`/`last_checked:` frontmatter. Observed failure modes
(`docs/RESEARCH.md` §4): every check dirtied the working tree, the fields
were merge-conflict magnets, and "status: fresh" could be stale-in-reality
on any other clone. Recomputing takes well under a second, so cached state
carries no durable information worth versioning.

## Decision

No freshness state is ever written to tracked files. `wiki-check.mjs`
recomputes fresh/stale/unmanaged/malformed from `covers` SHAs on every run
and only prints; legacy `status: fresh|stale|unmanaged` or `last_checked:`
fields are actively flagged for deletion (`scripts/wiki-check.mjs:50`). The
durable, reader-visible signal is different and written at *refresh* time,
not check time: `generated_at_commit` + `last_refreshed`, stamped by
`wiki-stamp.mjs`.

## Consequences

- Clean trees: checking is always side-effect-free; no merge conflicts over
  volatile fields.
- The lifecycle `status:` field on decision records (proposed/accepted/
  superseded) is unaffected — it records human intent, not computed state.
- Anything that wants committed freshness (a README badge, a dashboard) must
  derive it as a *generated artifact* with a drift check, like `index.md`.

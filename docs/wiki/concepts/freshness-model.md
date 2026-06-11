---
title: The freshness model
summary: fresh/stale/unmanaged/malformed semantics, covers lists, and the coverage inversion.
category: concepts
kind: explanation
audience: [dev]
read_when: "interpreting wiki-check or wiki-coverage output, or changing freshness/coverage semantics"
covers:
  - path: scripts/wiki-check.mjs
    sha: 9010753e72c1ad87d86a165f4f296cc7618d731c
  - path: scripts/wiki-coverage.mjs
    sha: defc70c4060d7a2282cde9f4c209c19cae438070
  - path: scripts/wiki-stamp.mjs
    sha: 670c72deed77d68517c5a55951bf946627c32038
  - path: scripts/lib.mjs
    sha: f3edf71392e5f140060e95cb641319a89e403428
generated_at_commit: 4f05eb2
last_refreshed: 2026-06-11
related: [decisions/adr-001-blob-sha-freshness-anchors, decisions/adr-002-computed-status]
---

# The freshness model

> How a repolore wiki knows it is telling the truth — and the two blind
> spots it openly admits to.

## The four computed states

`wiki-check.mjs` classifies every page on every run (nothing is cached or
committed — see ADR-002):

- **fresh** — every `covers` entry's recorded blob SHA still matches
  `git hash-object` of the file today (`scripts/wiki-check.mjs:52-62`).
- **stale** — at least one covered file changed, was deleted, or carries no
  recorded SHA. The report names *which* file and why.
- **unmanaged** — the page has no `covers` list at all
  (`scripts/wiki-check.mjs:53`): its staleness cannot be detected, which
  defeats the point. An honest third state, not an error.
- **malformed** — frontmatter won't parse; the page is excluded from the
  index until repaired.

Stale ≠ wrong: it means *unverified since the source moved*. The recorded
SHA doubles as the exact diff baseline (`git diff <recorded> <current>`)
that drives refresh triage — no-op / targeted edit / rewrite.

## Stamping is blessing

`wiki-stamp.mjs` is the only writer of SHAs, `generated_at_commit`, and
`last_refreshed`. Stamping asserts "this prose reflects the code as it is
right now" — its own header warns that `--all` re-blesses wholesale and is
only safe after a full audit (`scripts/wiki-stamp.mjs:16-19`). Stamp after
refreshing content, never instead of it.

## The coverage inversion

Freshness only re-hashes files a page already lists — it is structurally
blind to files **no page covers**. `wiki-coverage.mjs` inverts the question:
enumerate in-scope sources (scope globs + the shared walk in
`scripts/lib.mjs` `collectInScopeSources`, with default source extensions,
prune dirs, and test/config noise filters) and report what nothing covers,
grouped by directory, flagging «page-worthy» clusters (routes/, services/…).
`--since <ref>` narrows to files added since a ref — the new-feature→new-page
nudge. Coverage always exits 0: it is an audit aid, never a gate
(`scripts/wiki-coverage.mjs:25`).

## Plan reconciliation (the third lens)

Since v0.2.2, `wiki-check.mjs` also reads the page plan (`pages:` in
`wiki.config.yml`) and reports the backlog (written/waiting counts with a
draft-on-demand prompt) plus plan↔reality drift: seeded-but-missing,
drafted-but-still-planned, written-but-unplanned. Informational only — plan
findings never change the exit code.

## What the model deliberately cannot catch

- **Byte-coarse**: cosmetic churn flags pages (the no-op re-stamp is the
  cheap path); a one-line semantic change and a whitespace change look the
  same to a hash.
- **Wrongness behind unchanged bytes**: a claim that was never true stays
  "fresh" forever. That is a different drift class, owned by a future audit
  workflow — not by hashes.

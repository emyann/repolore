---
title: The freshness model
summary: fresh/stale/unmanaged/malformed semantics, covers lists, and the coverage inversion.
category: concepts
kind: explanation
audience: [dev]
read_when: "interpreting wiki-check or wiki-coverage output, or changing freshness/coverage semantics"
covers:
  - path: scripts/wiki-check.mjs
    sha: b2cf4eea1c245f35f1ec4003e2b7b217e890ec00
  - path: scripts/wiki-coverage.mjs
    sha: defc70c4060d7a2282cde9f4c209c19cae438070
  - path: scripts/wiki-stamp.mjs
    sha: 670c72deed77d68517c5a55951bf946627c32038
  - path: scripts/lib.mjs
    sha: 8d53936f8c23830fdae18a1187c171ab24ec8de9
  - path: scripts/wiki-hook.mjs
    sha: b8ea5b5dfff094a42bdae269558fa6f8b51c575a
  - path: scripts/wiki-install-hook.mjs
    sha: ec6892d6c8900675421ad1e39beddcdc88c9e135
generated_at_commit: e9c2194
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

## When the checks run

On demand via the check workflow — and, per contributor who opts in,
automatically after every commit: `wiki-hook.mjs` runs the freshness check
plus the new-page nudge (`--since HEAD~1 --page-worthy`), prints only when
something needs attention, and ALWAYS exits 0 (blocking gates get
uninstalled — the contract is stated in `scripts/wiki-hook.mjs`).
`wiki-install-hook.mjs` installs it chaining-safely: appends a marker block
to any existing post-commit hook and respects `core.hooksPath`. Hooks are
not cloned with repos, so each contributor opts in once.

## What the model deliberately cannot catch

- **Byte-coarse**: cosmetic churn flags pages (the no-op re-stamp is the
  cheap path); a one-line semantic change and a whitespace change look the
  same to a hash.
- **Wrongness behind unchanged bytes**: a claim that was never true stays
  "fresh" forever. That is a different drift class, owned by a future audit
  workflow — not by hashes.

`flows/` pages add a second, orthogonal axis on top of fresh/stale: a computed
**verification tier** (`structural → anchored → edge-cited → branch-audited →
set-validated`) run by `wiki-flow-check.mjs` and folded into `wiki-check`. Same
principle — computed per run, never committed (ADR-002) — but it grades whether
a flow's *edges* are cited, not just whether covered files moved
(see [adr-007](../decisions/adr-007-verification-ladder-placement.md)).

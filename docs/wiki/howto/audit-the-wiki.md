---
title: "How to audit the wiki (and triage the findings inbox)"
summary: Running the Journal-Clock Audit — per-claim verification of fresh pages against the code, the strict `audited` log line that is the only record, and the four-exit findings triage.
category: howto
kind: how-to
audience: [dev]
read_when: "check's dust line reports never-audited or overdue pages, FINDINGS.md has items awaiting triage, or you suspect a fresh page is wrong"
covers:
  - path: references/audit.md
    sha: 57ca379e0cb3bed127554a7e78bf43bfb6ff1410
generated_at_commit: 8b4e9fb
last_refreshed: 2026-06-12
related: [decisions/adr-010-audit-evidence-contract, decisions/adr-009-findings-inbox-contract, concepts/freshness-model]
---

# How to audit the wiki

> Freshness proves the *bytes* a page cites haven't moved; the audit proves
> the *claims* are true. It owns the drift class hashes can't see —
> wrongness behind unchanged bytes — which is live, not hypothetical: the
> design tournament found a fresh-stamped page here claiming "five masters"
> where there were ten (`docs/RESEARCH-AUDIT.md` §1).

## When

- The check workflow's **dust line** reports pages never audited or audited
  past the horizon (default 90 days — tune via the `audit:` block in
  `wiki.config.yml`).
- `FINDINGS.md` has items awaiting triage (Phase T runs standalone).
- On demand: `/repolore:audit` (plugin) or "audit the wiki" (umbrella
  skill), optionally naming pages or raising K.

## What a session does

The full contract is `references/audit.md` (plugin-side; single source).
Shape: pick the K oldest-audited fresh pages (never-audited first — the
clock is the `audited` line in `log.md`, so refresh re-stamps never reset
it); per page, verdict **every** concrete claim — CONFIRMED only on
entailment, REFUTED with counter-evidence, UNVERIFIED with its cause —
under a hard evidence budget (≤3x page bytes). Universal claims
(always/never/only) get the negative-space rule: grep the deciding tokens;
a comment is never entailment. Wrong pages are fixed in the same change
(code wins); code≠intent discoveries go to `FINDINGS.md` (one line, v2
grammar with the invisible SHA anchor); accepted ADRs get dated
`Correction:` bullets, never rewrites.

## The one record

A page is blessed by exactly one journal line — strict grammar, one page
per line, never batched:

```
## 2026-06-12 — audited concepts/freshness-model (12 claims: 11 confirmed, 1 fixed; 0 findings)
```

That line asserts every claim was individually verdicted (appending it
otherwise is audit-by-rote). Everything else — due-list, audit ages, the
dust line — is computed from these lines per run and written nowhere
(ADR-010; the committed/computed split of ADR-002). Pages that exhaust
their budget get **no** line and stay at the queue front.

## Triage (Phase T)

Oldest-first: recompute each item's anchor (`git hash-object` vs the
`repolore:sha=` comment), re-affirm against the current code, then exactly
one of the four deleting exits — fix-now, promote-to-page-or-gotcha,
file-to-tracker, dismiss-with-reason — each journaled. Survivors get their
anchor re-pointed at today's blob (`captured` = last affirmed). Nothing
ever blocks on the inbox.

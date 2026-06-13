---
title: "ADR-010: The audit clock is a journal line — per-claim verification as a prompt contract, zero new scripts"
summary: The audit workflow's evidence is one strict `audited` line in log.md (committed at bless time, parsed per run); verification is a budgeted prompt contract, findings v2 ships anchors+triage but defers the script — ratifying the divergence from ADR-009's staging list.
category: decisions
kind: decision
audience: [dev]
read_when: "changing the audit procedure, the audited log-line grammar, the findings v2 anchor grammar, or tempted to add audit state files or scripts"
status: accepted
date: 2026-06-12
supersedes: ~
superseded_by: ~
covers:
  - path: references/audit.md
    sha: 57ca379e0cb3bed127554a7e78bf43bfb6ff1410
  - path: templates/AGENTS.md
    sha: 5349a0adb586b4c7ad65e65e348743e21afb0c2d
generated_at_commit: 8b4e9fb
last_refreshed: 2026-06-12
related: [decisions/adr-002-computed-status, decisions/adr-009-findings-inbox-contract, concepts/freshness-model]
---

# ADR-010: The audit clock is a journal line

## Context

The freshness model openly admits it cannot catch **wrongness behind
unchanged bytes** — a claim that was never true stays "fresh" forever
(`docs/wiki/concepts/freshness-model.md`). The drift class is live, not
theoretical: the audit design tournament's dry-runs found a fresh-stamped
page claiming "five masters" where `VENDORED_SCRIPTS` lists ten, surviving
four no-op re-stamps (`docs/RESEARCH-AUDIT.md` §1). Only an LLM pass can own
this class — but an LLM pass needs an answer to *what was audited when*
without violating ADR-002 (status computed, never committed), and a token
budget that doesn't re-read the world.

A five-design adversarial tournament (`docs/RESEARCH-AUDIT.md`) settled the
architecture empirically: 23 agents, three attack lenses per design, two
judges. The minimalist prompt-contract design won on every axis the brief
named; its one critical flaw — using `last_refreshed` as the audit clock,
which refresh re-stamps constantly, starving hot pages — was fixed by moving
the clock to the journal.

## Decision

1. **The audit record is one strict `log.md` line per page** —
   `## YYYY-MM-DD — audited <category/slug> (N claims: C confirmed, F fixed, D demoted; X findings)`
   — appended at bless time inside the audit's reviewable commit, never
   batched. The due-list, audit ages, and the check workflow's dust line are
   **parsed from these lines per run and written nowhere** (ADR-002's exact
   split: durable evidence of a human-blessed event is committed; everything
   derived is computed). Like findings (ADR-009), audit evidence fails the
   recompute test — a pass costs tens of thousands of LLM tokens, so "don't
   store" means "lose".
2. **Verification is a prompt contract, not a tool** (`references/audit.md`):
   per-claim verdicts (CONFIRMED requires entailment / REFUTED requires
   counter-evidence / UNVERIFIED carries its cause), the negative-space rule
   for universal claims (grep the deciding tokens; comments are never
   entailment), a byte-capped invariant sweep for uncited wrongness, and
   hard budgets (K pages per session, evidence ≤3x page bytes). Budget
   exhaustion leaves a page unstamped and unjournaled — never demotes its
   claims.
3. **Zero new vendored scripts, zero new state kinds.** No `last_audited:`
   frontmatter (a second clock), no ledger file (check-state by another
   name), no verdict cache (stale verdicts are worse than re-reads), no
   audit script. The vendored surface — the product's sorest migration
   point — does not grow.
4. **Findings-inbox v2 ships as grammar + procedure** (`templates/AGENTS.md`):
   per-item blob-SHA anchors in invisible HTML comments
   (`<!-- repolore:sha=<blob7> captured=YYYY-MM-DD -->`), `unanchored` for
   absence findings, anchor backfill from recording commits (never today's
   blobs), the four deleting triage exits journaled. **The `findings-check`
   script ADR-009's staging list named is deferred** — triage replicates it
   with a `git hash-object` loop at zero vendored cost, and ADR-009's own
   revisit clause gates v2 tooling on a proven emptying loop, which has not
   run yet. This record ratifies that divergence explicitly rather than
   leaving ADR-009's Decision text silently inaccurate.
5. **Nothing blocks, nothing changes exit codes.** The dust line and inbox
   count live in the check *workflow's* prose (`references/check.md`), not
   in `wiki-check.mjs`; the post-commit hook's silent-when-green contract is
   byte-for-byte untouched. CI never sees audit state.

## Consequences

- The audit cadence is bounded by check/refresh/explicit sessions — no
  daemon. A dormant repo audits nothing, and the dust line says so rather
  than hiding it (the same liveness assumption refresh already makes).
- Audit-by-rote is detectable, not impossible: the `audited` line is
  self-reported, and the tally makes rote stamping checkable by reviewers.
  Unlike flows, no deterministic backstop exists — stated, not papered over.
- The journal becomes machine-read: the `audited` verb is a strict grammar
  inside an otherwise loose human journal. If parse failures recur, the
  candidate fix is a ~5-line warning-only lint in `wiki-check` (exit code
  untouched) — deliberately not shipped in v1.
- Honest cost (measured, `docs/RESEARCH-AUDIT.md` §7): ~65-70K tokens net
  for a full 15-page audit (~100K ceiling), ~45-55K/month steady-state at
  50 pages, linear scaling with K as the coverage dial.
- **Correction (2026-06-12, first production run):** the cost figure above
  understated reality ~15× on a large-file repo. The first audit of a
  production wiki (shopify-NL, 5 pages, Opus 4.8) processed ~500K net tokens
  (~100K/page), not ~5.1K/page. The §7 model was calibrated on this repo's
  small covered files; audit cost is dominated by **covered-file bytes, not
  page count** (shopify-NL pages cover 2,000-line C# files). Corrected model:
  `session tokens ≈ (Σ covered-file bytes read)/4 × R`, R≈2-4, where the
  bytes/4 floor is model-INDEPENDENT (shared tokenizer) and R (reasoning
  output + cache re-serve) is model-DEPENDENT. The decision is unaffected —
  the journal-clock + budgeted-prompt-contract design stands; only the
  planning numbers move. Budget by covered bytes, not page count. See the
  §7 field correction and ROADMAP. Validated-otherwise note: the same run
  confirmed the design in the wild — due-list selection, covers-overlap
  clustering, the negative-space rule, the invariant sweep, and the strict
  journal grammar all executed correctly (`docs/RESEARCH-AUDIT.md` §7).
- Rejected alternatives, each killed by a named attack: risk-score planner
  script (vendored surface + understated costs), claim-extraction tooling +
  ledger file (rewrite-conflict semantics, check-state-adjacent), full
  read-code-first derivation (2-4x cost; survives as the byte-capped
  invariant sweep), event-driven-only triggers (0/3 on the seeded answer
  key; its dust line and escort offer survive, defanged), `last_refreshed`
  as audit clock (hot-page starvation — the winner's own critical).

<!-- Dual mutability: once status: accepted, NEVER rewrite this record.
When the decision changes, write a new ADR, set its `supersedes`, and set
`superseded_by` here. -->

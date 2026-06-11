---
title: "ADR-009: Findings live in a relay buffer beside the wiki — never in pages, never a tracker"
summary: Code-defect findings surfaced while drafting/refreshing get a FINDINGS.md inbox outside page semantics, with consented writes and deletion-not-checkbox triage; tooling is deferred to the audit workflow.
category: decisions
kind: decision
audience: [dev]
read_when: "tempted to record bugs/TODOs in wiki pages, to make check or hooks write findings, or to gate anything on untriaged findings"
status: accepted
date: 2026-06-11
supersedes: ~
superseded_by: ~
covers:
  - path: templates/AGENTS.md
    sha: 26fcbd683df848e3fd8ac6b9a81da06f3d2cd1bd
  - path: references/refresh.md
    sha: bacff895383a46e0a45a7a0a54e6e1bb9b62e2d9
generated_at_commit: f4ebce2
last_refreshed: 2026-06-11
related: [decisions/adr-001-blob-sha-freshness-anchors, decisions/adr-002-computed-status, decisions/adr-006-vendored-tooling]
---

# ADR-009: Findings live in a relay buffer beside the wiki

## Context

Drafting and refreshing pages is the one workflow where an LLM reads a whole
codebase with verification-grade attention, and that attention surfaces
suspected defects as a by-product — spontaneously, in every observed
code-first drafting session (`docs/RESEARCH-FINDINGS.md`: 28 verified
security/correctness findings on one repo in a day, including a forged-
webhook plan escalation). Without a sanctioned home, capture failed in
characteristic ways: findings defaulted to machine-local agent memory
(invisible to the team), the hand-rolled `FINDINGS.md` convention had to be
re-negotiated every session, and each finding was triple-bookkept (page +
ledger + memory).

The wiki cannot absorb this content. Its rules exile task state verbatim
("TODOs belong in your agent's native memory or the issue tracker — never
here", `templates/AGENTS.md`), and its epistemics are unidirectional: code
wins every conflict, so no page may claim the **code** is wrong. A finding
asserts exactly that — code ≠ intent — a claim no existing repolore surface
can make. Dropping the signal is not acceptable either: unlike stale pages
and coverage gaps, LLM-discovered findings are not cheaply recomputable, so
ADR-002's recompute-don't-store answer is unavailable — here, "don't store"
means "lose".

## Decision

We ratify findings as a third content class — **durable triaged intent**,
the page plan's class: not check state (ADR-002), not page knowledge — held
in `FINDINGS.md` at the wiki root, a sibling of `GLOSSARY.md` and `log.md`,
committed and team-visible but **outside page semantics** (no frontmatter,
no `covers`, ignored by freshness, coverage, index and page budget). Grammar
and rules live in the schema doc (`templates/AGENTS.md`, "the findings
inbox"); refresh gains it as a second sanctioned by-product channel beside
the page plan (`references/refresh.md`).

Four rules are constitutional:

1. **Never inside pages, never a `findings/` category.** Pages keep
   descriptive gap notes and `> TODO-VERIFY:`; the inbox line is a pointer
   to them, not a copy. The no-task-state rule stands for all page space.
2. **Writers are consented only.** Drafting/refresh append findings inside
   the same reviewable commit as the page work; humans jot anytime. Check
   scripts and hooks never write — side-effect-free checking (ADR-002)
   stands.
3. **Nothing ever gates.** No commit, check, or workflow blocks on
   untriaged findings (UX doctrine; also the non-blocking patent posture,
   `docs/RESEARCH.md` §6).
4. **Triage deletes, never checks off.** Four exits, all leaving repolore's
   domain — fix-now, promote-to-page/gotcha, file-to-issue-tracker,
   dismiss-with-reason — each journaled as one `log.md` line. Schema
   austerity is the tracker firewall: no assignees, no status fields, no
   comments; an item needing workflow exits to the tracker.

**Staging.** v1 (this record) is convention + capture only: the schema-doc
section and the refresh channel — zero scripts, zero manifest growth, no
template file (the inbox is created on demand from the documented grammar,
so `bootstrap.mjs` is untouched and empty inboxes never exist). v2 — per-item blob-SHA anchors, a `findings-check` reusing
`blobSha()` (`scripts/lib.mjs`), a triage workflow, a check-report line —
ships **with the roadmapped audit workflow**, whose entire output is
findings; the loop gets built once, when its primary producer exists.

Vocabulary: findings never reuse `fresh`/`stale`/`unmanaged` — those name
the page↔code relation, never code quality. v2 coins its own terms (e.g.
*source-moved*).

## Consequences

- Correction (v0.3.9): the Decision's "zero scripts" claim was wrong by one
  line. The first real migration (pipao's 28-item backlog → `docs/wiki/FINDINGS.md`)
  immediately tripped `MALFORMED` because the vendored checker's page walk
  (`scripts/lib.mjs` `SKIP_FILES`) did not exempt `FINDINGS.md` the way it
  exempts `GLOSSARY.md`/`log.md`. v0.3.9 adds `FINDINGS.md` to `SKIP_FILES`
  — one vendored-script line, propagated through the normal update flow. v1
  is therefore convention + that single skip entry, not zero scripts. The
  dogfood caught it before any external adopter could.
- Cost accepted: until v2, the inbox has no mechanical freshness guard —
  only triage discipline plus a coarse free proxy (most cited files already
  sit in the linked page's `covers`, so page staleness co-flags its
  findings). The auto-doc-graveyard lesson (`docs/RESEARCH.md` §3) says
  this is the feature's failure mode; deletion semantics and the v2 gate
  exist to contain it.
- Merge exposure equals `log.md`'s: one-line appends, trivially-resolvable
  adjacent-line conflicts. Accepted.
- Revisit triggers: if v1 inboxes on mature, tested repos stay empty or
  fill with nits, stop at v1 — the convention was the right-sized
  container. v2 is justified only after a real triage run proves the
  emptying loop (the pipao 28-item backlog is the live test).
- Alternatives rejected: **a `findings/` wiki category** (violates
  no-task-state verbatim; resolved findings would read as "stale",
  corrupting a policed term); **`.repolore/` placement** (hides what must
  be team-visible — the observed demand was escaping invisible storage —
  and reclassifies a regenerable-tooling dir as content); **no storage /
  tracker-only handoff** (findings are not recomputable; empirically
  rejected — the user hand-built persistence three times); **a `findings:`
  block in `wiki.config.yml`** (YAML authoring kills the 10-second human
  jot and bloats the planning surface).

<!-- Dual mutability: once status: accepted, NEVER rewrite this record.
When the decision changes, write a new ADR, set its `supersedes`, and set
`superseded_by` here. -->

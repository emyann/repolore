---
title: "Findings capture in repolore: feasibility & go/no-go"
date: 2026-06-11
status: research-complete
provenance: "findings-inbox-feasibility workflow: 7 session-archaeology agents over pipao + sword-shopify-nl Claude Code transcripts, 1 artifact analysis of pipao FINDINGS.md + its wiki backlinks, 1 vision-principles extraction → advocate vs skeptic vs design-options panel; this document is the synthesis"
---

# Findings capture — should repolore own the by-product?

> Companion to [RESEARCH.md](./RESEARCH.md) §3/§5a. Point-in-time; sequencing
> decisions live in the README roadmap. The question: drafting wiki pages on
> pipao surfaced 28 verified bugs/security gaps as a by-product; the user
> hand-rolled a root `FINDINGS.md` to hold them. Should repolore systematize
> this — a findings queue, a wiki category, a GTD-style inbox humans can also
> drop into — or is it out of scope?

## 1. The observed practice (session evidence)

Across every pipao session that drafted pages from code (4 of 4), findings
emerged **spontaneously** — never user-prompted audits, always mid-distillation
("this batch surfaced findings that go well beyond documentation"). The two
sessions that only did wiki maintenance (sword-shopify-nl check/update/glossary)
produced **zero** code findings. The signal is real, repeatable, and
concentrated in exactly the stage repolore owns: attentive whole-repo reading.

The capture path, however, was improvised every time:

- First persistence attempt defaulted to **machine-local agent memory** —
  invisible to the team. Only a second nudge ("if creating a FINDINGS.md is
  not redundant with the wiki please save it as well *so other dev can know
  ahout them too*") produced the committed file. A Stripe-forgery finding
  defaulting to a private memory file is the product gap in one sentence.
- Every later batch needed a manual round-trip ("yes add them to @FINDINGS.md
  as well and then commit/push") — the convention was re-negotiated per session.
- **Triple bookkeeping**: each finding landed in the wiki page (gap section /
  TODO-VERIFY), in FINDINGS.md, and in an auto-memory note whose count was
  hand-bumped 17→19→25.
- repolore's own dogfood repo hit the motivating scenario: v0.3.0 work "fixed
  a latent bug it uncovered" **inline, because there was nowhere to file it**
  (README changelog).

## 2. The artifact (what the hand-roll already got right)

`pipao/FINDINGS.md`: dated preamble, three severity sections (Security /
Functional bugs / Cleanup), 28 `- [ ]` items, each a bold headline + terse
evidence with `path:line` citations (the wiki's own citation discipline) + a
`→ docs/wiki/…` backlink. The backlinks are a deliberate dedup device: the
ledger holds the one-line worklist pointer; the linked page holds the
exhaustive, cited, freshness-tracked evidence ("Known gaps" sections,
TODO-VERIFY blockquotes). Epistemic hedging is consistent across both
registers ("likely" in the ledger ⇔ `> TODO-VERIFY:` in the page).

Two structural facts matter most:

- **Zero of 28 items are checked off.** The file only ever accreted (20 → 28,
  in lockstep with drafting batches). The emptying half of the lifecycle is
  untested — and unchecked boxes over silently-fixed bugs are precisely the
  trust-poisoning state the wiki's no-task-state rule exists to prevent.
- **Per-finding blob-SHA anchoring is mechanically trivial.** `blobSha()`
  already powers covers freshness (`scripts/lib.mjs`); anchors are even
  backfillable from the recording commits (`git rev-parse cce5af8:<path>`).
  Caveats: the signal is file-level (re-verify prompt, never a
  resolved-detector), and **absence findings** ("no `requireRole` middleware
  anywhere", "no `/api/cron` route exists") are unanchorable — an honest
  third state, like `unmanaged`.

## 3. Vision fit — conflicts and precedents

**Direct conflicts (real, not pedantic):**

- `docs/wiki/AGENTS.md`: "**No session or task state.** … TODOs belong in
  your agent's native memory or the issue tracker — never here. That content
  rots fastest and poisons trust in the rest." A findings inbox is a TODO
  list by another name → it can never live in page space.
- ADR-002 / `references/check.md`: check is read-only, side-effect-free,
  "signals, never gates" → check and the hook can never *write* findings.
- The deepest tension: repolore's epistemics are unidirectional ("code wins
  every conflict — fix the page"). A bug finding asserts the opposite —
  **code ≠ intent** — and intent has no representation anywhere in the
  schema. Findings are a genuinely new contract, not an extension of pages.
- Non-blocking is partly load-bearing legally (RESEARCH.md §6, SAP
  US10977031B2 adjacency): no triage-pressure mechanic may ever gate.

**Precedents (the shape is in-family):**

- The **page plan** is already a committed, consented, check-surfaced GTD
  queue: capture (`status: planned`, filed as a refresh by-product) →
  surface (check) → triage → process on demand. The inbox rides this idiom.
- **TODO-VERIFY** is already a micro-inbox with a typed epistemic payload.
- **log.md** is the placement precedent: a capture file beside the pages,
  outside page semantics (no covers, no freshness, no budget).
- RESEARCH.md §3 records Devin Knowledge's **suggest-then-approve** loop as
  a lesson to copy — the inbox's exact write loop.
- The roadmapped **audit workflow** (v0.3.x: "LLM pass for wrongness/
  duplication") produces findings as its *entire output* — it will need this
  surface anyway.

## 4. Adversarial evaluation (condensed)

**Advocate (strongest points):** the unique-moment value is severity-1 grade —
init/drafting is the only workflow where an LLM reads a whole codebase with
verification-grade attention, that attention found a forged-webhook
plan-escalation and cross-tenant leaks at zero marginal cost, and uncaptured
it is paid for in tokens and discarded. The user built the feature by hand
three times; the hand-rolled version is the one that violates repolore
doctrine (zero staleness machinery, triple bookkeeping, machine-local
default). Anchoring is nearly-free reuse, and findings types (absence,
cross-file drift, config-vs-code mismatch) are classes diff-review bots
structurally miss.

**Skeptic (strongest points):** the motivating case proves a hand-written
file + one consent word per batch *suffices* — the residual friction is
convention-shaped, not tooling-shaped. Findings are the content class whose
entire purpose is to become false, with no mechanical loop that detects it —
the auto-doc-graveyard predictor. Issue trackers already own work queues and
the rules route findings there. The inbox-only-fills failure mode is already
visible (28/28 unchecked). Demand evidence is one user, one repo, one day,
one lifecycle stage — the burst may be a once-per-adoption event (mature-wiki
maintenance sessions produced nothing). Every placement breaks some written
pledge; and it is another vendored surface to version and migrate, when
update churn is already the product's sorest point.

## 5. Design options (panel scores, 0–10)

| Option | Verdict | Score |
|---|---|---|
| (a) wiki category `findings/` | Violates no-task-state verbatim; resolved findings read as "stale"; floods refresh queue; bug tracker wearing wiki semantics | 2 |
| (b) bless the root `FINDINGS.md` convention as-is | Validated demand, best human jot + cross-agent reach; but breaks the minimal-footprint pledge, and rots — checkbox graveyard, nothing validates anchors/backlinks | 5 |
| (c) `.repolore/inbox.md` | Hidden = defeats the actual demand (team visibility); reclassifies a regenerable-tooling dir as content | 4 |
| (d) no storage — report + issue-tracker handoff | Purest rule compliance, perfect emptying; but LLM findings are not recomputable, so "don't store" = "lose"; empirically rejected by the user's own behavior | 4 |
| (e) **wiki-adjacent `docs/wiki/FINDINGS.md`** — sibling of GLOSSARY.md/log.md, outside page semantics; SHA anchors; deletion-not-checkbox; triage with four exits | Only option that fits by precedent rather than exception (page-plan shape, log.md placement, TODO-VERIFY epistemics, Devin loop) | **9** |
| (f) `findings:` block in wiki.config.yml | Simplest checker, but YAML kills the 10-second human jot; config becomes a junk drawer; raises migration stakes | 6 |

## 6. Recommended shape (option e, scoped as a relay buffer)

- **Placement**: `docs/wiki/FINDINGS.md`, beside GLOSSARY.md and log.md —
  committed, team-visible, explicitly outside page semantics (no frontmatter,
  no covers, skipped by index/budget/freshness). No new top-level file;
  footprint pledge intact.
- **Item grammar** (one line per finding):
  `- [sec|bug|cleanup] **headline** — evidence \`path:lines\`
  <!-- repolore:sha=abc1234 captured=YYYY-MM-DD --> → docs/wiki/<page>.md`,
  with `(unverified — <what needs checking>)` for hedged claims and
  `<!-- repolore:unanchored -->` for absence findings. The backlink is the
  dedup device; the wiki page keeps the exhaustive evidence; agent memory
  keeps nothing (kills the triple bookkeeping).
- **Writers**: drafting/refresh skills (in the same reviewable, consented
  commit — replacing the per-batch "say the word" round-trip with a visible
  diff at commit consent), the future audit workflow, and humans (10-second
  jot; the next triage backfills anchor + backlink — lint, never gate).
  **Never check, never the hook** — those stay side-effect-free counters.
- **Surfacing**: check reports, below the page backlog: "Findings inbox: 7
  open — 2 sources moved since capture (possibly resolved), 1 older than
  30d" — an offer in the glossary-smell idiom, never a gate.
- **Emptying (the non-negotiable)**: triage **deletes** items via four exits
  that all leave repolore's domain — fix-now, promote-to-gotcha/page,
  file-to-issue-tracker, dismiss-with-reason — each logged as one log.md
  line. No checkbox graveyard. Anchor drift auto-promotes "possibly
  resolved" items; a soft findings budget (~20, warn-never-block) names
  sprawl; survivors must be re-affirmed (anchor re-stamped) or age into the
  30-day callout.
- **Vocabulary**: never reuse fresh/stale/unmanaged for findings — coin and
  glossary new terms (e.g. *source-moved*, *re-verify*). "Stale ≠ wrong" is
  policed; findings would corrupt it.
- **Contract**: an ADR ratifying the new content class explicitly — findings
  assert code ≠ intent, a claim no existing surface can make; the inbox is
  **durable triaged intent** (like the page plan), not check state, not wiki
  knowledge; a relay buffer toward fixes/gotchas/the tracker, never a
  resident tracker (schema austerity: no assignees, no status field, no
  comments — the moment an item needs workflow, its disposition is FILE).

## 7. Go/no-go

**Conditional GO — staged.** The practice is legitimate and worth owning: it
occurred unprompted in 100% of code-first drafting sessions, the user
hand-built the artifact three times, and the current default (machine-local
memory, per-session re-negotiation, zero staleness machinery) is the version
that violates repolore's own doctrine. But the skeptic wins on timing and on
two scope vetoes, so:

- **v1 — bless the convention, own the capture (cheap, now).** A FINDINGS.md
  template + ~10 lines in `templates/AGENTS.md` (grammar, placement, the
  evidence-lives-in-the-page rule); drafting/refresh skills append findings
  in the same consented commit; the ADR. No new scripts, no manifest growth.
  This alone fixes the bad default and the re-negotiation loop.
- **v2 — tool the loop when the second producer lands.** findings-check
  (anchor re-hash, ~30 lines reusing `blobSha`), the triage skill, and the
  check-report line ship **with the roadmapped audit workflow**, whose entire
  output is findings. pipao's 28 real items are the live migration test:
  move to `docs/wiki/FINDINGS.md`, backfill anchors from the recording
  commits, and let the first triage run prove the emptying loop.
- **Vetoes regardless of stage**: no wiki category (no-task-state is
  load-bearing); check/hook never write; nothing ever blocks; deletion
  semantics, not checkboxes.

**Revisit triggers**: if v1 inboxes on non-pipao-class repos (mature, tested,
reviewed) stay empty or fill with nits, stop at v1 — the phenomenon was an
init-burst, and a convention is its right-sized container. If triage runs
show the emptying loop working on pipao's backlog, v2 is justified. Demand
evidence beyond one user/one repo is the honest gate for anything bigger.

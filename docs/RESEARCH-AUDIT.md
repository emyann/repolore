# RESEARCH: the audit workflow + findings-inbox v2

Synthesis of a five-design adversarial tournament (designers → three attack lenses each →
two independent judges → this report). Both judges ranked **The Stamp-Clock Audit** first;
this report is that design with its one critical and every major attack either fixed or
explicitly scoped out, plus the surviving ideas grafted from the four losers. The defining
fix moves the audit clock from the `last_refreshed` stamp to the `log.md` journal, so the
final design is named the **Journal-Clock Audit**.

Style note: like `docs/RESEARCH-FLOWS.md`, this is empirical — every load-bearing claim
below was re-verified against the working tree on 2026-06-12, and the numbers are measured
(`wc -c`), not estimated, wherever a measurement exists.

---

## 1. The problem this owns

The freshness model (`docs/wiki/concepts/freshness-model.md`) admits two blind spots:

1. **Wrongness behind unchanged bytes** — a claim that was never true stays "fresh" forever.
2. **Semantic drift that dodges cited spans** — flows v2 proves byte-level safety only.

Both are live in this repo today, which is the strongest argument that the feature is owed:

- `docs/wiki/architecture/overview.md:45` claims `.repolore/scripts/` holds "copies of the
  **five** masters in `scripts/`". `VENDORED_SCRIPTS` (`scripts/lib.mjs:27-31`) lists **ten**;
  `ls .repolore/scripts/ | wc -l` → 10. The page is fresh-stamped (2026-06-12). The claim
  survived at least four logged no-op re-stamps. Nothing in the current system will ever
  catch it.
- `docs/wiki/concepts/freshness-model.md:41` cites `scripts/wiki-check.mjs:53` for the
  unmanaged classification; line 53 is mid-comment about decision-record lifecycle — the
  classification is line 58. The `:52-62` span cited for the fresh definition ends before
  the actual `blobSha` comparison and verdict (lines 63-67). Three independent tournament
  attackers confirmed both. The page is genuinely fresh (all six covers SHAs re-verified
  via `git hash-object`).

The audit workflow is the LLM pass that owns this drift class. It feeds findings-inbox v2,
whose v1 (ADR-009) is convention-only and whose v2 components — per-item anchors, triage,
a check-report line — were staged to ship "with the roadmapped audit workflow, whose entire
output is findings."

## 2. What the tournament established (empirical findings)

Five designs ran a mandatory dry-run against a seeded copy of the freshness-model page
(three planted falsehoods: a blatant hook-blocks-commits inversion, a moderate
coverage-gates-CI inversion, a subtle install-hook replace+hooksPath double inversion)
plus the real page as control. Results:

| Finding | Evidence |
|---|---|
| Span-anchored claim verification works on **cited** claims | 4/5 designs caught 3/3 seeds with line-exact evidence (`wiki-coverage.mjs:25`, `wiki-hook.mjs:10-14,:34`, `wiki-install-hook.mjs:8-14,:40-51,:88-93`); zero damaging false positives |
| **Uncited** wrongness needs code-first reading | 2 of 3 seeds carried no citation; only the clean-room derivation (read code → jot invariants → diff prose) had a structural trigger to catch them — and the only live wild falsehood ("five masters", a count claim with directory-level cites) is exactly this shape |
| **Comment-laundering** is the residual hole | Every seed catch in every design was adjudicated against a header comment that happened to be truthful; a protocol that judges "strictly from the printed span" cannot distinguish that from a lying comment. The fix is grep-enumeration of deciding tokens (exit sites, writers) for universal claims |
| Any audit clock tied to `last_refreshed` **starves hot pages** | Refresh re-stamps the field (including the sanctioned no-op path that verifies nothing); all 15 pages here were stamped within 36 hours, so churning pages perpetually rotate out of an oldest-`last_refreshed` queue. Three designs failed on variants of this |
| The scope perimeter is where audits die | GLOSSARY.md (cited claims, no covers, invisible to freshness), frontmatter summaries (amplified verbatim into the generated index), ADR Context prose, and `inferred` flow edges were each unreachable in at least one design |
| FP traps destroy trust faster than misses | True-but-unprovable-in-budget claims ("Since v0.2.2…", absence claims, platform facts) demoted to `TODO-VERIFY` deface correct pages; recurring FP edits teach reviewers to rubber-stamp audit commits — the exact erosion ADR-009 exists to prevent |
| Cost models lie in fixed costs and scheduling, not per-page reads | Measured per-page ~4.5-5K tokens held up across designs; the understatements (1.4-2.3x) came from session fixed costs (`docs/wiki/AGENTS.md` alone is 17,869 B ≈ 4.5K tokens), cross-session re-reads, and churn re-triggers |

Why Stamp-Clock won: only design with zero new vendored scripts and zero new state kinds,
no ADR letter violation found by its contract attacker, the only cost model graded
honest-to-conservative (recomputed full audit 62-72K vs claimed 85K; steady state within
1.3x), and a flawless dry-run. Its flaws were spec patches; the losers' flaws were
architectural (see §11).

## 3. The procedure — `references/audit.md`

Plugin-side prose, ~160 lines, single-sourced. Reached via a 3-line `skills/audit/SKILL.md`
shim **and a new sixth row in the root umbrella `SKILL.md` routing table** (the winner
omitted this row; without it, standalone skills-CLI installs cannot discover the workflow —
fixed). Everything the procedure executes inside the target repo is existing vendored
scripts plus git. Commands are phrased harness-agnostically (node one-liners or "your
file-search tool"), never bare POSIX idioms, and every optional-file access is
existence-guarded.

The runbook content, near-verbatim:

### Phase 0 — scope

1. Read `.repolore/manifest.json` for `wikiRoot`/`scriptsDir`. Run
   `node <scriptsDir>/wiki-check.mjs` once.
2. **Version guard (new):** read the FINDINGS section of `<wikiRoot>/AGENTS.md`. If it
   documents the v1 grammar (no anchor comment), offer the consented tooling update
   *before* writing any v2 inbox line; if declined, write v1-grammar lines (no anchors)
   and note them as backfill candidates. Never write a grammar the repo's own contract
   doc does not describe.
3. **Eligibility:** STALE and MALFORMED pages route to refresh, never audit — but note
   the handoff honestly: refresh re-verifies only diff-touched citations, so a
   just-refreshed page **immediately re-enters the audit due-list** if its audit age is
   past the horizon (this plus the escort in Phase R closes the hole where hot pages
   were verified by neither workflow). Excluded surfaces: `index.md` (generated),
   `log.md`, `FINDINGS.md`, `AGENTS.md`, `_templates/` — plus `GLOSSARY.md`, which gets
   its own slot (step 5).
4. **The due-list (computed, never stored):** parse `log.md` for lines matching
   `^## (\d{4}-\d{2}-\d{2}) — audited (\S+)`. A page's audit age = days since its newest
   `audited` line. Never-audited pages sort **first** (treat as infinitely old;
   tie-break by oldest `last_refreshed`, then alphabetically). Then oldest-audited-first.
   Within the due set (age > `horizon_days`, default 90), prefer higher churn:
   `git rev-list --count --since=<audit-date> HEAD -- <covers paths>` for the ~2K oldest
   candidates only. Take K pages (default 5, the session cap; users may name pages or
   raise K). **Cluster the K picks by covers overlap** so shared evidence files are read
   once per session.
5. **GLOSSARY slot:** once per full rotation (or when the due-list is empty), audit
   `GLOSSARY.md`: for each entry citing a symbol or file, grep the symbol, read its span,
   verdict per Phase 1 rules. (~1.5-2K tokens; closes a surface freshness can never see.)
6. Flow pages are eligible; their protocol is modified in Phase 1 step 2(d).
7. Accepted ADRs get the **light protocol**: present-tense claims about current code are
   audited *wherever they appear, including Context*; historical narrative ("we observed
   X during v0.2") is out of scope — an honest limit, stated here. Disposition for ADR
   wrongness is in Phase 2.

Optional config (read by the LLM only — no script parses it):

```yaml
audit:
  horizon_days: 90
  pages_per_session: 5
```

### Phase 1 — per-page protocol

1. **Read the page** — frontmatter and prose, *skipping the generated FLOW-RENDER region*
   on flow pages (byte-level edge integrity is `wiki-flow-check`'s job; re-reading
   generated bytes is double-pay — saves ~2-3K tokens on this repo's flow pages). Number
   every concrete falsifiable claim with its citation or its absence. **The claim list
   includes the frontmatter `summary` and `read_when` lines** — the summary is rendered
   verbatim into the generated `index.md`, the wiki's highest-leverage retrieval surface,
   so a false summary is amplified wrongness.
2. **Verify, cheapest-first:**
   - (a) read ONLY the cited span ±20 lines; if the cite is file-level or the span is
     silent, ONE bounded grep for the load-bearing symbol, then read that hit's span.
     **±10-line tolerance:** a true claim whose pointer is off by ≤10 lines is repaired
     silently while editing — never a finding, never counted. Beyond ±10 it is a
     citation-drift fix, made in-page, counted in the tally, still never inboxed.
   - (b) **negative-space rule** (universal claims): for every always/never/only/gates
     claim, do NOT accept a header comment or a single span as entailment. Grep the
     deciding tokens (`process.exit`, the symbol, the config key, the writers/callers)
     across the cited file and read hits ±10 lines. Hard cap ~120 lines of
     negative-space reads per page; a universal claim whose enumeration cannot complete
     in cap is UNVERIFIED(budget), not confirmed-by-comment. (This is the only mechanism
     in the tournament that structurally defeats comment-laundering — all twelve seed
     catches across four designs rode on comments that happened to be truthful.)
   - (c) **invariant sweep** (uncited-wrongness catcher): per covered file, after span
     reads, read the header contract plus a structure pass of exported symbols/lists
     (grep, not full reads), and jot 3-7 expected invariants — counts, exit codes, flag
     semantics, defaults. Diff the page (and its summary) against them. Scratch-only,
     never committed. This is what catches "copies of the five masters" — a count claim
     whose deciding evidence (`VENDORED_SCRIPTS`) lives in a file the page neither covers
     nor cites. Charged to the same evidence budget.
   - (d) flow pages: every `inferred` edge is a truth claim with zero machine checking —
     verify each with one bounded read (≤40 lines spanning the adjacent step anchors);
     spot-check ≤3 `verified` edges for *semantic* accuracy (does the call site mean
     what the step says). Never re-verify what `wiki-flow-check` already proves.
   - (e) **provenance claims** ("Since v0.2.2…"): one git command (`git tag`,
     `git log --oneline -S<term>`) before any demotion — their evidence legitimately
     lives outside covered files.
   - Hard evidence budget: ≤3x the page's own bytes (all of a-e charged against it);
     a covered file may be read end-to-end only if <150 lines.
3. **Verdict per claim**, exactly one of:
   - CONFIRMED — the read bytes ENTAIL the claim ("consistent with" is not entailment;
     an exit-code claim requires seeing the exits; a universal claim requires the
     negative-space enumeration). 
   - REFUTED — read bytes contradict it; requires counter-evidence `path:lines` plus one
     line stating what the code actually does.
   - UNVERIFIED, with a recorded cause:
     - *(budget)* — the meter ran out → see Phase 3: the page is left **unstamped**, the
       claim is NOT demoted (demotion for budget exhaustion is vandalism of probably-true
       claims; the page stays at the queue front and is finished next session).
     - *(unobtainable)* — runtime-only, cross-system, or human intent, after the bounded
       hunt → demote to `> TODO-VERIFY: <claim> — <what needs checking>` or delete if
       low-value.
     - *(platform)* — true-by-platform facts (git semantics, OS behavior) → noted in the
       session report, never demoted. An audit verifies page↔code correspondence; it does
       not re-derive git.
4. Cross-claim coherence at zero extra reading: claims contradicting each other, the
   frontmatter, or mechanism ("a post-commit hook blocks the commit" is incoherent before
   any code is read — flag, then still verify).
5. **No blanket verdicts.** "Everything else checked out" is forbidden; the tally counts
   in the log line are the contract, and every UNVERIFIED claim is enumerated in the
   session report. (The winner's own dry-run committed this inflation once; the rule
   exists because of it.)

### Phase 2 — disposition

- Page≠code → **fix the page in this change** (code wins every conflict). Small fixes
  inline; rewrite-scale wrongness → demote the affected claims to `TODO-VERIFY`, file the
  page into the page plan (`pages:` in `wiki.config.yml`) for a real refresh — **never**
  into FINDINGS.md (the inbox asserts code≠intent, not page≠code; this preserves ADR-009
  class purity — the [page]/[wiki] finding kinds two losing designs proposed were
  rejected by their own contract attackers as exceeding the ratified content class).
- Accepted ADR wrong about current code → never rewrite: append a dated `Correction:`
  bullet to Consequences (repo precedent: ADR-009's v0.3.9 correction) or recommend a
  superseding record; raise to the user.
- Code≠intent discovered while verifying → one FINDINGS.md line in v2 grammar, same
  commit, plus the page-side gap note ADR-009 rule 1 requires (the inbox line is a
  pointer, never the sole evidence holder).

### Phase 3 — bless + journal

- For every page whose **claims were all verdicted**, append one `log.md` line:
  `## YYYY-MM-DD — audited <category/slug> (N claims: C confirmed, F fixed, D demoted; X findings)`
  — one line per page, never batch lines (a batch line would zero the clock for pages it
  names ambiguously). This line IS the audit record and the clock.
- `wiki-stamp.mjs <page>` **only for pages that were edited** (normal blessing — the stamp
  re-canonicalizes covers and bumps `last_refreshed`, which is correct because the content
  changed). A clean audit's entire commit payload is its log line: no frontmatter churn,
  no clock-motion diffs, and `last_refreshed` keeps its single meaning.
- `wiki-index.mjs` if summaries changed. Offer ONE reviewable commit
  (`docs(wiki): audit K pages — …`); never auto-commit. Pages that ran out of budget get
  no `audited` line — stated in the session report, picked up next session.
- Honesty guardrail, verbatim in the runbook: appending an `audited` line for claims you
  did not verdict is audit-by-rote — the same trust erosion as refresh-by-rote. The line
  asserts per-claim verification happened, and the tally is checkable against the report.

### Phase T — triage (runnable standalone; offered whenever FINDINGS.md is non-empty)

For each item, oldest-first, source-moved first: recompute the anchor
(`git hash-object <path>` vs the `repolore:sha=` comment — one loop, no tooling) → label
*source-moved / anchor-intact / unanchored / legacy*; re-affirm against current code
reading only the evidence span; then exactly one of ADR-009's four exits (fix-now /
promote-to-page-or-gotcha / file-to-tracker / dismiss-with-reason) — DELETE the line, one
`log.md` line per departure. Survivors are re-affirmed in place: sha updated to the
current blob, `captured` updated to today — **`captured` means "last affirmed against
code", not "first observed"** (first observation lives in git history; this explicit
semantics answers the provenance-corruption attack). Soft budget ~20 items, reported,
never gated. Nothing in any phase blocks anything.

### Phase R — the standing triggers (no scheduler exists; the liveness assumption is refresh's)

- `references/check.md` gains two lines: (1) `Findings inbox: N item(s)` via a guarded
  count (skip silently if FINDINGS.md absent); (2) the **dust line** — "P pages never
  audited, Q audited >90d ago — consider `/repolore:audit`" — computed by parsing
  `log.md` `audited` lines at check time, written nowhere. This lives in the check
  *workflow* (prose), NOT in `wiki-check.mjs`: the vendored script, its exit codes, its
  `--quiet` gate, and the post-commit hook's silent-when-green sub-second contract are
  byte-for-byte untouched. CI never sees audit state. (This deliberate placement
  dissolves the quiet-gate dilemma that impaled two other designs.)
- `references/refresh.md` gains an **escort offer**: after the session's refresh work, if
  the dust line showed overdue pages, *offer* to full-audit ONE — the just-refreshed page
  if it is overdue (cheapest: diff and page already in context), else the oldest due.
  An offer, never an obligation; max one per session. Additionally: a **rewrite-path**
  refresh (which re-researches the whole page per the existing contract) may append the
  `audited` line for that page — it re-verified every claim by construction. Targeted-edit
  and no-op refreshes never count.
- On-demand: `/repolore:audit [pages… | K]`.
- Honest limit: a repo with zero check/refresh sessions audits nothing. Same liveness
  assumption refresh already has; the dust line keeps the debt visible instead of silent.

## 4. State model

**COMMITTED** (all inside one consented, reviewable commit — never by checks or hooks):

1. Page prose fixes, demotions, citation re-points (ordinary content).
2. `log.md` lines with the new `audited` verb (and triage-departure lines) — **the audit
   clock**. The journal's documented verb set (`added|refreshed|superseded|archived`)
   gains `audited`. This is ADR-002's sanctioned class exactly: durable evidence of a
   human-blessed event, written at bless time inside a reviewed commit — the same class
   as `last_refreshed`, and like findings (ADR-009's ratified argument) it fails the
   recompute test: an audit pass costs tens of thousands of LLM tokens, so
   "don't store" means "lose".
3. `last_refreshed`/`generated_at_commit` via `wiki-stamp` — written **only when the page
   was edited**; the field keeps its single refresh meaning (the winner's conflation is
   gone).
4. FINDINGS.md v2 lines with per-item SHA anchors — ADR-009's third content class.

**COMPUTED, never written anywhere:** the due-list and audit ages (parse + sort `log.md`
per run); the dust line; churn preference (git rev-list per run); all freshness states
(unchanged); anchor labels source-moved/anchor-intact/unanchored/legacy (re-hashed at
triage, printed); claim verdicts (never persisted — a verdict cache is check-state, and a
stale one is worse than a re-read).

**Deliberately absent:** no `last_audited:` frontmatter (a second clock = a second state
kind; the journal already carries the date), no audit ledger file (rewrite-conflict
semantics; check-state by another name), no `_audit/` directory use (`lib.mjs:18` reserves
the name; it stays empty), no schedule file, no verdict cache.

**ADR-002 compliance:** no status field anywhere; nothing written at check time; checks
and hooks remain writers of nothing; a clean audit dirties no tracked file except one
append-only journal line; merge exposure equals log.md's accepted one-line-append class.
Degradation: if a team never appends `audited` lines, every page reads never-audited and
the due-list degrades to oldest-`last_refreshed` — weaker ordering, no broken invariants.

## 5. Findings-inbox v2

**Grammar** (a v1-compatible superset; one regex, line-parseable per ADR-003; documented
in `templates/AGENTS.md`):

```
- [sec|bug|cleanup] **headline** — evidence `path:lines` <!-- repolore:sha=<blob7> captured=YYYY-MM-DD --> → category/slug
```

- Absence findings ("no requireRole middleware anywhere") carry
  `<!-- repolore:unanchored captured=YYYY-MM-DD -->` — the honest third state from
  RESEARCH-FINDINGS §2; no file to hash is a label, not a hole papered over.
- Hedged claims keep `(unverified — <what needs checking>)` from v1.
- The HTML comment renders invisibly on GitHub, so the 10-second human jot survives:
  humans may omit the comment entirely; the next triage backfills it (lint, never gate).
- v1 lines and pipao-style `- [ ]` checkbox lines parse as `legacy`; triage converts
  (deletion semantics need no checkbox).
- Vocabulary: *source-moved / anchor-intact / unanchored / legacy* — never
  fresh/stale/unmanaged (policed page-relation terms). Added to GLOSSARY.md.
- No new finding kinds. Page≠code wrongness never enters the inbox (it is fixed,
  demoted, or routed to the page plan) — ADR-009's code≠intent class purity holds.

**Writers:** audit (its by-product channel), draft/refresh (existing channel), humans —
all consented, inside reviewable commits. Checks and hooks never write.

**Anchor backfill rule (fixed after attack):** anchors for pre-existing lines are
backfilled from the **recording commit** (`git log` archaeology →
`git rev-parse <commit>:<path>`), never from today's blob — a today-blob backfill would
classify moved-evidence items as anchor-intact and silently erase the source-moved triage
signal. If archaeology fails (squashed history, shallow clone), the item stays
`unanchored` with a note — honest, not wrong.

**Triage:** Phase T above. Four deleting exits, one journal line per departure,
re-affirmed survivors get sha+captured updated in place (captured = last-affirmed).
Soft budget ~20, reported never gated. Nothing ever blocks on findings (ADR-009 rule 3 —
and because the dust/inbox lines live in workflow prose, not in `wiki-check.mjs`, there
is no back door through CI exit codes).

**Migration (pipao's 28-item backlog — the live test):** one consented pass converts
checkbox lines to v2, backfills anchors from recording commits, marks absence items
unanchored; then the first real triage run is ADR-009's v2 justification gate, exactly as
that record staged it. Honest one-time cost: ~30-35K tokens (28 items x ~0.8K re-affirm
+ commit archaeology + session fixed costs) — the winner's original ~15K estimate was
roughly half the recomputed figure.

**Deferred tooling, ratified:** ADR-009's v2 list includes a `findings-check` script.
This design ships the other three components (anchors, triage workflow, check-line) and
defers the script: triage replicates it with a `git hash-object` loop at zero vendored
cost, the grammar is regex-stable so vendoring later is additive never a migration, and
ADR-009's own revisit clause gates v2 tooling on a proven emptying loop — which has not
run yet. Because this is a selective reading of an accepted record, **ADR-010 ratifies
the divergence explicitly** (see §6) rather than leaving the Decision text inaccurate —
the self-exemption attack is answered by following the repo's own supersession
discipline, not by silence.

## 6. Shipped deltas

**Vendored scripts: zero new, zero changed.** The winner's signature property survives
synthesis. Every grafted mechanism is either runbook prose, a journal convention, or a
git one-liner. (Rejected with reasons: Patrol's planner script ~130 lines, Docket's
claim-extraction tool ~220 lines, Clean-Room's findings script ~130 lines — all grew the
update-migration surface RESEARCH-FINDINGS §4 calls the product's sorest point, for work
the LLM session does anyway.)

Prose/contract deltas:

| Surface | Delta | Ships via |
|---|---|---|
| `templates/AGENTS.md` | FINDINGS section: v2 grammar + anchor/backfill/triage rules (~18 lines); log-format line gains the `audited` verb + one-per-page rule (~3 lines); two-line audit-bless note | Consented update flow (regenerateAgents) — the contract survives the tool, and non-Claude agents (Cursor/Codex/Copilot) learn the rules from the only doc they read |
| `references/audit.md` | NEW, ~160 lines (the §3 procedure) | Plugin + skills-CLI (ADR-004; references/ ship under the umbrella) |
| `skills/audit/SKILL.md` | NEW 3-line shim | Plugin |
| Root `SKILL.md` | Routing table gains the sixth row ("audit the wiki for wrongness" → `references/audit.md`); "Five workflows" heading updated | Plugin + skills-CLI — **the standalone-parity wiring the winner omitted** |
| `references/check.md` | +2 bullets: guarded inbox count; dust line | Plugin + skills-CLI |
| `references/refresh.md` | +3 lines: escort offer; rewrite-path-counts-as-audit rule | Plugin + skills-CLI |
| `wiki.config.yml` template | Optional `audit:` block (horizon_days, pages_per_session) — convention, read by no script | init template only (update never touches config) |

**Same-change absorption (the dogfood owes itself):** ADR-010 (audit evidence contract +
findings v2, incl. the deferred-script divergence from ADR-009's staging list); a dated
`Correction:` bullet on ADR-009; a new wiki page (`howto/audit-the-wiki.md`); GLOSSARY
entries (audited, dust, source-moved, anchor-intact, unanchored); refreshes of the pages
the touched files cover (SKILL.md edits stale adr-004/overview/gotcha pages). The feature
that audits wrongness must not ship as an unabsorbed change — its own audit would flag
its ship commit.

## 7. Token cost model (honest)

Accounting: tokens ≈ bytes/4 of everything read once, plus artifact output ("net-new").
Disclosures the tournament forced: (a) agentic harnesses re-send context per turn —
billed input runs ~2-3x net uncached, ~1.2-1.5x with prompt caching; the 5-page session
cap exists partly to bound this; (b) reasoning-dense per-claim verdicts generate thinking
output, plausibly 2-4x the artifact output on thinking-enabled harnesses — unmodeled in
the net figures, disclosed here; (c) per-page figures are calibrated on this repo
(largest covered file 18.5KB) — ranges widen on repos with bigger files.

Measured inputs (this repo, 2026-06-12): 15 pages = 73,577 B ≈ 18.4K tokens (mean
4.9KB/page); `docs/wiki/AGENTS.md` = 17,869 B ≈ 4.5K; dedup covers union = ~242KB;
GLOSSARY 3,639 B.

**Per page:** page read ~1.2K + evidence ≤3x page bytes, observed ~2x ≈ 2.4K + invariant
sweep ~0.4K + negative-space ~0.2K + tool noise ~0.3K + output ~0.6K ≈ **~5.1K average**
(range 2.5-8K: ADRs ~3K on the light protocol; flow pages ~6-7K — FLOW-RENDER skipped,
inferred-edge checks added).

**Per session fixed:** AGENTS.md 4.5K + runbook ~1.4K + check output/scoping ~0.4K ≈
**6.3K** (the winner claimed 5K against a stale 12.6KB AGENTS.md measurement — corrected).

**(a) Full 15-page audit of this repo:** pages 16.2K (FLOW-RENDER skipped) + clustered
evidence 16-20K + sweeps ~5K + 3 sessions x 6.3K = 19K + output ~8K ≈ **~65-70K net**;
hard ceiling if every page burns its full 3x budget ≈ **~100K**. (Winner claimed 85K;
its cost attacker recomputed 62-72K realistic — the synthesis lands inside both.)

**(b) Steady state, 50-page wiki, moderate churn:** rotation K=6/month = 2 sessions
(5-page cap honored — the winner charged one): 6 x ~5.1K ≈ 31K + 2 x 6.3K ≈ 12.6K +
monthly triage ~10 items ≈ 8K ≈ **~50K/month net** (≈ 45K when escorts ride refresh
sessions and share fixed costs). Full rotation ≈ 8-9 months; hot pages reached sooner via
churn preference, and the journal clock means refresh activity never pushes them back.
Churn itself stays off audit's bill *legitimately* now: stale pages route to refresh, but
they re-enter the due-list on completion and the escort reaches them — the coverage hole
the winner's "never double-pays" slogan hid is closed, not re-billed.

**Scaling law, stated** (the winner's silence here was a major): coverage-constant cost
is **linear in page count** — K should scale ≈ ceil(pages/8)/month for an ~8-month
rotation. At 200 pages: K≈24/month ≈ 5 sessions ≈ **~140-155K/month net**. Holding K
fixed instead silently stretches the rotation (33 months at 200 pages) — K is a coverage
dial, and the dust line is what makes turning it an informed choice.

**One-time:** pipao migration ~30-35K. **Comparator (the brief's named failure):**
re-reading the whole repo + whole wiki monthly on a 50-page repo is 400K-1M+/month;
this design runs ~8-20x under it at the same horizon.

## 8. Dry-run validation (tournament evidence)

The protocol family this design belongs to was dry-run four times against the seeded
freshness-model page; the winner's own run, independently re-verified by its soundness
attacker:

- **3/3 seeds caught**, line-exact: coverage "exits 1 / CI gate" refuted by
  `wiki-coverage.mjs:25` ("Exit code is always 0 — an audit aid, never a gate") + all six
  exit sites; hook "exits 1 to block" refuted by `wiki-hook.mjs:10-14` (ALWAYS exits 0)
  + `:34`, plus the mechanism-incoherence flag (a post-commit hook cannot block);
  install-hook "replaces + hooksPath opt-out" refuted in both halves by
  `wiki-install-hook.mjs:9-12` (chaining-safe append; hooksPath respected as destination)
  + `:40-51`, `:88-93`.
- **Control: one genuine finding, zero damaging false positives** — the
  `wiki-check.mjs:53` vs `:58` citation drift (and the `:52-62` span clipping `:63-67`),
  confirmed by three independent attackers against a page whose six covers SHAs all
  matched `git hash-object`. Exactly the target class: wrongness behind unchanged bytes.
- **Measured footprint:** ~5.5K input + ~1K output for both audits combined (shared
  covers); standalone ≈ 4-4.5K/page — the per-page model's calibration point.
- **The miss that shaped the synthesis:** no span-anchored run would have caught the live
  "five masters" falsehood; only the clean-room design's code-first derivation had a
  trigger for it. Hence the invariant sweep graft, and the honesty that it is the
  *scoped* version (byte-capped) of a mechanism whose full form costs 2-4x.

## 9. Attack ledger — every critical/major on the winner

| Attack (severity) | Resolution |
|---|---|
| Hot-page starvation via shared `last_refreshed` clock (CRITICAL) | **Fixed:** journal clock — refresh stamps never reset audit age; never-audited first, churn-preferred within due set |
| Stale-routing overclaim — "refresh re-verifies them" false outside the diff (MAJOR) | **Fixed:** refreshed pages re-enter the due-list immediately; escort offer reaches them in-session; rewrite-path refresh counts as audit; targeted/no-op never do |
| GLOSSARY / ADR-Context / inferred-edge / summary scope holes (MAJOR) | **Fixed:** GLOSSARY slot; ADR present-tense claims audited everywhere incl. Context (Correction-bullet disposition); all inferred edges verified; summary+read_when in the claim list. **Scoped out, honestly:** ADR historical narrative; `docs/wiki/AGENTS.md` (tool-instantiated — audited upstream in this repo's dogfood, not in target repos); `index.md` (generated from audited summaries) |
| UNVERIFIED-demotion FP trap on true claims (MAJOR) | **Fixed:** three-cause UNVERIFIED; budget exhaustion → leave unstamped, never demote; provenance claims get one git-history read; platform facts noted, never demoted |
| Budget-vs-bless contradiction on large pages (MAJOR) | **Fixed:** leave-unstamped disposition (Clean-Room graft); bless requires every claim verdicted |
| Version skew — v2 grammar into v1-contract repos (MAJOR) | **Fixed:** Phase 0 version guard — offer the tooling update first, else write the local grammar |
| Standalone parity — missing umbrella routing row (MAJOR) | **Fixed:** sixth SKILL.md row shipped in the delta list |
| No standing trigger — month-two decay (MAJOR) | **Fixed:** dust line in the check workflow (computed, written nowhere, hook/exit codes untouched) + escort offer. **Honest limit:** no daemon; zero-session repos audit nothing — refresh's own liveness assumption, made visible rather than silent |
| Self-exempting ADR-009 divergence, no absorption plan (MAJOR) | **Fixed:** ADR-010 + dated ADR-009 Correction + wiki page + glossary entries, same-change absorption |
| Fixed-cost undercount; scaling law unstated; double-pay slogan (MAJORs, cost lens) | **Fixed:** corrected 6.3K/session x 2 sessions; linear scaling law + 200-page number stated; coverage hole closed rather than re-billed |
| Comment-laundering (inherited class risk) | **Fixed:** negative-space rule for universal claims. **Honest limit:** non-universal behavioral claims may still be confirmed from a truthful-looking span; see open questions |
| POSIX-shell assumptions; FINDINGS.md absent (minors) | **Fixed:** harness-agnostic phrasing; existence guards |
| Verdict inflation in the winner's own dry-run (minor) | **Fixed:** blanket confirmations forbidden; tallies are the contract; UNVERIFIED enumerated |

## 10. Grafts adjudicated

**Accepted** (12 — each cures a named attack at near-zero vendored cost): Patrol's
`audited` journal verb (the clock); Patrol's negative-space rule (byte-capped); Patrol's
covers-overlap clustering; Clean-Room's invariant sweep (scoped, byte-capped — not the
full clean-room ordering); Clean-Room's leave-unstamped disposition; Coattail's dust
line (workflow-side, neutrality explicit); Coattail's defanged escort (offer, max one,
just-refreshed-first); Coattail's rewrite-counts-as-audit (narrow); Docket's ±10
citation tolerance; Docket's stamp-only-non-event insight (automatic under the journal
clock); the recording-commit anchor backfill; the version-skew guard + parity row +
ADR-010 shipping discipline from the contract attacks.

**Rejected:** Patrol's planner script and 5-signal risk score (vendored surface;
S4 prose heuristic fragile; oldest-audited + churn preference achieves the rotation
without a script); Patrol's reserved anti-starvation slots (unnecessary once the clock
never resets); Docket's extraction tool and `_audit/ledger.md` (tool emission cost more
than it saved; ledger has rewrite-conflict semantics and is check-state-adjacent);
Docket's `[wiki]` / Clean-Room's `[page]` finding kinds (exceed ADR-009's ratified
class; the page plan is the sanctioned home for deferred page surgery); Clean-Room's
full read-code-first ordering (2-4x cost; the scoped sweep keeps ~80% of the catch);
Clean-Room's `last_audited` frontmatter (second clock, frontmatter churn); Coattail's
five-trigger contract, max() queue key, and escort obligation (each independently
defeated by its attackers); any vendored findings-check script for now (deferred behind
ADR-009's own revisit trigger, ratified in ADR-010).

## 11. Rejected alternatives — the five designs

- **Patrol (risk-ranked budgeted rotation).** Best dry-run discipline and the field's
  best single idea (negative-space). Decisive: every headline cost figure understated
  1.4-1.7x — its claimed per-page cost sat *below its own measured best-case-shared
  floor* — because covers-overlap amortization cannot span the 5 sessions K=3 forces;
  plus a planner script whose distribution wiring (VENDORED_SCRIPTS registration,
  umbrella row) was missing, and a ~16-mechanism census at the ceiling of what a team
  sustains.
- **Docket (claim-level audit with a blessed ledger).** Cleanest dry-run process.
  Decisive: the critical hit the verification core — "judge strictly from the printed
  span" trusts prose-about-code, so the commissioned drift class survives wherever a
  header comment lies; and its load-bearing premise ("churn costs audit nothing") was
  falsified by its own trigger (every re-stamp re-queues a full re-audit: 1.5-2.3x).
- **Clean-Room Audit.** The strongest verification engine — the only design that
  structurally catches uncited wrongness — and byte-exact measurements. Decisive: 2-4x
  read cost per page, ~1.6-2x scheduling waste vs a churn-gated alternative, and a
  critical scope perimeter (ADR Context/Decision triple lock-out across 9 of 15 pages)
  plus four unspecified integration seams its attacker called "disqualifying if shipped
  as written". Its engine survives here as the scoped invariant sweep.
- **Coattail (event-driven ride-alongs).** Honest execution, real token discipline.
  Decisive: 0/3 on the answer key (audited the wrong file — and its procedure had no
  target-validation step, itself the lesson); the max(last_audited, last_refreshed)
  queue key let unaudited refreshes masquerade as coverage; span-as-oracle blessed
  doc-quoting falsehoods (worse than no audit); a ~20-rule five-trigger contract
  predicted to shed silently in month one. Its dust line and escort survive, defanged.
- **The Stamp-Clock Audit** is not rejected — it is the base — but its original clock is:
  `last_refreshed` as audit evidence was the single decision that generated its critical
  and two of its majors. The journal verb keeps everything the stamp-clock bought
  (zero new state kinds, zero scripts) without the conflation.

## 12. Honest limits (admitted, not papered over)

1. **No daemon.** Audit cadence is bounded by check/refresh/explicit sessions. A dormant
   repo's wiki is unaudited and the dust line says so. Same liveness class as refresh.
2. **LLM-judgment variance** is the residual of any prompt-contract audit. Contained by
   the closed verdict set, entailment standard, negative-space rule, and checkable
   tallies — not eliminated.
3. **Comment-laundering is narrowed, not closed:** the negative-space rule fires on
   universal claims only. A non-universal behavioral claim mirrored by a lying comment
   can still pass. Pricing the broader rule is an open question.
4. **The invariant sweep is a sampler,** not the full clean-room: it reads headers and
   export structure, not whole files. Uncited wrongness whose evidence hides mid-function
   in an uncited file can survive. The full mechanism costs 2-4x and was rejected with
   eyes open.
5. **ADR historical narrative, `docs/wiki/AGENTS.md` (in target repos), and `index.md`**
   are out of audit scope, for stated reasons.
6. **Absence findings stay mechanically unanchorable forever** — `unanchored` is a label,
   not a solution.
7. **Audit-by-rote is detectable only by reviewers.** The `audited` line is self-reported
   evidence; the tally makes rote stamping checkable, not impossible. No deterministic
   backstop exists (unlike flows), and we say so rather than pretend.
8. **Net-token figures are not bills.** Billed input runs 1.2-3x net depending on caching;
   thinking output is unmodeled. The session cap bounds, not erases, the multiplier.

## 13. Open questions

1. Does pipao's first real triage prove the emptying loop, and is hand-hashing measurable
   friction — i.e., does the deferred findings-check script (~30 lines) earn vendoring?
2. Does the negative-space byte cap (~120 lines/page) survive large target repos where
   popular symbols have hundreds of hits, or does it need per-repo tuning?
3. Should rewrite-path refresh keep counting as an audit-bless, or does dual-producer
   blessing dilute the `audited` line? Measure across two dogfood rotations.
4. Is a blanket "no comment is sole entailment for behavior" rule affordable, or does the
   universal-claims rule cover the laundering class in practice?
5. Horizon (90d) and the K=ceil(pages/8) dial: right defaults past ~100 pages?
6. Does the strict `audited` log grammar survive loose human journaling, or does it
   eventually justify a ~5-line lint in wiki-check (warning-only, exit untouched)?
7. GLOSSARY slot cadence: once per rotation is a guess; tune after the first cycle.

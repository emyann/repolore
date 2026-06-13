# RESEARCH: should repolore ship orchestration workflows?

> Decision record for the orchestration-workflow question: should repolore
> productize multi-agent fan-out workflows for wiki tasks (init draft, audit,
> refresh, flows-regen, check, update, findings-triage), and if so in what
> form? Verdict: **mostly Option B (scoped guidance notes), zero Option C
> (workflow scripts), Option A (nothing) for the negative-control tasks.**
> Grounded in the repo as of plugin v0.4.6 (`.claude-plugin/plugin.json`),
> 2026-06-12. Companion to `docs/RESEARCH-AUDIT.md`, whose §7 cost model is
> load-bearing here.

## 1. The question this owns

repolore ships two KINDS of thing, and conflating them is the trap:

1. **Procedures** — `references/{init,check,refresh,update,setup,flow,audit}.md`
   LLM runbooks. Harness-agnostic: one agent reads and executes them; they
   invoke vendored node+git stdlib scripts. The canonical path. Work
   identically in the plugin AND in the ~20 skills.sh agents (ADR-004).
2. **Orchestration workflows** — the multi-agent kind (the Claude Code
   Workflow tool / `.claude/workflows/*.js` / the Agent SDK). They spawn
   sub-agents, fan out, synthesize. They require the harness's orchestration
   runtime; they are NOT stdlib, NOT offline, NOT vendorable, and NOT runnable
   by the ~20 skills.sh agents.

The pattern is in **live ad-hoc use**, not hypothetical. A power user (Yann)
hand-rolled three orchestration workflows totalling ~66KB in
`/Users/yrenaudin/Documents/Projects/sword/shopify-nl/.claude/workflows/`
(`wiki-completeness-audit.js` 36,577 B, `sync-flowcharts.js` 15,126 B,
`subsystem-flowcharts.js` 14,014 B) for the exact 40-page wiki repolore now
audits by hand. The question is whether to PRODUCTIZE this.

Three options weighed throughout: **(A) ship nothing**; **(B) ship a guidance
note** in the procedures (zero runtime, harness-agnostic, no parity break);
**(C) ship reference workflow scripts** (plugin-only / Agent-SDK).

## 2. The hard constraints (verified against the ADRs)

Every constraint below was read in-repo, not assumed.

1. **ADR-003** (`docs/wiki/decisions/adr-003-stdlib-only-vendored-scripts.md`):
   vendored scripts import exclusively `node:` builtins and shell only to
   `git` — "what makes the skill agent-portable — any harness with node + git
   can run the checks" (line 33). An orchestration runtime is strictly more
   than node+git, so it is the one artifact that **by construction cannot live
   in `.repolore/`**.
2. **ADR-006** (`adr-006-vendored-tooling.md`): "The trust model requires
   verification with nothing installed... a wiki most readers cannot verify is
   prose with decoration" (reasons 1, 3, 4). Vendored tooling must survive
   bare-checkout, offline, after the plugin is gone. A workflow script honors
   none of these.
3. **ADR-004** (`adr-004-umbrella-skill-plugin-shims.md`): dual distribution.
   "The two front doors cannot drift: there is nothing to drift" (line 54).
   The skills CLI installs only the skill folder; the ~20 skills.sh agents read
   procedures with their own tools and are **never handed** the `agent()` /
   `parallel()` / `phase()` runtime a `.claude/workflows/*.js` depends on. Any
   shipped workflow is **plugin-only by construction**.
4. **ADR-010** (`adr-010-audit-evidence-contract.md`): token frugality is a
   first-class requirement, equal to soundness. "Zero new vendored scripts,
   zero new state kinds... no verdict cache (stale verdicts are worse than
   re-reads)... The vendored surface — the product's sorest migration point —
   does not grow" (Decision §3). The audit was DELIBERATELY designed as a
   SEQUENTIAL, budgeted prompt contract — explicitly NOT a fan-out.
5. **ADR-007** (`adr-007-verification-ladder-placement.md`): the set-equality
   extractor — the only way to know which flows exist — is **user-space,
   proven non-vendorable by a build-off** (Finding 2; "correct home is user
   space"). The load-bearing payload of a flows-regen workflow cannot be owned.
6. **ADR-002**: status computed, never committed (clean-tree invariant).
   Consent + never-block doctrine: nothing runs unasked, nothing gates.

## 3. The token-cost model (verified, `docs/RESEARCH-AUDIT.md` §7)

The frugality objection is not hand-waved — it is measured. §7, read verbatim:

- **Per-page:** ~5.1K tokens average (15 pages = 73,577 B ≈ 18.4K input;
  span reads + sweeps + negative-space + tool noise + output).
- **Per-session fixed:** AGENTS.md 4.5K + runbook ~1.4K + check output ~0.4K ≈
  **6.3K** (the design's original 5K was a stale-AGENTS.md undercount,
  corrected here).
- **Full 15-page audit:** ~65-70K net.
- **The understatement trap (§2, line 57):** "Cost models lie in fixed costs
  and scheduling, not per-page reads... the understatements (1.4-2.3x) came
  from session fixed costs, cross-session re-reads, and churn re-triggers."

This is the crux. **Fan-out re-pays the 6.3K/session fixed cost PER AGENT** and
**destroys covers-overlap dedup** — the sequential clustering mechanism
(`references/audit.md:39`, "Cluster the K picks by covers overlap so shared
evidence files are read once per session") that exists precisely to amortize
shared evidence. Fan-out inverts the savings the design was built to capture.

**Conclusion, applied uniformly across every per-task assessment:** fan-out
saves WALL-CLOCK, not tokens — it almost always increases tokens (audit ~1.5-2x;
draft-fanout ~1.4-2x; refresh +20-40%; flows-regen "materially worse";
check/update/triage neutral-to-worse with zero benefit). "Parallel = better" is
a latency claim, never a cost claim. The report does not let it smuggle in.

## 4. Per-task adjudication

| Task | Fan-out region | Token Δ | Wall-clock Δ | **Decision** | Decisive reason |
|---|---|---|---|---|---|
| Cold-bootstrap / draft (init) | one agent/slug, barrier before index/budget/glossary/related-links | **+1.4-2x** | **8x** (~80-120→15-20 min, N=8) | **B** | Largest demonstrated win; coherence work deferred to barrier; non-obvious safe shape worth teaching |
| Flow-family regen (flow) | gen+verify per flow, checker barrier | worse | **3-5x** | **B** | Payload (extractor/SLUG_META/PAGES) is user-space, non-vendorable (ADR-007) — ship the pattern, not the script |
| Audit cold full-rotation | by COVERS-OVERLAP CLUSTER, barrier before bless/journal | **+1.5-2x** | days→minutes (cold only) | **B** | Per-page fan-out is worst case; verdict-cache ban (ADR-010) forbids distributed verdicts |
| Coverage-gap → page-plan (check) | subsystem mappers, barrier before gap-matrix + config edit | worse | high | **B (optional)** | Exact shape of shopify-nl Phases 1-4; lower frequency |
| Refresh | per-page triage, barrier before index/log/glossary | **+20-40%** | neutral-to-marginal (1-5 pages) | **B-minimal / leans A** | Typical set 1-5 pages; crossover ~8-15; `wiki-flow-refresh.mjs` already covers the mechanical subset |
| Findings Phase-T triage | parallel pre-reads only | neutral-to-worse | ~zero | **A** | Bottleneck is the sequential human consent gate (4 exits, ADR-009), not LLM latency |
| Check (negative control) | none exists | worse | worse | **A** | 4 deterministic stdlib scripts (~100ms) + 1 summary; no LLM sub-task to fan out |
| Update (negative control) | none safe | **+2-3x** | worse | **A** | Sequential safety-critical manifest loop; fan-out races the manifest (ADR-002) or builds a drifting 2nd enforcement point |

Script sizes confirming the check negative control:
`scripts/wiki-check.mjs` 155 lines, `wiki-coverage.mjs` 155, `wiki-index.mjs`
109, `update.mjs` 250 — all sub-second deterministic processes.

## 5. The live precedent — demand AND sufficiency

`wiki-completeness-audit.js`, read in full, is decisive in two directions:

1. **It is a DIFFERENT task.** Its phases (`grep -nE 'phase|parallel'`): Phase
   1 per-subsystem feature-surface MAPPERS (parallel), Phase 3 gap-matrix +
   per-page audience audits, Phase 4 missing-page verification, Phase 5 write
   missing pages. That is **completeness-gap mapping**, not the per-claim
   truth-value audit of `references/audit.md`. The natural independence of
   subsystem mappers is real for THAT task; it does not transfer to per-claim
   audit, where covers-overlap clustering is a deliberate ANTI-fan-out dedup.
2. **It already encodes the Option-B shape.** Phase 6 comment, verbatim:
   *"Finalize: index + manifest + freshness (single agent; touches the shared
   index/config files, so it must run alone, after the pages exist)."* Parallel
   mappers → sequential barrier finalize. **That IS the doctrine repolore
   should teach** — a user re-derived it from scratch. The orchestration shell
   is thin (~40 lines of `parallel()`/`pipeline()` glue); everything
   load-bearing is repo-specific user-space literals (the 6-entry MAPPERS
   table, the REPO topology string, the absolute SESSION_DIR, the 11-entry
   SLUG_META, the hand-curated PAGES array). **You cannot ship the part that
   matters.** This is the structural reason C reduces to B.

A user hand-rolling exactly the orchestration they needed, for their repo's
topology, in one session — and it ran — is the harness-agnostic-procedure
design **succeeding**, not a gap. It is evidence of demand (B is warranted) AND
evidence that A already works for the user who needs it most (C is not
necessary).

## 6. Why not C (workflow scripts) — the four-way veto

A shipped `.claude/workflows/*.js` fails on every relevant ADR at once:

1. **Non-vendorable** (ADR-003/006): needs the harness runtime, can never live
   in `.repolore/`, never reaches bare-checkout/offline/CI/post-plugin readers.
2. **Plugin-only parity break** (ADR-004): the ~20 skills.sh umbrella installs
   cannot load it — a documented asymmetric capability in a product whose spine
   is "one source, two distributions, nothing to drift."
3. **Token-worse default** (ADR-010): institutionalizes the 1.4-2x regression
   the audit design was built to avoid; covers-overlap dedup lost across agents.
4. **Forever-maintenance tax**: tracks a moving, unowned harness API. The
   shopify-nl scripts already carry comment-level workarounds for runtime churn
   ("workflow scripts cannot call Date.now()... would break resume";
   "args.today is not always plumbed through"). A vendored stdlib script is
   byte-stable forever (ADR-006 survivability); an orchestration script is not.

**Is the Agent SDK an escape hatch?** No, on two grounds verified in-repo:
(a) `grep -rniE 'agent sdk|@anthropic-ai|claude-agent-sdk'` across every
`.md`/`.mjs`/`.js`/`.json` returns **zero** results — repolore has never
modeled it as a distribution path. (b) Mechanically it is a THIRD product (a
Node program importing the SDK, with an npm dependency, API key, and network
path) that collides head-on with ADR-003 (stdlib-only, offline, bare-checkout)
and ADR-006 (verify with nothing installed), and reaches NEITHER actual
distribution — `npx skills add` ships a skill folder, not an SDK runtime; the
plugin ships shims, not an SDK program. The SDK swaps a plugin-only asymmetry
for an SDK-program-only asymmetry. Net-new surface for net-zero reach.

## 7. The Option-B shape (precise)

Four notes, each one scoped paragraph, clearly OPTIONAL and OUT-OF-BAND:

1. **`references/init.md` (cold-bootstrap / draft-fanout):** *"If your harness
   supports parallel sub-agents and you are bootstrapping a large wiki from
   scratch, you MAY fan out one draft agent per planned slug (each reads only
   its own source files, writes one page, runs wiki-stamp). Place a BARRIER
   before the shared-file reconcile — `wiki-index.mjs` regen, page-budget
   check, GLOSSARY.md reconcile, related-links wiring — all in a SINGLE
   sequential agent after every page exists. Bless/commit sequentially. Saves
   wall-clock, costs ~1.4-2x tokens, needs an orchestration runtime (not
   standalone skill installs)."*
2. **`references/audit.md` (cold full-rotation ONLY):** *"For a one-shot cold
   rotation of a large wiki (NOT the K=5/session steady-state cadence), you MAY
   fan out by SUBSYSTEM CLUSTER (never by page — covers-overlap evidence dedup
   is lost across agents, so per-page fan-out is the worst case). Barrier
   before the log.md bless + journal; every claim on a page must be verdicted
   by the SAME agent that read its evidence (no distributed verdict cache —
   ADR-010)."*
3. **`references/flow.md` (family regen):** *"Regenerating a flow family, you
   MAY fan out one gen+verify agent per flow over the list YOUR set-equality
   extractor returned; run `wiki-flow-check` + `wiki-check` as a sequential
   checker BARRIER before any fix round; do not bless until it passes."*
4. **`references/check.md`** (optional, coverage-gap population): *"Coverage-
   driven batch drafting MAY fan out subsystem-mapper agents; barrier before
   the gap-matrix synthesis and the wiki.config.yml edit."*

Each note: names the barrier explicitly, states the token tradeoff honestly,
names the harness requirement, points to `wiki-completeness-audit.js` Phase 6
as the live reference. **Ship NOTHING for check, update, Phase-T triage** — no
safe fan-out region exists; a note there is a footgun.

## 8. Rejected alternatives

- **Pure A (ship nothing, not even a note)** — *rejected for the four
  with-barrier tasks.* Leaves proven demand unserved; the next power user
  re-derives the safe barrier placement from scratch and hits the easy footguns
  (fan out by page not cluster; skip the index/glossary barrier; build the
  verdict cache ADR-010 rejects). The product's own doctrine stays locked in
  ADRs the user never reads. *Accepted for check/update/triage* — there is
  genuinely nothing to guide toward.
- **Option C, any task** — *rejected universally.* Four-way ADR veto (§6); and
  for flows the payload is non-vendorable user-space (ADR-007), so C ships the
  cheap shell and forces every adopter to supply the expensive part anyway.
- **Agent-SDK reference program** — *rejected.* Zero precedent in-repo; a third
  product reaching neither distribution; collides with ADR-003/006.
- **A `findings-check` / risk-planner / verdict-cache style script to enable
  fan-out** — *already rejected upstream by ADR-010* ("zero new scripts, zero
  new state kinds"; "stale verdicts are worse than re-reads").

## 9. Honest limits

- B documents a pattern repolore cannot test in CI or freshness-track like a
  vendored script. Mitigation: notes live inside covered `references/*.md`, so
  the dogfooded `wiki-check` flags them stale on drift. A note that omits the
  token caveat or fails to scope to cold-start is worse than silence.
- The wall-clock win is concentrated on infrequent batch ops (cold bootstrap,
  large flow-family regen, cold full rotation). The steady-state cadence
  (K=5/session audit, 1-5 page refresh) is the design's target and never wants
  fan-out. If the cold path is genuinely once-per-repo-and-never-again, even B
  is overhead and pure A wins on simplicity.
- A "fan out if your harness supports it" note is a harness-capability fork
  inside otherwise harness-agnostic prose. It must read as optional/out-of-band
  or it leaks the asymmetry it was meant to avoid.

## 10. Open questions

1. Is cold full-rotation / cold-bootstrap of a large wiki rare enough that no
   user hits it twice? If so, B is overhead and A wins.
2. Does the Agent SDK ever become a path the ~20 skills.sh agents can invoke?
   Today: zero references, reaches neither distribution. If it changes, ADR-004's
   parity veto on C weakens for the wall-clock-bound tasks.
3. Can "independent reads → barrier before shared-file reconcile → sequential
   bless" be stated harness-AGNOSTICALLY? If not, any note is implicitly
   C-shaped and re-introduces the parity problem in prose.
4. Does positioning stay "one vendored, offline, agent-portable contract" or
   drift plugin-first? ADR-006's own revisit trigger (a universal `skills.lock`)
   is the named condition under which the vendoring + parity calculus flips.
5. If real-world use shifts from steady-state to repeated cold rotations on 40+
   page wikis, the value side of the ledger flips — a vetted, documented-as-
   token-worse reference workflow could become the lesser evil. Frugality
   objection survives; demand changes.

## 11. Verdict

**Ship Option B for init (cold-bootstrap), flow (family regen), audit
(cold-rotation by cluster), and optionally check (coverage-gap). Ship A for
check, update, and findings-triage. Ship no Option-C workflow script or
Agent-SDK program.** Fan-out buys wall-clock, never tokens; the notes say so
honestly and scope strictly to cold/large one-shot runs. This is the repolore
way — an honest documented limit beats a pretended capability half your users
cannot run. The user who needed orchestration already built it; repolore's job
is to hand the next one the safe shape, not a runtime.
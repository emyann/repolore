# repolore — roadmap

> The single roadmap home. The README keeps a short pointer here; the
> numbering in [RESEARCH.md](./RESEARCH.md) §7 was the original point-in-time
> plan and has diverged (§7 says so too). Detailed notes for recent releases
> live on the [GitHub Releases page](https://github.com/emyann/repolore/releases).

## Now — the v0.4.x line is complete ✦

- [x] **Reference set-equality extractor** — shipped v0.4.3.
      `flows/update-classification` reaches `set-validated`; the worked example
      target repos copy for their own closed-world tool flows.
- [x] **Diff-scoped flow-refresh** — shipped v0.4.4. `wiki-flow-refresh.mjs`
      turns a stale flow page into a precise per-citation worklist; `--apply`
      fixes the provably-safe classes mechanically.
- [x] **The `audit` workflow + findings-inbox v2** — shipped v0.4.5 (the
      Journal-Clock Audit, [RESEARCH-AUDIT.md](./RESEARCH-AUDIT.md) / ADR-010):
      per-claim verification of fresh pages, the strict `audited` journal line
      as the only record, findings v2 anchors + four-exit triage.

Next focus comes from the v0.5+ list below; open audit questions
(extractor-script vendoring gate, negative-space caps at scale, the `audited`
grammar lint) are tracked in RESEARCH-AUDIT §13 and ADR-010.

## Next (v0.5+)

- `wiki-index.json` connector contract + `llms.txt` emitter.
- Quartz site (renders flows from the `.repolore/flows/*.flow-meta.json`
  sidecars) + MCP connector recipes.
- GitHub Action recipe (CI freshness check); Copilot `applyTo` / Cursor `.mdc`
  emitters.

## Tooling debt (unversioned)

- A GitHub Action that creates a Release on every `v*` tag push — retires the
  manual step 5 of the release ritual (`CLAUDE.md`), which already lapsed once
  (Releases stuck at v0.3.4 while tags shipped to v0.4.1).

## Version history

Newest first. One entry per release; the `chore(release)` commit adds the line.

- **v0.4.5** — the audit workflow + findings-inbox v2 (the **Journal-Clock
  Audit**, design by a 23-agent adversarial tournament —
  [RESEARCH-AUDIT.md](./RESEARCH-AUDIT.md), ratified in ADR-010): per-claim
  verification of *fresh* pages against the code (the drift class hashes
  can't see — found live twice in this repo's own wiki), with the strict
  `## date — audited <page> (N claims: …)` journal line as the only
  committed record; due-list and the check workflow's dust line computed
  from it per run. Findings-inbox v2: invisible per-item blob-SHA anchors,
  `unanchored` absence findings, recording-commit backfill, four deleting
  triage exits. Zero new vendored scripts; ~65-70K tokens for a full
  15-page audit. Ships with the first real audited page
  (`decisions/adr-002-computed-status`, 10/10 claims confirmed).
- **v0.4.4** — diff-scoped flow refresh: the new vendored
  `wiki-flow-refresh.mjs` diffs each recorded blob against the working tree and
  classifies every flow citation (`current` / `untouched` / `shifted` /
  `touched` / `gone` / `unknown`); `--apply` mechanically fixes only the
  provably-safe classes (byte-identical spans — bookkeeping, not blessing) and
  leaves the rest at their old SHA so `wiki-flow-check` fails on exactly the
  citations that still need a human. The per-file stale signal becomes a
  per-span worklist; `covers:` stays wiki-stamp's. Dogfood-proven: a mixed
  shift+touch edit to `update.mjs` auto-fixed 13 citations and left exactly 1.
- **v0.4.3** — flows v2 begins: the reference user-space set-equality extractor
  (`.repolore/validators/update-classification-seteq.mjs`, plain Node stdlib)
  rebuilds `update.mjs`'s disposition set from code;
  [`flows/update-classification`](./wiki/flows/update-classification.md) flips
  `flow_asserts_complete: true` and reaches **`set-validated`** — an omitted
  branch is now a hard fail. `references/flow.md` gains the copyable worked
  example. Roadmap extracted from the README into this doc.
- **v0.4.2** — the flow authoring loop, fixed end-to-end: `wiki-stamp.mjs` now
  fills every inline flow `*_sha` (`anchor_sha`/`call_anchor_sha`/`cite_sha`)
  from its sibling `*_path`, not just `covers` — the half v0.4.1 promised but
  never wrote (caught by two independent dogfood runs). Ships the second
  dogfood flow page, [`flows/update-classification`](./wiki/flows/update-classification.md).
- **v0.4.1** — flows v1 finished for every harness: a `sequence` diagram
  projection (`flow_render: sequence` — same flow-meta, actors→participants,
  edges→messages; verification unchanged), and the flow authoring loop +
  verified-vs-inferred rule folded into the vendored `AGENTS.md` so a target
  repo can draft a flow without the plugin-side `references/flow.md`.
- **v0.4.0** — flows v1 (a new page category, [RESEARCH-FLOWS.md](./RESEARCH-FLOWS.md),
  design chosen by an adversarial 5-approach build-off): a flow is line-parseable
  `flow-meta` from which `wiki-flow-render.mjs` *generates* a GitHub-safe Mermaid
  diagram + anchored tables; `wiki-flow-check.mjs` computes the tier (structural →
  anchored → **directional** edge-cited → branch-audited → set-validated). The
  directional graft — a `verified` edge must cite the call site in the caller's
  own code and name the callee — closes the edge-existence hole that broke all
  five prototypes; set-equality is proven non-vendorable and lives in a
  user-space `validators:` seam (ADR-007).
- **v0.3.9** — the findings inbox actually works: `wiki-check`/`-index`/the page
  budget now skip `FINDINGS.md` (added to `SKIP_FILES`), so the inbox stops
  being flagged `MALFORMED`. Caught by the first real migration (pipao's
  28-item backlog).
- **v0.3.8** — update closes the stale-plugin loop: `update.mjs` names the
  installed version in its report, and the workflow probes the marketplace
  clone on disk (zero network, best-effort) and offers the consented channel
  refresh, ending with the user-only reload step.
- **v0.3.7** — the findings inbox (v1, convention only): code-defect findings
  surfaced while drafting/refreshing pages get a `FINDINGS.md` relay buffer
  beside the wiki — outside page semantics, consent-only writes,
  deletion-not-checkbox triage. See ADR-009 +
  [RESEARCH-FINDINGS.md](./RESEARCH-FINDINGS.md).
- **v0.3.6** — Claude-aware entry-point wiring: `AGENTS.md` stays the one
  canonical pointer and each harness links to it natively (an `@AGENTS.md`
  import for `CLAUDE.md`, the literal block for Copilot). See ADR-008.
- **v0.3.5** — check offers a clean tooling update interactively (a one-tap
  question), not just a prose pointer.
- **v0.3.4** — the setup workflow: available-but-inactive capabilities become
  one consented question; team-wide nudge recipes (husky dir, npm `prepare`).
- **v0.3.2** — the post-commit nudge: per-contributor, chaining-safe, never
  blocks (silent when green); installed by init (consented), offered by update.
- **v0.3.1** — the glossary feeding loop: init seeds 3–8 cited terms, the
  page workflows must record every term they coin, check reports an empty
  glossary as a smell.
- **v0.3.0** — the `update` workflow: manifest-hash safe regeneration of the
  vendored layer (+ fixed the unquoted-config bug it uncovered).
- **v0.2.3** — init optionally wires team auto-update into `.claude/settings.json`.
- **v0.2.2** — the page plan made visible: backlog in the generated `index.md`,
  plan↔reality drift lints in `wiki-check`.
- **v0.2.1** — standalone distribution via the skills CLI: root umbrella
  `SKILL.md`, single-source procedures in `references/`, plugin skills as shims.
- **v0.2** — config-driven one-shot `bootstrap.mjs` (dry-run scope census,
  SHA-tracked vendoring, self-verification); init UX overhaul; deterministic +
  agentic test harness.
- **v0.1** — init, check, refresh, stamp, generated index.

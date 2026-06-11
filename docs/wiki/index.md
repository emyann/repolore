# repolore — wiki index

> GENERATED FILE — do not edit by hand. Regenerate with `node .repolore/scripts/wiki-index.mjs`.
> One line per page, taken verbatim from each page's frontmatter `title`/`summary`.
> Schema and authoring rules: [AGENTS.md](./AGENTS.md).

## Architecture

- [Overview — three surfaces, one implementation](./architecture/overview.md): The three surfaces — Claude Code plugin, standalone umbrella skill, vendored per-repo layer — and how they share one implementation.

## Concepts

- [The freshness model](./concepts/freshness-model.md): fresh/stale/unmanaged/malformed semantics, covers lists, and the coverage inversion.

## Decisions

- [ADR-001: Use git blob SHAs as freshness anchors — never LLM judgment](./decisions/adr-001-blob-sha-freshness-anchors.md): Git blob SHAs drive staleness detection; LLM judgment is never the trigger.
- [ADR-002: Freshness status is computed on demand, never committed](./decisions/adr-002-computed-status.md): Freshness status is computed on demand, never written to the tracked tree.
- [ADR-003: Vendored scripts are node+git stdlib only — zero npm install](./decisions/adr-003-stdlib-only-vendored-scripts.md): Vendored tooling is node+git stdlib only — zero npm install in target repos.
- [ADR-004: One source of procedures, two distributions — root umbrella skill + plugin shims](./decisions/adr-004-umbrella-skill-plugin-shims.md): One source of procedures (references/), two distributions — root SKILL.md umbrella and plugin shims.
- [ADR-005: Init delegates all mechanical vendoring to config-driven bootstrap.mjs](./decisions/adr-005-bootstrap-mechanical-vendoring.md): Init delegates all mechanical vendoring to config-driven bootstrap.mjs; the LLM keeps only judgment work.
- [ADR-006: Vendor the tooling into every repo — verification must survive the tool](./decisions/adr-006-vendored-tooling.md): Why generic, non-repo-specific scripts are committed into every initialized repo instead of running from the plugin install or npm.

## Gotchas

- [Cross-tool depth is untested — nudge strength varies by agent](./gotchas/cross-tool-depth-untested.md): Wiki consumption depth varies by agent nudge strength; pointer-block-only teams (Copilot) are untested.

## Howto

- [Run the init-UX test harness](./howto/run-the-ux-harness.md): Running the deterministic test suite and the agentic init-UX workflow.

## Planned (not yet written)

- decisions/adr-007-verification-ladder-placement: Vendored stdlib owns structural→branch-audited flow checks; set-equality extractors live in user space. To accept before v0.4 code exists.
- flows/bootstrap-vendoring: How init's one-shot vendoring executes: config → bootstrap.mjs → verified scaffold. (Blocked on flow-meta v1 — see docs/RESEARCH-FLOWS.md.)
- flows/check-health: How the check workflow reports wiki health — freshness, coverage, backlog and tooling-update classification — as read-only signals that become offers, never gates. (Blocked on flow-meta v1.)
- flows/refresh-triage: How the refresh workflow brings stale pages back into line: diff-driven triage (re-stamp / targeted edit / rewrite), citation re-verification, re-stamp, reviewable commit. (Blocked on flow-meta v1.)
- flows/update-classification: How the update workflow classifies and applies tooling changes from the (recorded, current, master) SHA triplet. (Blocked on flow-meta v1.)

> Backlog from the page plan (`pages:` in `wiki.config.yml`) — draft on demand: "draft `<slug>` from the wiki plan".

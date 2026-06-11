# repolore — wiki index

> GENERATED FILE — do not edit by hand. Regenerate with `node .repolore/scripts/wiki-index.mjs`.
> One line per page, taken verbatim from each page's frontmatter `title`/`summary`.
> Schema and authoring rules: [AGENTS.md](./AGENTS.md).

## Architecture

- [Overview — three surfaces, one implementation](./architecture/overview.md): The three surfaces — Claude Code plugin, standalone umbrella skill, vendored per-repo layer — and how they share one implementation.

## Decisions

- [ADR-001: Use git blob SHAs as freshness anchors — never LLM judgment](./decisions/adr-001-blob-sha-freshness-anchors.md): Git blob SHAs drive staleness detection; LLM judgment is never the trigger.
- [ADR-002: Freshness status is computed on demand, never committed](./decisions/adr-002-computed-status.md): Freshness status is computed on demand, never written to the tracked tree.
- [ADR-003: Vendored scripts are node+git stdlib only — zero npm install](./decisions/adr-003-stdlib-only-vendored-scripts.md): Vendored tooling is node+git stdlib only — zero npm install in target repos.
- [ADR-004: One source of procedures, two distributions — root umbrella skill + plugin shims](./decisions/adr-004-umbrella-skill-plugin-shims.md): One source of procedures (references/), two distributions — root SKILL.md umbrella and plugin shims.
- [ADR-005: Init delegates all mechanical vendoring to config-driven bootstrap.mjs](./decisions/adr-005-bootstrap-mechanical-vendoring.md): Init delegates all mechanical vendoring to config-driven bootstrap.mjs; the LLM keeps only judgment work.

## Gotchas

- [Cross-tool depth is untested — nudge strength varies by agent](./gotchas/cross-tool-depth-untested.md): Wiki consumption depth varies by agent nudge strength; pointer-block-only teams (Copilot) are untested.

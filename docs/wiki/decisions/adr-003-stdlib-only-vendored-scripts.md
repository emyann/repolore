---
title: "ADR-003: Vendored scripts are node+git stdlib only — zero npm install"
summary: Vendored tooling is node+git stdlib only — zero npm install in target repos.
category: decisions
kind: decision
audience: [dev]
read_when: "adding a dependency, a YAML parser, or any import to scripts/*.mjs"
status: accepted
date: 2026-06-10
supersedes: ~
superseded_by: ~
covers:
  - path: scripts/lib.mjs
    sha: cb68e36bdab46efcbffaf160d19e55bac46a30cb
  - path: scripts/wiki-coverage.mjs
    sha: defc70c4060d7a2282cde9f4c209c19cae438070
  - path: scripts/wiki-index.mjs
    sha: bec9d422ad667eaf124bc5d33ff0483188061418
generated_at_commit: 43f4132
last_refreshed: 2026-06-11
related: [decisions/adr-001-blob-sha-freshness-anchors, decisions/adr-005-bootstrap-mechanical-vendoring]
---

# ADR-003: Vendored scripts are node+git stdlib only — zero npm install

## Context

The scripts are copied into arbitrary target repos at init. Anything they
import becomes a dependency of *every adopting repo*: a toolchain to install,
a supply-chain surface, a version to rot. Agent-tooling frameworks get
ripped out over toolchain weight (`docs/RESEARCH.md` §5d); repolore's whole
pitch is one hidden directory and no install step. This is also what makes
the skill agent-portable — any harness with node + git can run the checks.

## Decision

Every file under `scripts/` imports exclusively from `node:` builtins
(`scripts/lib.mjs:8-10`) and shells out only to `git`. Consequence accepted
knowingly: **no real YAML parser.** The scripts parse exactly the controlled
schema this tool itself writes — line-based frontmatter and config parsing in
`scripts/lib.mjs` (`fmScalar`, `configLists`, `parseCovers`) — documented as
"not arbitrary YAML" (`scripts/lib.mjs:5-6`). The flip side of that bargain:
everything *written* into wiki.config.yml must stay strictly-valid YAML for
external tools, which is why bootstrap double-quotes free-text values
(`scripts/bootstrap.mjs`).

## Consequences

- `npx skills add` / plugin install is the entire setup; checks run anywhere.
- Schema evolution is constrained: new config shapes must stay line-parseable.
- Plugin-side-only tooling (e.g. a future index/connector hub) MAY carry npm
  dependencies — the pledge is scoped to what gets vendored.

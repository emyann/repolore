---
title: Overview — three surfaces, one implementation
summary: The three surfaces — Claude Code plugin, standalone umbrella skill, vendored per-repo layer — and how they share one implementation.
category: architecture
kind: explanation
audience: [dev]
read_when: "touching packaging, distribution, the shims, or anything under references/"
covers:
  - path: SKILL.md
    sha: e87c7c7cad22195b27b5548307aae7c61a6ce550
  - path: references/init.md
    sha: d443f18f13ccbaece98d8c5c911a9c25c95fec7a
  - path: scripts/bootstrap.mjs
    sha: e5c667de838837c43be457a151c7f6003584c86b
  - path: .claude-plugin/plugin.json
    sha: 4c5f8c55f7047fa840405d554d0afbb383b5212d
generated_at_commit: 09ee74a
last_refreshed: 2026-06-11
related: [decisions/adr-004-umbrella-skill-plugin-shims, decisions/adr-005-bootstrap-mechanical-vendoring, concepts/freshness-model]
---

# Overview — three surfaces, one implementation

> repolore bootstraps and maintains code-derived LLM wikis in *other* repos.
> This page orients you in how this repo itself is put together; this wiki is
> repolore running on repolore.

## The three surfaces

1. **Claude Code plugin** — declared by `.claude-plugin/plugin.json` and
   `marketplace.json`; surfaces the namespaced commands `/repolore:init`,
   `/repolore:check`, `/repolore:refresh`. The three files under `skills/`
   are deliberately thin shims (`skills/init/SKILL.md`).
2. **Standalone umbrella skill** — the root `SKILL.md`, installed by
   `npx skills add emyann/repolore` into ~20 agents. Root-`SKILL.md`
   discovery means the skills CLI sees exactly one skill and the plugin
   internals stay hidden (see ADR-004).
3. **Vendored per-repo layer** — what init leaves inside a *target* repo:
   `docs/wiki/` content + `.repolore/scripts/` (copies of the five masters in
   `scripts/`) + `.repolore/manifest.json` tracking every vendored file by
   blob SHA.

Both front doors execute the same procedures: `references/init.md`,
`references/check.md`, `references/refresh.md`, written against
`<SKILL_ROOT>` — the directory holding `SKILL.md`, `scripts/`, `templates/`.
The judgment/mechanics split: procedures (LLM judgment) live in markdown;
everything deterministic lives in `scripts/bootstrap.mjs` and the four
vendored checkers (see ADR-005).

## Self-referential quirk worth knowing

Because this repo runs repolore on itself, `.repolore/scripts/` here are
vendored **copies** of the `scripts/` **masters** in the same repo. When a
master changes, the check workflow's tooling-update nudge flags the drift —
that is the live demo of the update mechanism, not a bug
(`references/check.md`).

## Test harness

Two layers (see `howto/run-the-ux-harness`, planned): deterministic
`node --test` over the bootstrap path (`tests/bootstrap.test.mjs`, CI), and
an agentic workflow (`.claude/workflows/test-init-ux.js`) that executes the
init procedure in fixture repos built by `tests/make-fixtures.mjs`, validates
end state with `tests/validate-fixture.mjs`, and judges the UX with a rubric.

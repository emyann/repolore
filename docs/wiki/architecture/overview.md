---
title: Overview — three surfaces, one implementation
summary: The three surfaces — Claude Code plugin, standalone umbrella skill, vendored per-repo layer — and how they share one implementation.
category: architecture
kind: explanation
audience: [dev]
read_when: "touching packaging, distribution, the shims, or anything under references/"
covers:
  - path: SKILL.md
    sha: a85722e4d23331039c8a41c528617b97d1c84665
  - path: references/init.md
    sha: 877b9f62a5895259e56b97149ab046269bc155a6
  - path: scripts/bootstrap.mjs
    sha: b837812a51aa7bae58e9f86a529cec3270118a04
  - path: .claude-plugin/plugin.json
    sha: c22851c358774bd1601f983cbf16c884333a8ead
generated_at_commit: 43f4132
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

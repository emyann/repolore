---
title: Overview — three surfaces, one implementation
summary: The three surfaces — Claude Code plugin, standalone umbrella skill, vendored per-repo layer — and how they share one implementation.
category: architecture
kind: explanation
audience: [dev]
read_when: "touching packaging, distribution, the shims, or anything under references/"
covers:
  - path: SKILL.md
    sha: a5faeb26798f0011a46679aaa6c66237903d2c50
  - path: references/init.md
    sha: 7b632f359b6b70b17b211f2da6687697ddcd7c3d
  - path: references/check.md
    sha: 17cdc7931c2c93102b952c7a3418c95d135a6844
  - path: references/update.md
    sha: ab8931adfd0da4955b530fc14d52850cac6e45f4
  - path: scripts/bootstrap.mjs
    sha: dcdfade7114ae4ecf5571e5a0790346e738f1628
  - path: scripts/update.mjs
    sha: 8dd492ba3f8cc3fd94676eea099c1de6a90dc2be
  - path: .claude-plugin/plugin.json
    sha: 8e8509f7bb27773d272918e126bbef00e490cccc
generated_at_commit: 1e6d701
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
   `/repolore:check`, `/repolore:refresh`, `/repolore:update`, `/repolore:setup`. The files
   under `skills/` are deliberately thin shims (`skills/init/SKILL.md`).
2. **Standalone umbrella skill** — the root `SKILL.md`, installed by
   `npx skills add emyann/repolore` into ~20 agents. Root-`SKILL.md`
   discovery means the skills CLI sees exactly one skill and the plugin
   internals stay hidden (see ADR-004).
3. **Vendored per-repo layer** — what init leaves inside a *target* repo:
   `docs/wiki/` content + `.repolore/scripts/` (copies of the five masters in
   `scripts/`) + `.repolore/manifest.json` tracking every vendored file by
   blob SHA.

Both front doors execute the same procedures: `references/init.md`,
`references/check.md`, `references/refresh.md`, `references/update.md`, `references/setup.md`,
written against `<SKILL_ROOT>` — the directory holding `SKILL.md`,
`scripts/`, `templates/`. The judgment/mechanics split: procedures (LLM
judgment) live in markdown; everything deterministic lives in the
plugin-side tools `scripts/bootstrap.mjs` (init vendoring) and
`scripts/update.mjs` (safe re-vendoring: regenerates pristine files, never
overwrites local edits without `--force`) plus the four vendored checkers
(see ADR-005).

## Self-referential quirk worth knowing

Because this repo runs repolore on itself, `.repolore/scripts/` here are
vendored **copies** of the `scripts/` **masters** in the same repo. When a
master changes, the check workflow's tooling-update nudge flags the drift
and the update workflow applies it — the live demo of the mechanism, not a
bug (`references/check.md`, `references/update.md`).

## Test harness

Two layers (see `howto/run-the-ux-harness`): deterministic
`node --test` over the bootstrap and update paths (`tests/*.test.mjs`, CI), and
an agentic workflow (`.claude/workflows/test-init-ux.js`) that executes the
init procedure in fixture repos built by `tests/make-fixtures.mjs`, validates
end state with `tests/validate-fixture.mjs`, and judges the UX with a rubric.

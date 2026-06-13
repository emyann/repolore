---
title: Cross-tool depth is untested — nudge strength varies by agent
summary: Wiki consumption depth varies by agent nudge strength; pointer-block-only teams (Copilot) are untested.
category: gotchas
kind: explanation
audience: [dev]
read_when: "deciding how the wiki reaches non-Claude agents, prioritizing emitters/hooks, or evaluating pointer-block effectiveness"
covers:
  - path: references/init.md
    sha: 7b632f359b6b70b17b211f2da6687697ddcd7c3d
  - path: SKILL.md
    sha: a9eb60777158027891834bfc18d408c9db6598ac
  - path: docs/RESEARCH.md
    sha: 0584d276bab41cfa3724238b5283d1c2c339dd40
generated_at_commit: c3bf387
last_refreshed: 2026-06-12
related: [decisions/adr-004-umbrella-skill-plugin-shims, decisions/adr-008-per-harness-entry-point-bridging, architecture/overview]
---

# Cross-tool depth is untested — nudge strength varies by agent

> Supersedes the "Cross-tool reality" risk in `docs/RESEARCH.md` §6, which
> went stale within a day of writing (it predates the v0.2.1 skills.sh
> distribution). This page is covers-tracked so the same rot gets flagged.

**Reach is solved; depth is not.** Since v0.2.1 any skills-CLI agent
(Cursor, Codex, Copilot, Windsurf, …) installs the full workflows via the
root umbrella (`SKILL.md`); the only hard dependencies are shell + node +
git. The untested question is whether agents and teams *without skill
machinery* actually consume the wiki — follow the pointer into `index.md`
before a task — and maintain it when behaviour changes.

## The nudge-strength ladder

Each tool sits on its highest available rung; the gap concentrates at the
bottom:

1. **Skill trigger** — the umbrella/plugin description fires on intent
   ("is the wiki up to date?"). Strongest; requires a skills-capable agent.
2. **Path-scoped injection** — *not built yet*: a Copilot
   `*.instructions.md` `applyTo` / Cursor `.mdc` globs emitter derived
   mechanically from `covers` paths + `read_when`. The only mechanism that
   reaches Copilot at the moment of relevance.
3. **Root pointer block** — what init wires today (`references/init.md`
   phase 6): a ≤10-line block whose canonical home is `AGENTS.md`, bridged
   into each harness's own file by its native mechanism — an `@AGENTS.md`
   import for `CLAUDE.md` (Claude Code never auto-loads `AGENTS.md`), the
   literal block for `.github/copilot-instructions.md`
   (`decisions/adr-008-per-harness-entry-point-bridging`). A suggestion
   competing for context budget — weak *in every agent*, not just Copilot.
4. **Nothing** — repo machinery only (hooks/CI, also not built yet).

## What this means in practice

- Maintenance for pointer-block-only teams has no trigger today: nothing
  re-raises a stale page at change time. The agent-agnostic fixes are repo
  machinery (post-commit hook, CI action filing the stale report as an
  issue any coding agent can be assigned), not more skill machinery.
- Consumption depth is measurable before building anything: a fixture wiki
  containing a load-bearing gotcha + a task that silently fails without it,
  compared across rungs (the existing agentic-harness pattern, inverted to
  the read side).

> TODO-VERIFY: whether a Copilot-only team follows the pointer block into
> the wiki unprompted — no measurement exists yet, on any rung below 1.

---
title: "ADR-004: One source of procedures, two distributions — root umbrella skill + plugin shims"
summary: One source of procedures (references/), two distributions — root SKILL.md umbrella and plugin shims.
category: decisions
kind: decision
audience: [dev]
read_when: "editing any SKILL.md, adding a workflow, or changing how repolore is installed"
status: accepted
date: 2026-06-11
supersedes: ~
superseded_by: ~
covers:
  - path: SKILL.md
    sha: a9eb60777158027891834bfc18d408c9db6598ac
  - path: skills/init/SKILL.md
    sha: 4df0069b899fb6f4281ffba524f828eba590dce7
  - path: references/init.md
    sha: 7b632f359b6b70b17b211f2da6687697ddcd7c3d
generated_at_commit: a68a358
last_refreshed: 2026-06-12
related: [architecture/overview, gotchas/cross-tool-depth-untested]
---

# ADR-004: One source of procedures, two distributions

## Context

v0.2.1 added distribution via the skills CLI / skills.sh alongside the Claude
Code plugin. Risk: two copies of three long procedures drifting apart. Two
constraints shaped the design: the skills CLI installs *only the skill
folder* (plugin-root references would dangle), and its discovery rule stops
at a **root** `SKILL.md` unless `--full-depth` is passed — so a root umbrella
hides the plugin internals from `npx skills add` entirely.

## Decision

Procedures live exactly once, in `references/{init,check,refresh,update,setup}.md`,
written against `<SKILL_ROOT>` — defined by whichever entry point ran. The
root `SKILL.md` is the standalone umbrella (skill root = repo root, so
`scripts/` and `templates/` ship inside the install without moving). The
plugin's `skills/init|check|refresh|update|setup/SKILL.md` are thin shims that set
`<SKILL_ROOT>` = `${CLAUDE_PLUGIN_ROOT}` and execute the same reference file,
keeping the namespaced `/repolore:*` commands and their frontmatter
(`allowed-tools`, `disable-model-invocation`).

## Consequences

- Correction (2026-06-12, v0.4.5): the Decision's procedure enumeration
  (`references/{init,check,refresh,update,setup}.md`) is a snapshot — the set
  has since grown (`flow.md` in v0.4.0, `audit.md` in v0.4.5, each with a
  shim + umbrella routing row). The single-source principle this record
  decides is unchanged; treat the enumeration as illustrative, the routing
  table in `SKILL.md` as the live list.
- The two front doors cannot drift: there is nothing to drift.
- Skill-format frontmatter on the umbrella stays spec-minimal
  (name/description/license) for cross-agent compatibility; Claude-specific
  fields live only on shims.
- A standalone install carries the whole repo (~240KB incl. docs and tests) —
  accepted as the cost of zero asset duplication.
- Shims installed outside the plugin self-diagnose and point to the umbrella
  (`skills/init/SKILL.md`).

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
    sha: a85722e4d23331039c8a41c528617b97d1c84665
  - path: skills/init/SKILL.md
    sha: a7afcf950d2c8c6ee3ede4a5bb4da44340c53c0a
  - path: references/init.md
    sha: 877b9f62a5895259e56b97149ab046269bc155a6
generated_at_commit: 43f4132
last_refreshed: 2026-06-11
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

Procedures live exactly once, in `references/{init,check,refresh}.md`,
written against `<SKILL_ROOT>` — defined by whichever entry point ran. The
root `SKILL.md` is the standalone umbrella (skill root = repo root, so
`scripts/` and `templates/` ship inside the install without moving). The
plugin's `skills/init|check|refresh/SKILL.md` are thin shims that set
`<SKILL_ROOT>` = `${CLAUDE_PLUGIN_ROOT}` and execute the same reference file,
keeping the namespaced `/repolore:*` commands and their frontmatter
(`allowed-tools`, `disable-model-invocation`).

## Consequences

- The two front doors cannot drift: there is nothing to drift.
- Skill-format frontmatter on the umbrella stays spec-minimal
  (name/description/license) for cross-agent compatibility; Claude-specific
  fields live only on shims.
- A standalone install carries the whole repo (~240KB incl. docs and tests) —
  accepted as the cost of zero asset duplication.
- Shims installed outside the plugin self-diagnose and point to the umbrella
  (`skills/init/SKILL.md`).

---
name: update
description: Update the repo's vendored repolore tooling (.repolore/scripts, wiki AGENTS.md, templates) to the installed version — safe regeneration that never overwrites local edits without consent. Use when wiki-check reports newer tooling, after updating the repolore plugin, or when the user asks to update repolore in this repo.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
---

# repolore: update

This plugin skill is a thin entry point; the procedure has one source.

Set `<SKILL_ROOT>` = `${CLAUDE_PLUGIN_ROOT}`. Read
`${CLAUDE_PLUGIN_ROOT}/references/update.md` and execute it exactly, with
that `<SKILL_ROOT>` substitution.

(If `${CLAUDE_PLUGIN_ROOT}` is undefined, this shim was installed outside the
Claude Code plugin — use the standalone `repolore` umbrella skill instead:
`npx skills add emyann/repolore`.)

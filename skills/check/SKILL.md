---
name: check
description: Report the health of the repo's LLM wiki — stale or unmanaged pages, new code with no page, index drift, page budget, tooling updates. Use when the user asks whether the wiki is up to date, before relying on wiki content for a task, or after merging significant changes.
allowed-tools: Read, Bash, Glob, Grep
---

# repolore: check

This plugin skill is a thin entry point; the procedure has one source.

Set `<SKILL_ROOT>` = `${CLAUDE_PLUGIN_ROOT}`. Read
`${CLAUDE_PLUGIN_ROOT}/references/check.md` and execute it exactly, with that
`<SKILL_ROOT>` substitution.

(If `${CLAUDE_PLUGIN_ROOT}` is undefined, this shim was installed outside the
Claude Code plugin — use the standalone `repolore` umbrella skill instead:
`npx skills add emyann/repolore`.)

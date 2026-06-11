---
name: setup
description: Detect and activate optional repolore capabilities that need consent — the post-commit wiki nudge (per-machine or team-wide), team auto-update via project settings. Presents available-but-inactive items as one simple question. Use when the user asks to set up, activate, or enable repolore extras, or after an update adds new capability scripts.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, AskUserQuestion
---

# repolore: setup

This plugin skill is a thin entry point; the procedure has one source.

Set `<SKILL_ROOT>` = `${CLAUDE_PLUGIN_ROOT}`. Read
`${CLAUDE_PLUGIN_ROOT}/references/setup.md` and execute it exactly, with
that `<SKILL_ROOT>` substitution.

(If `${CLAUDE_PLUGIN_ROOT}` is undefined, this shim was installed outside the
Claude Code plugin — use the standalone `repolore` umbrella skill instead:
`npx skills add emyann/repolore`.)

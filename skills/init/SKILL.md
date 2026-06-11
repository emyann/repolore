---
name: init
description: Bootstrap an LLM-maintained, code-derived wiki in this repository — detect the stack, agree scope + a page plan with the user, vendor the schema + check scripts + templates in one mechanical shot, seed the overview page, and wire agent entry points. Run once per repo.
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, AskUserQuestion
---

# repolore: init

This plugin skill is a thin entry point; the procedure has one source.

Set `<SKILL_ROOT>` = `${CLAUDE_PLUGIN_ROOT}`. Read
`${CLAUDE_PLUGIN_ROOT}/references/init.md` and execute it exactly, phase by
phase, with that `<SKILL_ROOT>` substitution.

(If `${CLAUDE_PLUGIN_ROOT}` is undefined, this shim was installed outside the
Claude Code plugin — use the standalone `repolore` umbrella skill instead:
`npx skills add emyann/repolore`.)

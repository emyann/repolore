---
name: refresh
description: Bring stale wiki pages back in line with the code — diff-driven triage (re-stamp / targeted edit / rewrite), citation re-verification, index regeneration, and a reviewable commit. Use when wiki-check reports stale pages or the user asks to update/refresh the wiki.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
---

# repolore: refresh

This plugin skill is a thin entry point; the procedure has one source.

Read `${CLAUDE_PLUGIN_ROOT}/references/refresh.md` and execute it exactly
(it operates on the tooling already vendored into this repo).

(If `${CLAUDE_PLUGIN_ROOT}` is undefined, this shim was installed outside the
Claude Code plugin — use the standalone `repolore` umbrella skill instead:
`npx skills add emyann/repolore`.)

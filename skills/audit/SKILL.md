---
name: audit
description: Audit the wiki for wrongness behind unchanged bytes — per-claim verification of fresh pages against the code (the drift class hashes can't see), findings-inbox triage, and a reviewable commit. Use when the user asks to audit/verify the wiki's truthfulness, when check's dust line reports never-audited or overdue pages, or to triage FINDINGS.md.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
---

# repolore: audit

This plugin skill is a thin entry point; the procedure has one source.

Read `${CLAUDE_PLUGIN_ROOT}/references/audit.md` and execute it exactly
(it operates on the tooling already vendored into this repo).

(If `${CLAUDE_PLUGIN_ROOT}` is undefined, this shim was installed outside the
Claude Code plugin — use the standalone `repolore` umbrella skill instead:
`npx skills add emyann/repolore`.)

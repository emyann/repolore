---
name: repolore
description: Give any repository a code-derived LLM wiki — cited claims, blob-SHA drift checking, coverage auditing, a generated index. Use when the user wants to set up, health-check, or refresh a maintained wiki / knowledge base / "lore" distilled from the codebase, or asks why-is-it-like-this documentation that stays honest as code changes.
license: MIT
---

# repolore

Your codebase has lore — the decisions, gotchas, and
why-things-are-the-way-they-are that live in nobody's head for long. This
skill makes you write it down, cite it, and keep it honest: an in-repo,
human-editable wiki distilled from the code, with per-claim citations and
mechanical (blob-SHA) staleness detection. The code is always the source of
truth; the wiki is the orientation layer.

`<SKILL_ROOT>` below means **the directory containing this SKILL.md** (it
ships with `scripts/`, `templates/`, and `references/` alongside).

## Six workflows — pick by what the user asked

| User intent | Procedure to read and execute |
|---|---|
| "set up a wiki / knowledge base for this repo" (once per repo) | `<SKILL_ROOT>/references/init.md` |
| "is the wiki up to date?" / before relying on wiki content | `<SKILL_ROOT>/references/check.md` |
| "update the wiki" / check reported stale pages | `<SKILL_ROOT>/references/refresh.md` |
| "audit the wiki for wrongness" / check's dust line reports overdue pages / "triage the findings" | `<SKILL_ROOT>/references/audit.md` |
| "update repolore's tooling in this repo" / check reported newer tooling | `<SKILL_ROOT>/references/update.md` |
| "activate repolore extras" (hook, team-wide nudge, auto-update) / after an update adds capabilities | `<SKILL_ROOT>/references/setup.md` |

Read the matching procedure fully and follow it exactly, substituting
`<SKILL_ROOT>` as defined above. Each is self-contained; the scripts they
invoke are stdlib-only (node + git, no npm install).

Day-to-day, outside those workflows: once a repo is initialized, its wiki
rules live in `<wikiRoot>/AGENTS.md` *inside that repo* (location recorded in
`.repolore/manifest.json`) — pages are drafted on demand ("draft
`features/<slug>` from the wiki plan") and updated as part of the change
that altered the behaviour they describe.

Also available as a Claude Code plugin (`/plugin marketplace add
emyann/repolore`), where these workflows surface as the namespaced commands
`/repolore:init`, `/repolore:check`, `/repolore:refresh`.

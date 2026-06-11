# repolore — Claude Code

Claude Code auto-loads `CLAUDE.md`, never `AGENTS.md`. This file bridges that:
it imports the canonical cross-agent guidance so the wiki pointer is in context
from session start. Keep project guidance in `AGENTS.md` (the one file Cursor,
Codex, Copilot and others also read); add Claude-Code-only notes below the
import.

@AGENTS.md

## Releasing (manual ritual — until automated)

Publishing is **tag + push to `main`**: the marketplace tracks `main`, so its
`.claude-plugin/plugin.json` version is what users get. The GitHub *Releases*
page is separate and does **not** drive distribution.

1. Bump `.claude-plugin/plugin.json` version + add a README changelog line.
2. Commit in order: `feat:` → `docs(wiki):` (absorb, re-stamp staled pages) →
   `chore(release): vX.Y.Z`.
3. **If you built on a branch, fast-forward `main` to it BEFORE tagging.** Tags
   and `git push origin main` move independently — a stranded branch ships
   nothing (a silent v0.4.0 once tagged but never reached `main`). Verify:
   `git rev-parse HEAD` == `git rev-parse vX.Y.Z` and `git log -1 origin/main`.
4. Tag the release commit and push: `git push origin main vX.Y.Z`.
5. **Create the GitHub Release** — a separate manual step, easy to forget:
   `gh release create vX.Y.Z --verify-tag --latest --title "vX.Y.Z — <summary>" --notes "<changelog>"`.

Eventual fix: a GitHub Action that creates a Release on every `v*` tag push,
retiring step 5.

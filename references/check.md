# repolore — check procedure

> Single source for the check workflow. `<SKILL_ROOT>` — the directory
> holding repolore's `SKILL.md`, `scripts/` and `templates/` — was defined by
> the entry point that sent you here.

Report wiki health. Read `.repolore/manifest.json` at the repo root for
`wikiRoot` and `scriptsDir` (if missing, the wiki isn't initialized — point
the user at the init workflow). Then run the three vendored checks:

```bash
node <scriptsDir>/wiki-check.mjs            # freshness: stale / unmanaged / malformed
node <scriptsDir>/wiki-coverage.mjs         # new code no page covers (use --since <ref> after a merge)
node <scriptsDir>/wiki-index.mjs --check    # generated index drift
```

Then summarize for the user, in this order of importance:

1. **Stale pages** — which, and which covered files changed. These are the
   action items; offer the refresh workflow (`/repolore:refresh` in the
   Claude Code plugin).
2. **Coverage gaps** — uncovered «page-worthy» clusters only (the wiki
   distils; don't recite every uncovered file). A cluster under routes/,
   services/, functions/ etc. usually means a missing page — name the likely
   page and offer to add it to the page plan (`pages:` in `wiki.config.yml`) as
   `status: planned`.
3. **The backlog** — `wiki-check.mjs` prints the page plan's state (N written,
   M waiting to be drafted, plan↔reality drift). Relay it with the
   draft-on-demand prompt ("draft `<slug>` from the wiki plan") so the user
   always knows what is waiting; the same list sits in the Planned section at
   the bottom of the generated `index.md`.
4. **Audit dust + findings inbox** — two computed lines, derived here at
   check time and written nowhere (ADR-002; the vendored script, its exit
   codes, and the post-commit hook are untouched by this):
   - Parse `<wikiRoot>/log.md` for `audited <category/slug>` lines: report
     "P pages never audited, Q audited >90 days ago — consider the audit
     workflow (`/repolore:audit` in the Claude Code plugin)". Skip the line
     when everything is within horizon.
   - If `<wikiRoot>/FINDINGS.md` exists (skip silently if absent): report
     "Findings inbox: N item(s) awaiting triage" and point at the audit
     workflow's triage phase. Never block on it.
5. **Hygiene** — malformed pages, unmanaged pages (no `covers:`), index drift
   (regenerate with `wiki-index.mjs`), page-budget warnings, legacy fields.
   Also: an empty or near-empty `GLOSSARY.md` while written pages exist —
   terms are being coined without being recorded (the feeding rule in
   `AGENTS.md`). Offer a one-shot backfill from the existing pages'
   terminology; don't run it unasked. And one line when optional
   capabilities are inactive (post-commit nudge not installed, etc.):
   point at the setup workflow (`/repolore:setup` in the Claude Code
   plugin) — point, don't re-ask.
6. **Tooling updates** — run the deterministic classifier:
   `node <SKILL_ROOT>/scripts/update.mjs --dry-run`. It compares every
   tracked vendored file against the installed masters (up-to-date /
   outdated-pristine / locally modified / missing / new) and prints the
   from→to versions. If anything is outdated: one line, last in the report
   ("repolore vX is installed; this repo's tooling is at vY"). Then offer the
   update workflow (`/repolore:update` in the Claude Code plugin) — never
   apply it unasked. How to offer:
   - **Clean update, nothing else pending** — the classifier reports no
     locally-modified files AND the report found no stale pages (no #1 action
     items competing for attention): present a single `AskUserQuestion`
     ("repolore vX is installed; tooling here is vY — run the update now?" →
     *Run update now* / *Not now*). On *Run update now*, hand off to the
     update workflow; otherwise leave the one-line pointer. The update is a
     true one-shot here, so removing the round-trip is pure win.
   - **Anything else** — locally-modified files present, or stale pages that
     outrank the tooling finding: keep the one-line prose pointer, don't pop a
     question. The update needs per-file keep-vs-overwrite decisions (it isn't
     a yes/no), and tooling must not jump ahead of the real action items.
   Relay any locally-modified warnings verbatim either way: those files will
   never be overwritten without explicit consent.

Rules:

- These checks are **read-only signals, never gates** — report, don't block,
  and don't "fix" pages here (that's the refresh workflow).
- Regenerating `index.md` when it has drifted is fine — it is a generated
  artifact.
- If everything is green, say so in one line; don't pad the report.

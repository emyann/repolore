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
4. **Hygiene** — malformed pages, unmanaged pages (no `covers:`), index drift
   (regenerate with `wiki-index.mjs`), page-budget warnings, legacy fields.
5. **Tooling updates** — the manifest's `generatedFiles` records the blob SHA
   each vendored file had when written. Compare against the installed
   repolore's masters: for each `<scriptsDir>/*.mjs` entry, `git hash-object
   <SKILL_ROOT>/scripts/<name>` and diff the two readings:
   - manifest SHA ≠ repolore master SHA → **a newer repolore is installed**
     than what this repo vendored (for friendly version numbers, compare
     `pluginVersion` in the manifest against
     `<SKILL_ROOT>/.claude-plugin/plugin.json`, when that file is present).
     One line, last in the report: "repolore vX is installed; this repo
     vendored its tooling at vY — to update, copy `<SKILL_ROOT>/scripts/*.mjs`
     over `<scriptsDir>/` and refresh those SHAs in `.repolore/manifest.json`
     (a dedicated update workflow is on the roadmap)." Offer to do it; don't
     do it unasked.
   - vendored file's current SHA ≠ its manifest SHA → the repo **edited** that
     vendored file locally; name it and warn that updates would overwrite the
     local change.

Rules:

- These checks are **read-only signals, never gates** — report, don't block,
  and don't "fix" pages here (that's the refresh workflow).
- Regenerating `index.md` when it has drifted is fine — it is a generated
  artifact.
- If everything is green, say so in one line; don't pad the report.

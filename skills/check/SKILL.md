---
name: check
description: Report the health of the repo's LLM wiki — stale or unmanaged pages, new code with no page, index drift, page budget. Use when the user asks whether the wiki is up to date, before relying on wiki content for a task, or after merging significant changes.
allowed-tools: Read, Bash, Glob, Grep
---

# repolore: check

Report wiki health. Read `.repolore/manifest.json` at the repo root for
`wikiRoot` and `scriptsDir` (if missing, the wiki isn't initialized — point
the user at `/repolore:init`). Then run the three vendored checks:

```bash
node <scriptsDir>/wiki-check.mjs            # freshness: stale / unmanaged / malformed
node <scriptsDir>/wiki-coverage.mjs         # new code no page covers (use --since <ref> after a merge)
node <scriptsDir>/wiki-index.mjs --check    # generated index drift
```

Then summarize for the user, in this order of importance:

1. **Stale pages** — which, and which covered files changed. These are the
   action items; offer `/repolore:refresh`.
2. **Coverage gaps** — uncovered «page-worthy» clusters only (the wiki
   distils; don't recite every uncovered file). A cluster under routes/,
   services/, functions/ etc. usually means a missing page — name the likely
   page and offer to add it to the manifest in `wiki.config.yml` as
   `status: planned`.
3. **Hygiene** — malformed pages, unmanaged pages (no `covers:`), index drift
   (regenerate with `wiki-index.mjs`), page-budget warnings, legacy fields.
4. **Tooling updates** — the manifest's `generatedFiles` records the blob SHA
   each vendored file had when written. Compare against the installed plugin's
   masters: for each `<scriptsDir>/*.mjs` entry, `git hash-object
   ${CLAUDE_PLUGIN_ROOT}/scripts/<name>` and diff the two readings:
   - manifest SHA ≠ plugin master SHA → **a newer repolore is installed** than
     what this repo vendored (compare `pluginVersion` in the manifest against
     `${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json` for the friendly
     version numbers). One line, last in the report: "repolore vX is
     installed; this repo vendored its tooling at vY — to update, copy
     `${CLAUDE_PLUGIN_ROOT}/scripts/*.mjs` over `<scriptsDir>/` and refresh
     those SHAs in `.repolore/manifest.json` (a dedicated `/repolore:update`
     is on the roadmap)." Offer to do it; don't do it unasked.
   - vendored file's current SHA ≠ its manifest SHA → the repo **edited** that
     vendored file locally; name it and warn that updates would overwrite the
     local change.

Rules:

- These checks are **read-only signals, never gates** — report, don't block,
  and don't "fix" pages here (that's `/repolore:refresh`).
- Regenerating `index.md` when it has drifted is fine — it is a generated
  artifact.
- If everything is green, say so in one line; don't pad the report.

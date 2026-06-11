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

Rules:

- These checks are **read-only signals, never gates** — report, don't block,
  and don't "fix" pages here (that's `/repolore:refresh`).
- Regenerating `index.md` when it has drifted is fine — it is a generated
  artifact.
- If everything is green, say so in one line; don't pad the report.

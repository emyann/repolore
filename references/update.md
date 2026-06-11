# repolore — update procedure

> Single source for the update workflow: bring this repo's vendored repolore
> layer (`.repolore/scripts/`, the wiki's `AGENTS.md` and `_templates/`) up
> to the installed version. `<SKILL_ROOT>` was defined by your entry point.
> Wiki pages, `wiki.config.yml`, the glossary and the log are content, not
> tooling — this workflow never touches them.

## Procedure

1. Preflight: `.repolore/manifest.json` must exist (else point the user at
   the init workflow).
2. Classify, write nothing:
   `node <SKILL_ROOT>/scripts/update.mjs --dry-run`. Show the user the
   result: from→to version, what would be updated/restored/added, and —
   most importantly — anything **locally modified** (the script skips those
   by design; overwriting a user's edit is never the default).
3. For each locally-modified file: show the diff the script names
   (`git diff <recorded-sha> <current-sha>`) and let the user choose — keep
   the local version (skip; it will be reported again next time) or
   overwrite (`--force <path>`). A common legitimate edit is an audiences
   customization in `AGENTS.md` (init Q3): if the user forces that file,
   offer to re-apply their customization on top of the regenerated copy.
4. Apply: `node <SKILL_ROOT>/scripts/update.mjs` plus any consented
   `--force <path>` flags. The script refreshes manifest SHAs and
   `pluginVersion` itself.
5. Finish the loop: regenerate the index
   (`node <scriptsDir>/wiki-index.mjs` — newer tooling may change the index
   format), then `node <scriptsDir>/wiki-check.mjs`. If pages went stale
   because they *cover* tooling files (dogfood repos), follow the refresh
   workflow's triage. Append one line to `<wikiRoot>/log.md`:
   `## <date> — updated vendored tooling v<from> → v<to>`.
6. Offer a single `chore(repolore): update vendored tooling to v<to>` commit
   (respect the repo's commit conventions; never commit without consent).

## Guardrails

- Never hand-copy or hand-edit vendored files to "update" them — the script
  is the only writer, so the manifest stays truthful.
- Never `--force` without showing the diff and getting explicit consent.
- A `REVIEW` finding on `AGENTS.md` (scope section not locatable) means the
  user restructured it — update it by hand from `templates/AGENTS.md`,
  preserving their content, and re-stamp nothing (it carries no covers).

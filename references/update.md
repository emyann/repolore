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
3. **Stale-plugin check** — when the dry-run reports everything up-to-date,
   remember it can only sync to the *installed* plugin version: a stale
   install reads as "nothing to do". Probe for a newer release without the
   network first — in a Claude Code plugin install (`${CLAUDE_PLUGIN_ROOT}`
   is defined), read the marketplace clone's version at
   `~/.claude/plugins/marketplaces/<marketplace>/.claude-plugin/plugin.json`
   (best-effort: that layout is harness-internal; on any miss, skip
   silently). If a newer version exists — or the probe can't tell and the
   user clearly expected an update — OFFER the channel refresh as one
   accept/decline, never run it unasked:
   - Claude Code plugin: `claude plugin marketplace update <marketplace>`
   - skills-CLI standalone: `npx skills update`
   After a consented refresh the running session still has the old skill
   loaded: tell the user to `/reload-plugins` (or restart) and re-run the
   update workflow — that step is theirs alone. The vendored scripts stay
   offline; this one network step lives here in the workflow, on the
   delivery path only, and is always optional.
4. For each locally-modified file: show the diff the script names
   (`git diff <recorded-sha> <current-sha>`) and let the user choose — keep
   the local version (skip; it will be reported again next time) or
   overwrite (`--force <path>`). A common legitimate edit is an audiences
   customization in `AGENTS.md` (init Q3): if the user forces that file,
   offer to re-apply their customization on top of the regenerated copy.
5. Apply: `node <SKILL_ROOT>/scripts/update.mjs` plus any consented
   `--force <path>` flags. The script refreshes manifest SHAs and
   `pluginVersion` itself.
6. If the update ADDed scripts that enable an optional capability (e.g. the
   post-commit nudge pair), do not bury the offer in prose: run the setup
   workflow's question for the NEW capabilities right now
   (`<SKILL_ROOT>/references/setup.md`) — one simple accept/decline. Never
   run installers without that consent; never make the user discover the
   capability from a report.
7. Finish the loop: regenerate the index
   (`node <scriptsDir>/wiki-index.mjs` — newer tooling may change the index
   format), then `node <scriptsDir>/wiki-check.mjs`. If pages went stale
   because they *cover* tooling files (dogfood repos), follow the refresh
   workflow's triage. Append one line to `<wikiRoot>/log.md`:
   `## <date> — updated vendored tooling v<from> → v<to>`.
8. Commit etiquette — convention-aware:
   - **First tooling update in this repo** (no prior
     `chore(repolore): update vendored tooling` commit in git history AND no
     tooling-update line in `<wikiRoot>/log.md`): OFFER the single
     `chore(repolore): update vendored tooling to v<to>` commit — do not
     commit without consent.
   - **Convention established** (either signal present): commit directly and
     say so plainly ("committed as `<sha>`, not pushed") — the user approved
     this exact commit shape once; re-asking is ceremony that breaks flow.
     An explicit "don't commit" from the user always overrides.
   - Convention covers the local chore commit ONLY. Never push, never run
     installers, never `--force`-overwrite locally-edited files without
     explicit consent. Respect the repo's commit conventions either way.

## Guardrails

- Never hand-copy or hand-edit vendored files to "update" them — the script
  is the only writer, so the manifest stays truthful.
- Never `--force` without showing the diff and getting explicit consent.
- Never run the channel refresh (`claude plugin marketplace update` /
  `npx skills update`) without the explicit accept — and nothing beyond it
  (no installs, no reloads on the user's behalf).
- A `REVIEW` finding on `AGENTS.md` (scope section not locatable) means the
  user restructured it — update it by hand from `templates/AGENTS.md`,
  preserving their content, and re-stamp nothing (it carries no covers).

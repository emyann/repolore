# repolore — refresh procedure

> Single source for the refresh workflow. Works entirely on the tooling
> vendored into the target repo; nothing here needs `<SKILL_ROOT>`.

You are refreshing the repo's LLM-maintained wiki. Read
`.repolore/manifest.json` for `wikiRoot` and `scriptsDir`, then read
`<wikiRoot>/AGENTS.md` — the schema and rules. Follow them exactly.

## Procedure

1. `node <scriptsDir>/wiki-check.mjs` — list STALE and MALFORMED pages and
   which covered files changed.
2. For each stale page, **diff before deciding** — the recorded SHA is an
   exact baseline: `git diff <recorded-sha> <current-blob-sha>` per covered
   file (get the current one with `git hash-object <path>`), or
   `git log -p --follow <path>` since the page's `generated_at_commit`. Triage:
   - **No-op** — formatting/comments/renames that don't touch the page's
     claims: re-stamp only.
   - **Targeted edit** — behaviour the page describes changed: update the
     affected prose and inline citations; re-verify every citation you touch
     by reading the code; demote anything you cannot confirm to
     `> TODO-VERIFY: <claim> — <what needs checking>`.
   - **Rewrite** — the feature changed shape: re-research from the code and
     rewrite the page body.
3. Update `covers`: add files that became relevant, drop deleted ones. If a
   covered file was *moved*, `git log --follow` usually finds it — update the
   path rather than dropping the entry.
4. `node <scriptsDir>/wiki-stamp.mjs <page> [...]` for every touched page —
   never hand-compute SHAs, and never stamp a page you did not actually
   re-read against the diff ("refresh-by-rote" erodes citation trust).
5. Fix MALFORMED pages (repair frontmatter to the schema).
6. `node <scriptsDir>/wiki-index.mjs` if any title/summary changed (or
   `--check` says so); append one line per refreshed page to `<wikiRoot>/log.md`.
7. Re-run `wiki-check.mjs` — every page must report fresh.
8. Present the refresh as a reviewable change; offer a single
   `docs(wiki): refresh N stale pages` commit (do not commit without consent).

## Guardrails

- **Do not invent pages or content.** Only refresh what exists. A missing
  page you notice goes into the `pages:` manifest in `wiki.config.yml` as
  `status: planned` — not written now.
- A stale **accepted decision record** is a prompt to consider a *superseding*
  ADR, never an in-place rewrite (dual mutability — see AGENTS.md).
- Code wins every conflict; never adjust prose to defend a stale claim.
- Report which pages you refreshed and what *materially* changed.

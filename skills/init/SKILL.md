---
name: init
description: Bootstrap an LLM-maintained, code-derived wiki in this repository — detect the stack, agree a page manifest with the user, vendor the schema + check scripts + templates, and wire agent entry points. Run once per repo.
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, AskUserQuestion
---

# repolore: init

You are bootstrapping a **code-derived LLM wiki** in the current repository:
an orientation layer (concepts, architecture, feature histories, decisions,
gotchas) distilled from the code, with per-claim citations and blob-SHA
freshness tracking. This is Karpathy's llm-wiki pattern applied to a codebase
— the immutable source layer is the repo itself.

Follow the phases in order. **Never silently write a wall of pages** — the
manifest approval gate (phase 4) is mandatory. Make no network calls.

## Phase 0 — Preflight

1. Confirm you are in a git repo (`git rev-parse --show-toplevel`); abort with
   guidance if not.
2. If `.repolore/manifest.json` exists, a wiki is already initialized — stop
   and point the user at `/repolore:check` and `/repolore:refresh`.
3. If a directory containing `wiki.config.yml` exists without the manifest,
   ask the user whether to adopt it (write the manifest pointing at it) rather
   than creating a second wiki.

## Phase 1 — Detect (auto-detect before asking)

Build a picture of the repo with cheap commands — do not deep-read code yet:

- **Languages & layout**: extension census (e.g. `git ls-files | sed -n 's/.*\.//p' | sort | uniq -c | sort -rn | head`), monorepo markers (`pnpm-workspace.yaml`, `lerna.json`, workspaces in `package.json`, `*.sln`), top-level directory tree.
- **Entry points**: root README, Makefile/justfile, docker-compose, main manifests.
- **Existing agent context**: `CLAUDE.md`, `CLAUDE.local.md`, `AGENTS.md`, `.github/copilot-instructions.md`, `.cursor/rules*` — existing ones get pointer blocks in phase 6, and their content often names the subsystems that deserve pages.
- **Existing docs**: `docs/`, ADR directories (`adr/`, `decisions/`, `doc/adr`) — an existing ADR set should be *linked*, not duplicated.
- **Exclude candidates**: test dirs, generated code, vendored code, build output, UI-heavy areas (LLM-derived docs are weak for those).

## Phase 2 — Ask (≤5 questions, strong defaults)

Use AskUserQuestion. Ask only what detection cannot decide:

1. **Wiki location** — default `docs/wiki/` (or alongside existing docs).
2. **Scope** — propose include/exclude globs from phase 1; ask the user to
   confirm/amend. This is the key decision: by-policy exclusions (e.g. a theme
   or generated client) should be explicit.
3. **Audiences** — default `[dev]` only. Offer extra reader types (ops,
   support, admin) only if the repo clearly serves them.
4. **Seed one page now?** — default: manifest only (pages get drafted on
   demand later). Offer drafting `architecture/overview.md` immediately as the
   single exception — one page, no fan-out.

Accept `--yes`-style instruction from the user to take all defaults.

## Phase 3 — Map the page manifest

From phase 1 (plus light targeted reading — READMEs, entry points, route/job
registries; **structure, not embeddings**), draft a page manifest: for each
category, the pages this repo *should eventually have* — `slug`, one-line
`summary`, `status: planned`. Aim for 10–25 planned pages on a typical repo;
respect the soft page budget (default 50). Categories with nothing real to say
stay empty — do not pad.

## Phase 4 — Propose (the approval gate)

Show the user: the chosen location, the scope globs, and the manifest as a
table (category / slug / summary). Iterate until approved. Do not write
anything before approval.

## Phase 5 — Vendor the scaffold

All master assets live in this plugin at `${CLAUDE_PLUGIN_ROOT}`. Copy and
instantiate (replace every `{{PLACEHOLDER}}`):

1. `mkdir -p` the wiki root and its category dirs + `_templates/`.
2. Scripts → `.repolore/scripts/` (or a user-preferred tools dir): copy
   `${CLAUDE_PLUGIN_ROOT}/scripts/{lib,wiki-check,wiki-coverage,wiki-stamp,wiki-index}.mjs`
   unmodified. The default deliberately lives inside the hidden `.repolore/`
   dir so the tool's entire footprint outside the wiki is ONE hidden directory
   (like `.husky/` or `.githooks/`) — keep it there unless the user asks.
3. `${CLAUDE_PLUGIN_ROOT}/templates/AGENTS.md` → `<wiki>/AGENTS.md`, with
   `{{PROJECT_NAME}}`, `{{WIKI_DIR}}`, `{{SCRIPTS_DIR}}`, `{{SCOPE_SUMMARY}}`
   (a short prose restatement of the scope decision incl. by-policy
   exclusions), `{{PAGE_BUDGET}}` filled in. Create the symlink
   `<wiki>/CLAUDE.md → AGENTS.md` (`ln -s AGENTS.md CLAUDE.md`) so Claude Code
   auto-loads it when working in the wiki tree.
4. `templates/wiki.config.yml` → `<wiki>/wiki.config.yml` with title, scope
   globs (4-space-indented `- "glob"` lines), repo notes (3–6 lines from phase
   1: what the repo is, its top-level shape, what is out of scope and why),
   and the approved manifest under `pages:`.
5. `templates/page.md` + `templates/decision.md` → `<wiki>/_templates/`;
   `templates/GLOSSARY.md` + `templates/log.md` → wiki root.
6. If the user opted in: draft `architecture/overview.md` now, from the code,
   following `<wiki>/AGENTS.md` rules exactly (citations, covers list), then
   `node .repolore/scripts/wiki-stamp.mjs <page>`.
7. Generate the index: `node .repolore/scripts/wiki-index.mjs --wiki-root <wiki>`.
8. Write `.repolore/manifest.json` at the repo root:

```json
{
  "tool": "repolore",
  "schemaVersion": 1,
  "wikiRoot": "docs/wiki",
  "scriptsDir": ".repolore/scripts",
  "initializedAt": "<ISO date>",
  "generatedFiles": [ { "path": ".repolore/scripts/wiki-check.mjs", "sha": "<git hash-object>" } ]
}
```

List every vendored file with its blob SHA (`git hash-object`) — future
`update` runs regenerate only files whose hash still matches what was
originally written, and surface user-modified ones for review.

9. Verify: `node .repolore/scripts/wiki-check.mjs` must exit clean and
   `wiki-index.mjs --check` must pass.

## Phase 6 — Wire entry points (least-invasive: never create files uninvited)

Append a pointer block (≤10 lines, **pointer, not content** — never inline
wiki material into always-loaded files) to each root context file that
**already exists**: `CLAUDE.md`, `CLAUDE.local.md`, `AGENTS.md`,
`.github/copilot-instructions.md`.

- **Never create a new context file without asking.** If none exists, ask the
  user (one extra question): create a root `AGENTS.md` with just the block, or
  skip wiring entirely. In a non-interactive run, skip — and include the
  ready-to-paste block in the phase 7 report instead.
- If the **only** context file is `CLAUDE.local.md` (typically gitignored and
  personal), append there, but note in the report that teammates' agents won't
  see the pointer and suggest — don't create — a committed alternative.

The block:

```markdown
## Project wiki (LLM-maintained)

Before working on a feature, change, or investigation, consult the
code-derived wiki at `<wikiRoot>/` — start at `index.md`. It is an orientation
layer: use it to learn *where to look* and *why*, then verify specifics
against the code — code is always the source of truth. Schema and authoring
rules: `<wikiRoot>/AGENTS.md`. When a change alters behaviour covered by a
wiki page, update that page as part of the task (`node <scriptsDir>/wiki-check.mjs`
shows what went stale); **new feature → new page**.
```

## Phase 7 — Report

Tell the user: what was created and where; how to draft a page from the
manifest ("draft `features/<slug>` from the wiki manifest"); the three
commands (`wiki-check`, `wiki-coverage`, `wiki-index`); that
`/repolore:check` and `/repolore:refresh` are now the maintenance loop; and
that the vendored layer is committed while check state never is. Recommend
committing the scaffold as a single `docs: initialize repolore` commit (do not
commit without consent).

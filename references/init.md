# repolore — init procedure

> Single source for the init workflow. You arrive here from the root
> `SKILL.md` (standalone install) or a Claude Code plugin shim; whichever
> entry point you used defined `<SKILL_ROOT>` — the directory holding
> repolore's `SKILL.md`, `scripts/` and `templates/`.

You are bootstrapping a **code-derived LLM wiki** in the current repository:
an orientation layer (concepts, architecture, feature histories, decisions,
gotchas) distilled from the code, with per-claim citations and blob-SHA
freshness tracking. This is Karpathy's llm-wiki pattern applied to a codebase
— the immutable source layer is the repo itself.

Follow the phases in order. **Never silently write a wall of pages** — the
manifest approval gate (phase 4) is mandatory. Make no network calls.

The run should end **fully done**: scaffold vendored, the overview page
drafted (unless declined), entry points wired, and — when the user consented
in phase 2 — a single commit made. Don't park on a recommendation the user
then has to approve in another round-trip.

## Phase 0 — Preflight

1. Confirm you are in a git repo (`git rev-parse --show-toplevel`); abort with
   guidance if not.
2. If `.repolore/manifest.json` exists, a wiki is already initialized — stop.
   The abort message is short and consistent: read the manifest and say where
   the wiki lives and when it was initialized, point at the check workflow
   (health) and the refresh workflow (updates) as the maintenance loop, and
   note the start-over escape hatch — delete `.repolore/` and the wiki
   directory, then run init again. Do not propose anything else. Use this
   template verbatim (so the abort reads identically every run), with the
   command forms your install offers (`/repolore:check` / `/repolore:refresh`
   in the Claude Code plugin; "run repolore's check / refresh" elsewhere):

   > This repo already has a repolore wiki (initialized `<initializedAt>`,
   > at `<wikiRoot>/`). Use the check workflow for a health report and the
   > refresh workflow to bring stale pages back in line. To start over
   > instead: delete `.repolore/` and `<wikiRoot>/`, then re-run init.
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

Ask the user (with your environment's question UI when available). Ask only
what detection cannot decide:

1. **Wiki location** — default `docs/wiki/` (or alongside existing docs).
2. **Scope** — propose include/exclude globs from phase 1, **with the
   in-scope file count attached**: write a draft config holding just the
   `scope` block to a unique temp path outside the repo — unique per RUN,
   not just per project, so reruns never pick up a stale file (e.g.
   `/tmp/repolore-init-<project>-$(date +%s).json`) — and run
   `node <SKILL_ROOT>/scripts/bootstrap.mjs --config <that file> --dry-run`.
   It reports how many source files the globs capture, grouped by top-level
   directory — the same semantics the coverage check uses later. Show that
   number with the question: it is the cheapest moment to catch over-broad
   scope (a count that looks bloated for the repo's size means the globs need
   tightening, not the wiki). By-policy exclusions (e.g. a theme or generated
   client) should be explicit.
3. **Audiences** — default `[dev]` only. Offer extra reader types (ops,
   support, admin) only if the repo clearly serves them. (There is no config
   field for this: a non-default answer is applied after vendoring by editing
   the audience section of `<wikiRoot>/AGENTS.md` and the `audience:` line of
   `_templates/page.md`.)
4. **Seed `architecture/overview.md` now?** — **recommended default: yes.**
   One page, no fan-out: it gives the run a concrete first artifact, and it
   doubles as a live example of the citation + covers format before anyone
   reads the schema doc. Offer manifest-only as the alternative for users who
   want zero generated prose.
5. **Commit when done?** — **recommended default: yes**: a single
   `docs: initialize repolore wiki` commit at the end (vendored layer + wiki +
   pointer blocks). Alternative: leave everything uncommitted for review.
   Collecting consent here is what lets the run end fully done instead of
   parking on "say the word and I'll commit".

Accept `--yes`-style instruction from the user to take all defaults (in a
non-interactive run, take the defaults above without asking).

## Phase 3 — Map the page manifest

From phase 1 (plus light targeted reading — READMEs, entry points, route/job
registries; **structure, not embeddings**), draft a page manifest: for each
category, the pages this repo *should eventually have* — `slug`
(`category/name`), one-line `summary`, `status: planned`. Aim for 10–25
planned pages on a typical repo — and scale honestly to the repo: a small
side project may only support 3–6 real pages. Respect the soft page budget
(default 50). Categories with nothing real to say stay empty — do not pad.

## Phase 4 — Propose (the approval gate)

Assemble the **full** init config (see schema in `bootstrap.mjs`):
`projectName`, `wikiRoot`, `scopeSummary` (short prose restatement of the
scope decision incl. by-policy exclusions), `repoNotes` (3–6 lines: what the
repo is, its top-level shape, what is out of scope and why), `scope`, and the
manifest under `pages`. Re-run `bootstrap.mjs --config … --dry-run` and show
the user: the chosen location, the scope globs **with the in-scope file
count**, and the manifest as a table (category / slug / summary). Iterate
until approved. Do not write anything into the repo before approval. (In a
non-interactive all-defaults run, present the proposal and proceed — the
user's all-defaults instruction is the approval.)

## Phase 5 — Vendor the scaffold (one mechanical shot)

All judgment is now encoded in the config file; the vendoring itself is
mechanical and delegated:

1. Run `node <SKILL_ROOT>/scripts/bootstrap.mjs --config <the config file approved in phase 4>`.
   In one deterministic step it creates the wiki skeleton + category dirs,
   copies the five check scripts to `.repolore/scripts/` (the tool's entire
   footprint outside the wiki is that ONE hidden directory — keep it there
   unless the user asks), instantiates `AGENTS.md` / `wiki.config.yml` /
   templates / glossary / log, creates the `CLAUDE.md → AGENTS.md` symlink,
   writes `.repolore/manifest.json` tracking every vendored file by blob SHA,
   generates the index, and verifies (`wiki-check`, `wiki-index --check`)
   before reporting. **Do not hand-copy or re-type any of those files** — if
   bootstrap fails, read its error, fix the config, and re-run it.
2. If the user opted in (phase 2 Q4): draft `architecture/overview.md` now,
   from the code, following `<wikiRoot>/AGENTS.md` rules exactly (citations,
   covers list, `> TODO-VERIFY:` for anything unverified). Then:
   `node .repolore/scripts/wiki-stamp.mjs <page>`, regenerate the index
   (`node .repolore/scripts/wiki-index.mjs`), set the page's manifest entry to
   `status: seeded` in `wiki.config.yml`, and append the birth line to the
   END of `log.md` (newest last, after the format comment), exactly in this
   shape: `## <date> — added architecture/overview (seeded at init)` —
   reusing the `last_refreshed` date the stamp just wrote, so the journal and
   the stamp never disagree.
3. Re-run `node .repolore/scripts/wiki-check.mjs` — must exit clean.

## Phase 6 — Wire entry points (least-invasive: never create files uninvited)

Append a pointer block (≤10 lines, **pointer, not content** — never inline
wiki material into always-loaded files) to each root context file that
**already exists**: `CLAUDE.md`, `CLAUDE.local.md`, `AGENTS.md`,
`.github/copilot-instructions.md`.

- When appending, ensure exactly one blank line separates the block from the
  existing content (files missing a trailing newline are common — handle that
  in the same edit, silently; it is not worth narrating). Trust but verify:
  `tail -c1` is the cheap way to confirm the final newline landed before you
  commit.
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

## Phase 7 — Finish & report

If the user consented in phase 2 Q5, make the single commit now — message
`docs: initialize repolore wiki`, everything init created plus the pointer
blocks, **respecting any commit conventions the repo's context files declare**
(trailers, prefixes, things to omit). Never commit without that consent.

Then report, in this order:

1. **What exists now and the one next action.** The wiki location, the seeded
   overview page (or, if declined, the single suggested follow-up: "draft
   `architecture/overview` from the wiki manifest"), and the commit (made, or
   — without consent — recommended).
2. **The interface** — how to use it day-to-day: draft pages on demand
   ("draft `features/<slug>` from the wiki manifest"); the check workflow for
   health; the refresh workflow to bring stale pages back in line. Name the
   forms this install offers — `/repolore:check` and `/repolore:refresh` in
   the Claude Code plugin, "run repolore's check / refresh" with the
   standalone skill. Lead with these — they are the product surface.
3. **The plumbing** — the vendored scripts those commands run (`wiki-check`,
   `wiki-coverage`, `wiki-index`, `wiki-stamp` under `.repolore/scripts/`),
   for CI use and direct invocation. Note that the vendored layer
   (`<wikiRoot>/`, `.repolore/`, pointer blocks) is meant to be committed
   while check state never is.
4. **The coverage baseline — framed as a baseline, not a deficit.** Report
   the real numbers from `wiki-coverage.mjs` (a seeded overview may already
   cover some or even all in-scope files on a small repo): "N in-scope source
   files, M covered so far; coverage grows as manifest pages are drafted".
   Never a bare "0% covered" that reads like a failure needing an excuse —
   and never a scripted sentence that contradicts the actual count.

# Glossary

Project vocabulary, alphabetical. One line per term; cite code where a term
maps to a symbol or table. Keep entries short — a term that needs paragraphs
deserves a `concepts/` page (link it).

- **blessing** — what stamping does: asserts the prose reflects the code as
  it is right now; stamp after refreshing content, never instead of it
  (`scripts/wiki-stamp.mjs`).
- **coverage inversion** — enumerating the in-scope source files *no* page
  covers, the freshness model's blind spot
  (`scripts/wiki-coverage.mjs`; see [freshness-model](./concepts/freshness-model.md)).
- **covers** — the frontmatter list of source files a page distils, each
  pinned to the git blob SHA it had when the page was verified
  (`scripts/lib.mjs` `parseCovers`).
- **finding** — a suspected code defect (a code ≠ intent claim) surfaced as
  a by-product of drafting/refresh; one `FINDINGS.md` line pointing at the
  page that carries the evidence — a claim to re-verify, never page content
  (see [adr-009](./decisions/adr-009-findings-inbox-contract.md)).
- **findings inbox** — the committed `FINDINGS.md` relay buffer beside a
  wiki: outside page semantics, consent-only writes, deletion-not-checkbox
  triage with four domain-exiting dispositions (`templates/AGENTS.md`).
- **manifest** — `.repolore/manifest.json` only: wiki location, scripts dir,
  `pluginVersion`, and every vendored file's blob SHA (`scripts/bootstrap.mjs`).
- **page plan** — the `pages:` block of `wiki.config.yml`; the wiki's
  drafting backlog, surfaced by the index and check
  (`scripts/lib.mjs` `parsePagePlan`).
- **pointer block** — the ≤10-line wiki pointer init appends to agent
  context files that already exist (`references/init.md`, phase 6).
- **shim** — a thin plugin skill that sets `<SKILL_ROOT>` and executes the
  single-source procedure in `references/` (`skills/init/SKILL.md`).
- **SKILL_ROOT** — the directory holding `SKILL.md`, `scripts/`, and
  `templates/`; defined by whichever entry point ran (`SKILL.md`).
- **stale** — a covered file's current blob SHA no longer matches the
  recorded one: the page is unverified since the source moved, not
  necessarily wrong (`scripts/wiki-check.mjs`).
- **umbrella skill** — the root `SKILL.md` the skills CLI installs as the
  single standalone skill; root-`SKILL.md` discovery hides the plugin
  internals (`SKILL.md`; see [adr-004](./decisions/adr-004-umbrella-skill-plugin-shims.md)).
- **vendored layer** — what init leaves committed inside a target repo:
  the wiki content plus `.repolore/` (scripts + manifest)
  (`scripts/bootstrap.mjs`; why it exists: [adr-006](./decisions/adr-006-vendored-tooling.md)).

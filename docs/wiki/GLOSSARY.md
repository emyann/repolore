# Glossary

Project vocabulary, alphabetical. One line per term; cite code where a term
maps to a symbol or table. Keep entries short — a term that needs paragraphs
deserves a `concepts/` page (link it).

- **anchor-intact** — a findings-inbox item whose evidence file still
  hashes to its recorded `repolore:sha=` anchor; triage vocabulary, never a
  page word (see [adr-010](./decisions/adr-010-audit-evidence-contract.md)).
- **audited** — the strict journal line `## date — audited <category/slug>
  (N claims: …)` that is the audit's ONLY record: appended at bless time,
  one page per line, parsed per run for the due-list and dust line
  (`references/audit.md`; see [adr-010](./decisions/adr-010-audit-evidence-contract.md)).
- **blessing** — what stamping does: asserts the prose reflects the code as
  it is right now; stamp after refreshing content, never instead of it
  (`scripts/wiki-stamp.mjs`).
- **coverage inversion** — enumerating the in-scope source files *no* page
  covers, the freshness model's blind spot
  (`scripts/wiki-coverage.mjs`; see [freshness-model](./concepts/freshness-model.md)).
- **covers** — the frontmatter list of source files a page distils, each
  pinned to the git blob SHA it had when the page was verified
  (`scripts/lib.mjs` `parseCovers`).
- **directional edge-citation** — a flow edge is `verified` only when it cites
  the call site in the *caller's own code* (within a bounded span) and names the
  callee token — proving the from→to hop, not just that bytes exist anywhere
  (`scripts/wiki-flow-check.mjs`; see [adr-007](./decisions/adr-007-verification-ladder-placement.md)).
- **dust line** — the check workflow's computed "P pages never audited, Q
  audited past horizon" report line — parsed from `log.md` at check time,
  written nowhere, never gating (`references/check.md`).
- **finding** — a suspected code defect (a code ≠ intent claim) surfaced as
  a by-product of drafting/refresh; one `FINDINGS.md` line pointing at the
  page that carries the evidence — a claim to re-verify, never page content
  (see [adr-009](./decisions/adr-009-findings-inbox-contract.md)).
- **findings inbox** — the committed `FINDINGS.md` relay buffer beside a
  wiki: outside page semantics, consent-only writes, deletion-not-checkbox
  triage with four domain-exiting dispositions (`templates/AGENTS.md`).
- **flow-meta** — the line-parseable `flow_*` frontmatter (steps, edges,
  branches) a `flows/` page carries; the Mermaid diagram + tables are
  *generated* from it, never hand-authored (`scripts/wiki-flow-render.mjs`;
  schema in `references/flow.md`).
- **flow verification ladder** — the computed tiers `structural → anchored →
  edge-cited → branch-audited → set-validated` a flow page earns; the first four
  are vendored stdlib, set-validated is an opt-in user-space extractor
  (`scripts/wiki-flow-check.mjs`; see [adr-007](./decisions/adr-007-verification-ladder-placement.md)).
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
- **source-moved** — a findings-inbox item whose evidence file no longer
  hashes to its anchor: the code moved since the claim was affirmed; triage
  re-affirms these first (`references/audit.md`, Phase T).
- **stale** — a covered file's current blob SHA no longer matches the
  recorded one: the page is unverified since the source moved, not
  necessarily wrong (`scripts/wiki-check.mjs`).
- **umbrella skill** — the root `SKILL.md` the skills CLI installs as the
  single standalone skill; root-`SKILL.md` discovery hides the plugin
  internals (`SKILL.md`; see [adr-004](./decisions/adr-004-umbrella-skill-plugin-shims.md)).
- **unanchored** — an absence finding ("no X anywhere") with no file to
  hash: an honest label, not a hole; carries
  `<!-- repolore:unanchored captured=… -->` (`templates/AGENTS.md`).
- **vendored layer** — what init leaves committed inside a target repo:
  the wiki content plus `.repolore/` (scripts + manifest)
  (`scripts/bootstrap.mjs`; why it exists: [adr-006](./decisions/adr-006-vendored-tooling.md)).

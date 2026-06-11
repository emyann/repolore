# repolore — agent notes

## Project wiki (LLM-maintained)

Before working on a feature, change, or investigation, consult the
code-derived wiki at `docs/wiki/` — start at `index.md`. It is an orientation
layer: use it to learn *where to look* and *why*, then verify specifics
against the code — code is always the source of truth. Schema and authoring
rules: `docs/wiki/AGENTS.md`. When a change alters behaviour covered by a
wiki page, update that page as part of the task (`node .repolore/scripts/wiki-check.mjs`
shows what went stale); **new feature → new page**.

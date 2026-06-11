# Wiki log

Append-only journal of notable wiki operations, newest **last** — one `##`
line each, so future sessions get recency awareness for free. Never rewrite
history.

<!-- Format:
## YYYY-MM-DD — <added|refreshed|superseded|archived> <category/slug> (why)
-->

## 2026-06-11 — added architecture/overview (seeded at init)
## 2026-06-11 — added decisions/adr-001-blob-sha-freshness-anchors (distilled from RESEARCH §5c/§6 adjudications)
## 2026-06-11 — added decisions/adr-002-computed-status (distilled from RESEARCH §4/§5a)
## 2026-06-11 — added decisions/adr-003-stdlib-only-vendored-scripts (distilled from RESEARCH §5d)
## 2026-06-11 — added decisions/adr-004-umbrella-skill-plugin-shims (v0.2.1 packaging decision)
## 2026-06-11 — added decisions/adr-005-bootstrap-mechanical-vendoring (v0.2 init redesign)
## 2026-06-11 — added gotchas/cross-tool-depth-untested (supersedes RESEARCH §6 "Cross-tool reality")
## 2026-06-11 — refreshed all 7 pages (terminology sweep: "page manifest" → "page plan"; no-op re-stamps except a one-word edit in adr-005)
## 2026-06-11 — re-vendored .repolore/scripts at v0.2.2 (page-plan backlog in index + check)
## 2026-06-11 — refreshed overview, adr-004, adr-005, gotchas/cross-tool-depth-untested (init gained team auto-update Q6; no-op re-stamps)
## 2026-06-11 — added concepts/freshness-model (drafted from the wiki plan)
## 2026-06-11 — added howto/run-the-ux-harness (drafted from the wiki plan; coverage reaches 9/9)
## 2026-06-11 — refreshed 8 stale pages after the update-workflow build (targeted edits: overview, adr-004, howto; rest no-op)
## 2026-06-11 — updated vendored tooling v0.2.2 → v0.3.0 via the new update workflow (its own first run)
## 2026-06-11 — updated vendored tooling v0.3.0 → v0.3.1 (AGENTS.md gained the glossary feeding rule)
## 2026-06-11 — backfilled GLOSSARY.md (11 terms) per the new feeding rule
## 2026-06-11 — added decisions/adr-006-vendored-tooling (the "why is generated JS in my repo" answer)
## 2026-06-11 — updated vendored tooling v0.3.1 → v0.3.2 (post-commit nudge pair ADDed via the update workflow)
## 2026-06-11 — refreshed pages for the hook feature (freshness-model owns the trigger layer; howto covers the hook tests)
## 2026-06-11 — refreshed 4 pages (init wording fixes; no-op re-stamps) — flagged by the post-commit nudge on its own release commit
## 2026-06-11 — re-stamped overview (plugin.json version bump; no-op)
## 2026-06-11 — refreshed overview + adr-004 (setup workflow added; gotcha no-op) — flagged by the nudge
## 2026-06-11 — planned flows/bootstrap-vendoring, flows/update-classification, decisions/adr-007 (from RESEARCH-FLOWS §5.5/§6.5)
## 2026-06-11 — refreshed overview: added references/check.md + references/update.md to covers (close the procedure-layer freshness blind spot); planned flows/check-health, flows/refresh-triage
## 2026-06-11 — re-stamped overview after the v0.3.5 version bump (plugin.json; no-op)
## 2026-06-11 — added decisions/adr-008-per-harness-entry-point-bridging (rung-3 wiring: AGENTS.md canonical, @import for Claude)
## 2026-06-11 — refreshed for v0.3.6 rung-3 wiring: targeted edits to adr-005 (symlink→import) + cross-tool-depth rung 3; no-op re-stamps (overview, adr-004, adr-006, run-the-ux-harness)
## 2026-06-11 — amended adr-006 consequences: inverted-compat burden + skills.lock revisit trigger (costs surfaced by a vendoring-vs-dependency debate; decision unchanged)
## 2026-06-11 — added decisions/adr-009-findings-inbox-contract (findings inbox v1: capture convention ratified, from docs/RESEARCH-FINDINGS.md; tooling deferred to the audit workflow)
## 2026-06-11 — re-stamped overview after the v0.3.7 version bump (plugin.json; no-op)
## 2026-06-11 — updated vendored tooling v0.3.2 → v0.3.7 (AGENTS.md gains the findings-inbox section)
## 2026-06-11 — re-stamped overview + adr-006 after the stale-plugin channel-refresh feat (report wording + workflow step; claims unchanged, no-op)
## 2026-06-11 — re-stamped overview within the v0.3.8 release commit (plugin.json bump; no-op)
## 2026-06-11 — adr-009 consequence: v0.3.9 corrects the "zero scripts" claim (FINDINGS.md added to lib.mjs SKIP_FILES; surfaced by the first pipao migration); no-op re-stamps (freshness-model, adr-001, adr-003)
## 2026-06-11 — re-stamped overview within the v0.3.9 release commit (plugin.json bump; no-op)
## 2026-06-11 — added flows/bootstrap-vendoring (the v1 dogfood flow page) + decisions/adr-007 (flow verification design + placement), from the flows-v1 design tournament
## 2026-06-11 — refreshed for flows-v1: overview (flow tooling + references/flow.md), freshness-model (the flow verification tier), GLOSSARY (flow-meta, flow verification ladder, directional edge-citation); no-op re-stamps on adr-001/002/003/005/006/008 + howto (additive flow code in covered scripts)
## 2026-06-11 — re-stamped adr-009 (templates/AGENTS.md gained the flows subsection; findings decision unchanged, no-op)
## 2026-06-11 — updated vendored tooling v0.3.7 → v0.4.0 (flow scripts + _templates/flow.md vendored; AGENTS.md gains the flows rules); no-op re-stamps overview + adr-006

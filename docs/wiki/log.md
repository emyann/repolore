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
## 2026-06-11 — re-stamped freshness-model + adr-001/003/007 after the sequence-diagram emitter (additive flow_render projection; no claims changed)
## 2026-06-11 — updated vendored tooling v0.4.0 → v0.4.1 (sequence emitter + self-contained flow authoring in AGENTS.md); no-op re-stamp overview
## 2026-06-11 — added flows/update-classification (the second dogfood flow page: update's (recorded, current, master) SHA-triplet classification; 9 steps, 1 verified edge + 6 cited branches, tier branch-audited)
## 2026-06-11 — fixed wiki-stamp: it now fills inline flow *_sha (anchor/call/cite) from each field's sibling *_path, not just covers — the half-shipped v0.4.1 flow authoring loop; re-stamped freshness-model + adr-002
## 2026-06-11 — updated vendored tooling v0.4.1 → v0.4.2 (wiki-stamp flow-sha fix); no-op re-stamp overview
## 2026-06-12 — flows/update-classification reached set-validated: added the reference user-space extractor .repolore/validators/update-classification-seteq.mjs + registered it (validators: in wiki.config.yml), flipped flow_asserts_complete: true; references/flow.md gained the worked example
## 2026-06-12 — added wiki-flow-refresh.mjs (diff-scoped flow refresh: per-citation classify untouched/shifted/touched/gone, --apply fixes only the provably-safe classes); targeted edit on freshness-model (SHA writers), no-op re-stamps adr-001/003/009 + howto
## 2026-06-12 — updated vendored tooling v0.4.3 → v0.4.4 (wiki-flow-refresh.mjs vendored; AGENTS.md diff-scoped refresh rule); no-op re-stamp overview
## 2026-06-12 — fixed two live wrongness-behind-fresh-bytes defects found by the audit design tournament's dry-runs: overview "five masters" (reality: VENDORED_SCRIPTS, currently 10 — count claim replaced with the list pointer) and freshness-model's wiki-check.mjs:53/:52-62 citation drift (now :58/:60-67)
## 2026-06-12 — added decisions/adr-010-audit-evidence-contract + howto/audit-the-wiki (the Journal-Clock Audit ships: references/audit.md, audit shim + sixth SKILL.md routing row, check dust line + inbox count, refresh escort, findings-inbox v2 grammar in templates/AGENTS.md); dated Corrections on adr-009 (deferred findings-check, ratified by adr-010) and adr-004 (procedure enumeration grown); 5 glossary entries; targeted edit overview (procedure list), no-op re-stamp gotcha
## 2026-06-12 — audited decisions/adr-002-computed-status (10 claims: 10 confirmed; 0 findings)
## 2026-06-12 — updated vendored tooling v0.4.4 → v0.4.5 (AGENTS.md gains the findings v2 grammar + the audited journal verb); no-op re-stamp overview
## 2026-06-12 — refreshed flows/update-classification for the census feature (new census-adopt step + branch, add-new re-cited after the addNew no-clobber refactor; extractor maps needsAdoption/adopted; wiki-flow-refresh auto-fixed 12+2 shifted citations across two passes); no-op re-stamps overview + adr-006
## 2026-06-12 — updated vendored tooling v0.4.5 → v0.4.6 (update census: ADOPT class + no-clobber + --adopt); no-op re-stamp overview
## 2026-06-12 — census prose gains the symlink-bridge gotcha (writing through a pre-ADR-008 CLAUDE.md symlink clobbers AGENTS.md — hit live during the shopify-nl heal); flow-refresh re-pointed the shifted update.md citations, no-op re-stamp overview
## 2026-06-12 — audit cost model corrected after the first production run (shopify-NL, ~15x understated): byte-aware budget in references/audit.md Phase 0, §7 field correction in RESEARCH-AUDIT, dated Correction on adr-010; no-op re-stamp howto/audit-the-wiki

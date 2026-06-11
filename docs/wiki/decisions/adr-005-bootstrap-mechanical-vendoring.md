---
title: "ADR-005: Init delegates all mechanical vendoring to config-driven bootstrap.mjs"
summary: Init delegates all mechanical vendoring to config-driven bootstrap.mjs; the LLM keeps only judgment work.
category: decisions
kind: decision
audience: [dev]
read_when: "changing the init flow, the config schema, or what gets vendored into target repos"
status: accepted
date: 2026-06-10
supersedes: ~
superseded_by: ~
covers:
  - path: scripts/bootstrap.mjs
    sha: 42f64b261eb399c1de827b0485a126c325a70137
  - path: references/init.md
    sha: 7b632f359b6b70b17b211f2da6687697ddcd7c3d
generated_at_commit: e9c2194
last_refreshed: 2026-06-11
related: [architecture/overview, decisions/adr-003-stdlib-only-vendored-scripts]
---

# ADR-005: Init delegates all mechanical vendoring to bootstrap.mjs

## Context

The first shipped init (v0.1) had the LLM perform every mechanical step —
mkdir, copy five scripts, fill template placeholders, hash files, write the
manifest. Observed on the first real run: ~5 minutes of churn, plus a
transcription-error surface on every hand-copied file. The judgment in init
(stack detection, scope, the page plan, prose) is a small fraction of the
steps.

## Decision

All judgment is encoded into one JSON config (schema documented in the header
of `scripts/bootstrap.mjs`); one script call does everything mechanical —
skeleton, script copies, template instantiation, the `CLAUDE.md` `@AGENTS.md`
import (`decisions/adr-008-per-harness-entry-point-bridging`),
`.repolore/manifest.json` with blob SHAs, index generation — and
self-verifies (`wiki-check`, `wiki-index --check`) before reporting. The same
script's `--dry-run` powers the approval gates: it reports the in-scope file
count with the *same walk* the coverage check uses (`collectInScopeSources`
in `scripts/lib.mjs`), so the number shown at the gate equals the later
baseline by construction. The procedure forbids hand-copying outright
(`references/init.md`, phase 5: "Do not hand-copy or re-type any of those
files").

## Consequences

- Init is minutes faster; vendored files are byte-exact copies of masters.
- Failures are config-validation errors with named problems, not corrupted
  trees — bootstrap refuses already-initialized repos and existing wikis.
- The config JSON is ephemeral (unique temp path outside the repo); the
  durable record is `.repolore/manifest.json` + `wiki.config.yml`.

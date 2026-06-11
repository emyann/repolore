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
    sha: e5c667de838837c43be457a151c7f6003584c86b
  - path: references/init.md
    sha: d443f18f13ccbaece98d8c5c911a9c25c95fec7a
generated_at_commit: 09ee74a
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
skeleton, script copies, template instantiation, the CLAUDE.md→AGENTS.md
symlink, `.repolore/manifest.json` with blob SHAs, index generation — and
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

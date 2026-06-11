---
title: Run the init-UX test harness
summary: Running the deterministic test suite and the agentic init-UX workflow.
category: howto
kind: how-to
audience: [dev]
read_when: "changing references/init.md, scripts/bootstrap.mjs, or validating a release"
covers:
  - path: tests/make-fixtures.mjs
    sha: 65ffe7a1b23f6d66275d28e0debb492e13c48f52
  - path: tests/validate-fixture.mjs
    sha: de13e76738f44ab649230b0e25ba6e36cbb93867
  - path: .claude/workflows/test-init-ux.js
    sha: 7a6700b750df1d3cb545185c83ce8ac3b800d955
  - path: tests/bootstrap.test.mjs
    sha: 4f9723e06adc44171cbd484bd80ae1701b37569f
  - path: tests/hook.test.mjs
    sha: 3f93d03728f73c844aa1aa27ea1052ac9fc04418
  - path: tests/update.test.mjs
    sha: 0f41fe3d446f49f9dae2524c89eed99c0063974e
  - path: tests/lib.test.mjs
    sha: 53a3786b7c17269e72e49cd2fe6c893712133d4b
  - path: tests/_helpers.mjs
    sha: 69761a14bf7edef781572eb0cbc239be38090a43
generated_at_commit: e9c2194
last_refreshed: 2026-06-11
related: [decisions/adr-005-bootstrap-mechanical-vendoring, architecture/overview]
---

# Run the init-UX test harness

> Two layers, split by what they can see: deterministic tests check the
> mechanical bootstrap path; the agentic workflow checks the *experience* —
> question flow, report framing, what an agent actually does when handed the
> skill.

## Layer 1 — deterministic (seconds, free, CI)

```bash
node --test tests/*.test.mjs
```

`tests/bootstrap.test.mjs` + `tests/update.test.mjs` + `tests/hook.test.mjs` + `tests/lib.test.mjs` (shared fixtures in `tests/_helpers.mjs`) drive the plugin-side tools and the hook lifecycle against throwaway fixture
repos: dry-run census, vendoring, placeholder instantiation, manifest SHA
integrity, the re-run guard, config validation, YAML quoting, the page-plan
backlog/drift lints, and the invariant that the approval-gate file count
equals the coverage baseline. Runs in CI via `.github/workflows/validate.yml`.

## Layer 2 — agentic (≈6–8 min, ≈200k subagent tokens per run)

1. **Fresh fixtures every run** (the builder refuses to reuse a directory):

   ```bash
   node tests/make-fixtures.mjs /tmp/repolore-ux-<unique>
   ```

   Three scenario repos (`tests/make-fixtures.mjs`): `s1-defaults` (root
   CLAUDE.md with commit conventions and **no trailing newline** — the
   phase-6 edge), `s2-no-context` (wiring must be skipped, never created
   uninvited), `s3-already-init` (preflight must abort). Each gets a
   `baseline` git tag so commits made by the run are countable.

2. **Run the workflow** — from a Claude Code session in this repo, invoke the
   `test-init-ux` workflow (`.claude/workflows/test-init-ux.js`) with
   `{pluginRoot: <this repo>, fixtures: {s1, s2, s3}}` from the builder's
   JSON output.

3. **Read the three verdicts per scenario.** Each flows runner → validator →
   judge: a runner agent executes `references/init.md` non-interactively
   (taking the stated defaults), `tests/validate-fixture.mjs` asserts the
   mechanical end state (seeded + stamped overview, single conventional
   commit honoring repo rules, pointer-block placement, no leaked temp
   config…), and a judge grades the runner's verbatim user-facing report
   against the UX rubric (count at the gate, interface-before-plumbing,
   baseline framing, fully-done ending, no micro-narration).

## The harvest is the frictionNotes

The runners are instructed to report friction honestly — that field has
found real bugs every round (the YAML quoting bug, the UTC/local date
mismatch, the plan-flip-before-index ordering). Treat `overallPass: true`
as the floor and the friction notes as the actual yield; fix what they name,
then re-run with fresh fixtures (same-prompt resumes replay cached results
and re-test nothing).

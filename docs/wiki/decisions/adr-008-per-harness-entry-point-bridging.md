---
title: 'ADR-008: Bridge AGENTS.md into each harness by its native mechanism'
summary: AGENTS.md is the one canonical pointer; each harness links to it by the cheapest faithful means — @import for Claude, literal block for Copilot, emitters later.
category: decisions
kind: decision
audience: [dev]
read_when: "wiring agent context files (CLAUDE.md / AGENTS.md / copilot-instructions), building a per-harness emitter, or deciding how the wiki pointer reaches a given agent"
status: accepted
date: 2026-06-11
supersedes: ~
superseded_by: ~
covers:
  - path: references/init.md
    sha: 7b632f359b6b70b17b211f2da6687697ddcd7c3d
  - path: scripts/bootstrap.mjs
    sha: 42f64b261eb399c1de827b0485a126c325a70137
generated_at_commit: e9c2194
last_refreshed: 2026-06-11
related: [gotchas/cross-tool-depth-untested, architecture/overview, decisions/adr-004-umbrella-skill-plugin-shims]
---

# ADR-008: Bridge AGENTS.md into each harness by its native mechanism

## Context

repolore's root-level orientation pointer ("consult the wiki before working")
must reach whatever agent a contributor runs. But harnesses disagree on which
file they auto-load, and that disagreement decides whether the pointer is seen
at all:

- `AGENTS.md` is the cross-tool standard (Codex and the documented default
  read it directly). Claude Code — the only first-class host today — auto-loads
  **`CLAUDE.md`** and `CLAUDE.local.md` and **never `AGENTS.md`**. `references/init.md`
  phase 6 used to list `AGENTS.md` / `CLAUDE.md` / `copilot-instructions.md` as
  if interchangeable; they are not.
- Copilot reads `.github/copilot-instructions.md` (plus path-scoped
  `*.instructions.md` `applyTo` globs).

This is **rung 3** of the nudge-strength ladder in
`gotchas/cross-tool-depth-untested` (the root pointer block). **Rung 2** —
mechanical path-scoped emitters derived from `covers` + `read_when` (Cursor
`.mdc`, Copilot `applyTo`) — is a later (v0.4+) build. So today a repo that
lets init create only a root `AGENTS.md` leaves Claude Code with no startup
pointer, and `scripts/bootstrap.mjs` papered over the in-wiki case with a
`CLAUDE.md → AGENTS.md` **symlink**, which carries Windows dev-mode and CI
symlink-following caveats plus a silent copy-fallback that can drift.

## Decision

We will keep **`AGENTS.md` as the single canonical pointer** and link every
other harness's native file to it by the cheapest faithful mechanism, never a
duplicated copy:

- **Claude (`CLAUDE.md` / `CLAUDE.local.md`)** — a one-line `@AGENTS.md`
  import. Portable (no symlink), and it leaves room for Claude-only notes.
- **Copilot (`.github/copilot-instructions.md`)** — the literal pointer block,
  until the rung-2 `applyTo` emitter exists.
- **Codex / anything that reads `AGENTS.md` directly** — nothing; it is the
  canonical file.

Where `AGENTS.md` is absent, the file being wired *is* canonical and carries
the literal block. `scripts/bootstrap.mjs` writes the in-wiki bridge as a
regular `docs/wiki/CLAUDE.md` containing `@AGENTS.md` (raw, untracked — it has
no master to regenerate from), replacing the symlink. init phase 6 wiring is
idempotent (never double-wire) and still never creates a context file without
consent.

## Consequences

- One canonical pointer; bridges are mechanical and DRY. No more duplicated
  ≤10-line blocks drifting between `AGENTS.md` and `CLAUDE.md`.
- The symlink's portability caveats and copy-fallback are gone; the in-wiki
  bridge behaves identically on Windows and in CI checkouts.
- A real seam for the v0.4 emitters: rung 2 slots in as "a better mechanism for
  harness X" without changing this model — `read_when` + `covers` already exist
  to drive it.
- The mixed-team case (a repo with both `CLAUDE.md` and `AGENTS.md`) is now
  first-class: `CLAUDE.md` imports `AGENTS.md` rather than carrying its own copy.
- `@import` is Claude-specific; an agent that read `CLAUDE.md` literally without
  resolving imports would see only `@AGENTS.md`. Accepted: the only documented
  consumer of `CLAUDE.md` is Claude Code, which resolves it.

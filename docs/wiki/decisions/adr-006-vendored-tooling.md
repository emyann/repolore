---
title: "ADR-006: Vendor the tooling into every repo — verification must survive the tool"
summary: Why generic, non-repo-specific scripts are committed into every initialized repo instead of running from the plugin install or npm.
category: decisions
kind: decision
audience: [dev]
read_when: "questioning why generated JS is committed to a repo, or tempted to run checks from the plugin install or an npm package"
status: accepted
date: 2026-06-11
supersedes: ~
superseded_by: ~
covers:
  - path: scripts/bootstrap.mjs
    sha: 42f64b261eb399c1de827b0485a126c325a70137
  - path: scripts/update.mjs
    sha: ed6ebb55d8b2b36ece94279f7f53d79066770644
generated_at_commit: 950898f
last_refreshed: 2026-06-12
related: [decisions/adr-003-stdlib-only-vendored-scripts, decisions/adr-005-bootstrap-mechanical-vendoring, decisions/adr-004-umbrella-skill-plugin-shims]
---

# ADR-006: Vendor the tooling into every repo

## Context

The five vendored scripts are **not** repo-specific: bootstrap copies them
byte-identical (`scripts/bootstrap.mjs`), and everything contextual lives in
`wiki.config.yml` and `.repolore/manifest.json`, read at runtime. Generic
code could instead run from the plugin install or an npm package — so every
adopting reviewer reasonably asks: why is generated JS committed to my repo?

## Decision

We commit byte-identical copies into each initialized repo, track each by
blob SHA in `.repolore/manifest.json`, and evolve them only through the
explicit, consented update workflow (`scripts/update.mjs`,
`references/update.md`). Four reasons, in descending weight:

1. **The trust model requires verification with nothing installed.** The
   wiki's promise is that anyone — a teammate without the plugin, a CI
   runner, a Cursor/Copilot clone, future maintainers after the plugin is
   gone — can check any page's freshness in under a second, offline. If
   checking required the plugin, "fresh" would be a private signal for
   Claude Code users; a wiki most readers cannot verify is prose with
   decoration. Vendoring makes self-verifiability a property of the repo.
2. **Version coherence.** The scripts parse exactly the schema the same
   repo's `AGENTS.md` documents, and the pages were written against both —
   doc + parser + content form one coherent set per schema version. A
   plugin-side checker *auto-updates*: the meaning of "fresh" could change
   under a repo overnight, the precise disease this tool positions against.
3. **CI and hooks run on a bare checkout.** `node
   .repolore/scripts/wiki-check.mjs` needs no install, no network, no
   third-party fetch in the pipeline.
4. **Survivability.** The auto-doc graveyard is documented in
   `docs/RESEARCH.md` §3. If this project dies, every initialized repo keeps
   a complete, MIT-licensed, dependency-free verification layer forever.

## Consequences

- Cost accepted: ~30KB across ~6 committed files, occasional one-command
  tooling-update commits, and the reviewer question this record answers.
  Kept cheap by ADR-003 (stdlib-only: the bytes are the whole cost — no
  lockfile churn, no CVE treadmill) and by update's consent gate (local
  edits are never overwritten silently; manifest SHAs make all drift
  detectable).
- Cost accepted — **inverted compatibility burden**: vendoring does not
  remove the forever-backward-compat promise a registry approach would
  rely on; it reverses its direction. New plugin versions must cope with
  every old vendored script still in the wild, or migrate it through the
  consent gate — which is why this project owns a bespoke
  update-distribution subsystem (`scripts/update.mjs`, manifest blob SHAs,
  the interactive update offer in check) that a package registry would
  have provided for free.
- Alternatives rejected: **plugin-side execution** (verification becomes
  private to plugin users; auto-update changes semantics under the repo);
  **npm package via npx** (puts a registry, the network, and a supply chain
  on the verification path — the one step that must be most trustworthy).
- **Revisit trigger**: the calculus flips if agent skills/plugins gain
  repo-side version pinning honored by a universal resolver — a
  `skills.lock` that every harness and CI runner respects. "The repo
  declares, the environment resolves" would then match vendoring on both
  reach and version coherence; at that point, supersede this record rather
  than defend it.

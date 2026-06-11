# repolore — setup procedure

> Single source for the setup workflow: detect optional, consent-gated
> capabilities that are **available but not active**, and turn each into one
> simple question the user can accept or decline — so nobody has to know to
> ask. `<SKILL_ROOT>` was defined by your entry point.

## Principles

- **Detect, ask, apply — never activate silently.** The question IS the
  consent; once accepted, apply immediately and report plainly.
- **One question, all capabilities** (multi-select where your environment
  supports it). A decline means "not now" — no nagging state is kept; setup
  only runs when invoked, when the update workflow ADDs a new capability,
  or when the user follows check's pointer.
- Detection is cheap shell checks, read-only until consent.

## Capability detectors (run all, present only applicable + inactive ones)

1. **Post-commit wiki nudge — per-machine.**
   - Applicable: `.repolore/scripts/wiki-hook.mjs` exists.
   - Active: the active hooks file contains the repolore marker — resolve
     the hooks dir (`git config core.hooksPath` || `.git/hooks`), grep
     `post-commit` there for `>>> repolore wiki nudge`.
   - Apply: `node .repolore/scripts/wiki-install-hook.mjs`.
   - Pitch: "after each commit, prints only when pages went stale or new
     page-worthy code lacks a page; silent when green; never blocks."

2. **Team-wide nudge — per-repo (commits a change).**
   - Applicable: the repo has a *committed* hooks mechanism — a
     `core.hooksPath` dir under version control (husky's `.husky/`,
     `.githooks/`) — or a `package.json` (the npm `prepare` lifecycle).
   - Active: the committed hook file carries the marker, or `package.json`
     `scripts.prepare` invokes `wiki-install-hook.mjs`.
   - Apply, by case: committed hooks dir → run the installer (it writes
     into that dir; the file is tracked, so committing it activates the
     nudge for every contributor that mechanism reaches). npm repo without
     husky → deep-merge into `package.json`:
     `"prepare": "node .repolore/scripts/wiki-install-hook.mjs || true"`
     (idempotent installer + `|| true` keep installs unbreakable).
   - This APPLIES A COMMITTED CHANGE: say so in the question; ship it as a
     `chore(repolore):` commit per the repo's conventions.
   - Why per-contributor otherwise: git never clones hooks (by security
     design); husky-style mechanisms only piggyback activation on `npm
     install`. Without one of those, the per-machine one-liner is the floor.

3. **Team auto-update — Claude Code plugin installs only** (you are one if
   `${CLAUDE_PLUGIN_ROOT}` is defined).
   - Applicable: running as the plugin.
   - Active: `.claude/settings.json` contains the repolore
     `extraKnownMarketplaces` + `enabledPlugins` keys.
   - Apply: deep-merge the two keys (snippet in `references/init.md` Q6),
     preserving existing settings. Creating the file is fine HERE — this
     question is the consent init's Q6 lacked when the file didn't exist.

## Procedure

1. Preflight: `.repolore/manifest.json` exists (else → init workflow).
2. Run the detectors. If everything applicable is active: one line
   ("all optional capabilities active") and stop.
3. Ask ONE question listing the inactive capabilities with their pitches
   and costs (per-machine vs commits-a-change). Accept/decline per item.
4. Apply the accepted ones; report what was activated, what was declined
   ("ask again anytime via the setup workflow"), and commit any committed
   changes per the repo's conventions (consent came from the question).

## Where setup gets invoked from

- The user, anytime ("set up repolore extras", `/repolore:setup`).
- The **update workflow**, immediately after ADDing scripts that enable a
  new capability — ask the new capability's question right then.
- The **check workflow** points here (one hygiene line, never re-asks).

# repolore

**Your codebase has lore — the decisions, gotchas, and
why-things-are-the-way-they-are that live in nobody's head for long. repolore
makes your agent write it down, cite it, and keep it honest.**

It's [Karpathy's llm-wiki pattern](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)
applied to a codebase — the immutable raw-source layer is the repo itself. A
Claude Code plugin bootstraps and maintains an **LLM-derived wiki**: an
orientation layer of concepts, architecture, feature histories, decision
records, and hard-won gotchas, distilled from the code by your agent, for your
agent (and the humans on your team).

What makes it different from DeepWiki / Code Wiki / memory banks:

- **In-repo, plain markdown, human-editable.** The wiki is committed content
  you own and review — not a hosted artifact that rewrites itself overnight.
- **Per-claim grounding.** Every concrete claim carries an inline citation to
  the source file it came from; unverifiable claims are demoted to
  `> TODO-VERIFY:` rather than asserted.
- **Mechanical drift detection.** Each page records the **git blob SHA** of
  every file it covers; a stdlib-only script re-hashes and flags exactly which
  pages went stale, and which files made them stale. LLM judgment is never the
  staleness trigger — [LLMs systematically miss implementation drift](https://arxiv.org/pdf/2604.03447);
  hashes don't.
- **Coverage inversion.** A second check enumerates in-scope source files no
  page covers — so a whole feature can't silently ship without a page.
- **Diff-driven refresh, reviewable commits.** The refresh skill feeds the
  exact diff since the page was last verified, triages no-op / edit / rewrite,
  and produces a normal commit you review — never silent mutation.
- **Curated, not generated.** A page plan you approve, a soft page budget,
  and a distillation rule ("if an agent can find it in 30 seconds, it doesn't
  belong here") keep it an orientation layer, not 400 pages of paraphrased code.
- **Minimal footprint.** Outside the wiki itself, the tool's entire presence is
  one hidden `.repolore/` directory (manifest + stdlib-only scripts) and a
  ≤10-line pointer appended to agent context files that already exist — init
  never creates a context file without asking.

## Install

**As a Claude Code plugin** — namespaced commands, versioned updates:

```text
/plugin marketplace add emyann/repolore     # or a local path while testing
/plugin install repolore@repolore
```

**As a standalone skill, in any agent** (Claude Code, Cursor, Copilot,
Windsurf, …) via the [skills CLI](https://www.skills.sh/):

```text
npx skills add emyann/repolore
```

That installs the single `repolore` umbrella skill; invoke it in plain words
— "set up a repolore wiki here", "run repolore's check", "refresh the wiki".
Both forms run the same procedures and scripts (see *Packaging* below).

## Updating

Releases ship as version bumps of `plugin.json` (see the
[releases page](https://github.com/emyann/repolore/releases)).

**Claude Code plugin — manually:**

```text
/plugin marketplace update repolore     # refresh the catalog
/plugin update repolore@repolore        # update the installed plugin
```

**Claude Code plugin — automatically.** Auto-update is off by default for
third-party marketplaces; enable it once via `/plugin` → **Marketplaces** →
repolore → **Enable auto-update**, and new versions install at startup.
(Launch-update semantics: the session that fetches a new version keeps
running on the snapshot it already loaded — the update applies from the
next session, or after `/reload-plugins`.)
Better for teams: declare it in the project's `.claude/settings.json` and
every teammate gets the plugin, pre-enabled and auto-updating, with zero
setup:

```json
{
  "extraKnownMarketplaces": {
    "repolore": {
      "source": { "source": "github", "repo": "emyann/repolore" },
      "autoUpdate": true
    }
  },
  "enabledPlugins": { "repolore@repolore": true }
}
```

**Standalone skill:** `npx skills update` re-pulls installed skills from
their source repos.

**The vendored layer is updated separately, on purpose.** Updating the
plugin/skill does not touch the `.repolore/scripts/` copies committed to your
repos — your wiki tooling never changes under you silently. The check
workflow detects newer tooling and offers `/repolore:update`, which applies
it safely: pristine files are regenerated, your locally-edited ones are
skipped and reported (overwritten only with explicit `--force` consent), and
the manifest SHAs stay truthful.

## Use

| Command | What it does |
|---|---|
| `/repolore:init` | One-time bootstrap: detect the stack → agree scope (with the in-scope file count shown up front) + a page plan with you → vendor the wiki skeleton, schema doc (`AGENTS.md`), check scripts and templates in one mechanical shot (`bootstrap.mjs`) → seed `architecture/overview.md` (default, declinable) → append pointer blocks to whichever agent context files already exist → optionally wire team auto-update into `.claude/settings.json` (see *Updating*) → finish with a single `docs:` commit (with your consent, asked once up front). |
| `/repolore:check` | Health report: stale pages, uncovered «page-worthy» code clusters, index drift, page budget. Read-only, never blocks. |
| `/repolore:refresh` | Bring stale pages back in line with the code: diff-driven triage, citation re-verification, re-stamp, regenerate index, reviewable commit. |
| `/repolore:setup` | Activate optional capabilities with one consented question: the post-commit nudge (per-machine, or team-wide via husky/`prepare` script), team auto-update in project settings. Detects what is available-but-inactive so you never have to know to ask. |
| `/repolore:update` | Bring the repo's vendored tooling up to the installed repolore version: deterministic classification (up-to-date / outdated-pristine / locally modified / missing / new), safe regeneration, manifest SHAs + version refreshed. Never overwrites your local edits without explicit `--force` consent. |

With the standalone skill the same workflows are invoked in plain words
("set up a repolore wiki", "run repolore check/refresh") instead of slash
commands.

Day-to-day, pages get drafted **on demand** ("draft `features/refund-pipeline`
from the wiki plan") and updated as part of the change that altered the
behaviour — the pointer block installed by init tells every agent session to
do exactly that.

## Packaging

One source of truth, two distributions: the procedures live in
[`references/`](./references/) and the assets in `scripts/` + `templates/`.
The root [`SKILL.md`](./SKILL.md) is the standalone umbrella skill the skills
CLI installs (root-`SKILL.md` discovery means `npx skills add` sees exactly
one skill), and the plugin's `skills/init|check|refresh|update` are thin shims that
execute the same reference procedures — so the namespaced `/repolore:*`
commands and the standalone skill can never drift apart.

## What init vendors into your repo

```text
docs/wiki/                  # location configurable
  index.md                  # GENERATED catalog (llms.txt-shaped)
  AGENTS.md                 # the schema doc: taxonomy, frontmatter, citation + refresh rules
  CLAUDE.md -> AGENTS.md    # symlink so Claude Code auto-loads it in the wiki tree
  GLOSSARY.md  log.md       # vocabulary + append-only journal
  wiki.config.yml           # machine-read config: scope globs, tunables, page plan
  architecture/ concepts/ features/ flows/ decisions/ gotchas/ howto/
  _templates/               # page.md + decision.md
.repolore/                  # the ONLY footprint outside the wiki — one hidden dir
  manifest.json             # wiki location + vendored-file hashes (for future safe updates)
  scripts/                  # vendored, stdlib-only (node + git), zero npm install
    wiki-check.mjs          # blob-SHA freshness: fresh / stale / unmanaged / malformed
    wiki-coverage.mjs       # in-scope files no page covers; --since <ref> new-page nudge
    wiki-stamp.mjs          # writes covers SHAs + generated_at_commit (never hand-compute)
    wiki-index.mjs          # regenerates index.md; --check for drift
    wiki-hook.mjs           # non-blocking post-commit nudge (always exit 0)
    wiki-install-hook.mjs   # one-liner per contributor; chains existing hooks
```

**Pages are the product and always committed; tooling is regenerable; check
state is never committed** — freshness status is recomputed in under a second,
so there is no `status:` field to dirty your tree or conflict in merges.

**Why is tooling committed to my repo at all?** Because the wiki's promise —
anyone can verify any page's freshness in under a second — has to hold for
people and pipelines with *nothing* installed: teammates without the plugin,
CI on a bare checkout, other agents (Cursor, Copilot, Codex), and future
maintainers if this project ever dies. Vendoring also keeps the schema doc,
its parser, and your pages in version lockstep — a plugin-side checker
auto-updates, and "fresh" must never change meaning under your repo
overnight. The cost is ~30KB of dependency-free files and an occasional
one-command, consent-gated `/repolore:update`. Full reasoning:
[ADR-006](./docs/wiki/decisions/adr-006-vendored-tooling.md).

## Design

The design is the synthesis of a multi-angle research pass over the
auto-wiki landscape (DeepWiki, Google Code Wiki, mutable.ai, CodeWiki,
RepoAgent…), agent memory-bank patterns (Cline et al.), doc-structure
frameworks (Diátaxis, arc42, ADRs), packaging precedents (BMAD-METHOD,
superpowers), and a production reference implementation that ran this system
for months on a real integration platform. See
[docs/RESEARCH.md](./docs/RESEARCH.md) for the full report — landscape
comparison, the five documented failure modes of auto-wikis, and the rationale
behind every default.

Cost note: an agentic refresh run on a typical stale set costs on the order of
$0.50–2.00 of tokens ([published recipes](https://understandingdata.com/posts/doc-drift-detection-ci/));
the deterministic checks are free and instant.

## Testing

Two layers (see [tests/README.md](./tests/README.md)): deterministic
`node --test` coverage of the bootstrap vendoring path (runs in CI), and an
on-demand agentic workflow (`.claude/workflows/test-init-ux.js`) that executes
`/repolore:init` end to end in three fixture repos, mechanically validates the
end state, and grades the onboarding experience against a UX rubric.

## Roadmap

v0.1 — init, check, refresh, stamp, generated index.
v0.2 (this) — config-driven one-shot `bootstrap.mjs` (dry-run scope census,
SHA-tracked vendoring, self-verification); init UX overhaul (seeded overview
by default, up-front commit consent, in-scope count at the approval gate,
interface-first report); single local-date source; plugin-update nudge in
`check`; deterministic + agentic test harness.
v0.2.1 (this) — standalone distribution via the skills CLI / skills.sh: root
umbrella `SKILL.md`, single-source procedures in `references/`, plugin skills
as shims; agent-portable wording in vendored script messages.
v0.2.2 (this) — the page plan made visible: backlog section in the generated
`index.md`, plan state + plan↔reality drift lints in `wiki-check`, and the
"page manifest" terminology retired ("manifest" now only ever means
`.repolore/manifest.json`).
v0.2.3 (this) — init optionally wires team auto-update (the *Updating*
settings recipe) into `.claude/settings.json`.
v0.3.0 (this) — the `update` workflow: manifest-hash safe regeneration of the
vendored layer (`scripts/update.mjs` + `/repolore:update`); fixed a latent
bug it uncovered (unquoted config values kept trailing comments, so the
page-budget warning could never fire).
v0.3.1 (this) — the glossary feeding loop: init seeds 3–8 cited terms, the
page-writing/refresh workflows must record every term they coin, check
reports an empty glossary as a smell and offers a backfill.
v0.3.2 (this) — the post-commit nudge: per-contributor, chaining-safe,
never blocks (silent when green; stale pages + new-page-worthy files
otherwise); installed by init (consented) and offered by update to existing
repos.
v0.3.4 (this) — the setup workflow: available-but-inactive capabilities
become one consented question (and update asks it directly when it ADDs new
capability scripts); team-wide nudge recipes (husky dir, npm `prepare`).
v0.3.5 (this) — check offers a clean tooling update interactively (a one-tap
question when no local edits and no stale pages outrank it), not just a prose
pointer; overview now covers the check/update procedures so edits to them trip
the freshness nudge.
v0.3.6 (this) — Claude-aware entry-point wiring: `AGENTS.md` stays the one
canonical pointer and each harness links to it by its native mechanism — an
`@AGENTS.md` import for `CLAUDE.md` (Claude Code never auto-loads `AGENTS.md`),
the literal block for Copilot. The in-wiki bridge switches from symlink to
import (portable — no Windows/CI symlink caveat). See `adr-008`.
v0.3.7 (this) — the findings inbox (v1, convention only): code-defect
findings surfaced while drafting/refreshing pages get a `FINDINGS.md` relay
buffer beside the wiki — outside page semantics, consent-only writes,
deletion-not-checkbox triage with four domain-exiting dispositions; created
on demand, never written by check/hooks, never gating. Tooling (per-item SHA
anchors, triage workflow) deferred to the audit workflow. See `adr-009` +
[docs/RESEARCH-FINDINGS.md](./docs/RESEARCH-FINDINGS.md).
v0.3.8 (this) — update closes the stale-plugin loop: a repo can only sync to
the *installed* plugin version, so "nothing to do" could mask a stale install.
`update.mjs` now names the installed version in its report, and the workflow
probes the marketplace clone on disk (zero network, best-effort) and offers
the consented channel refresh (`claude plugin marketplace update` /
`npx skills update`), ending with the user-only reload step.
v0.3.9 (this) — the findings inbox actually works: `wiki-check`/`-index`/the
page budget now skip `FINDINGS.md` (added to `lib.mjs` `SKIP_FILES`), so the
inbox stops being flagged `MALFORMED`. ADR-009's v1 "zero scripts" was wrong
by one line — caught by the first real migration (pipao's 28-item backlog).
v0.4.0 (this) — flows v1 (a new page category, [docs/RESEARCH-FLOWS.md](./docs/RESEARCH-FLOWS.md),
design chosen by an adversarial 5-approach build-off): a flow is line-parseable
`flow-meta` from which `wiki-flow-render.mjs` *generates* a GitHub-safe Mermaid
diagram + anchored tables; `wiki-flow-check.mjs` computes the tier (structural →
anchored → **directional** edge-cited → branch-audited → set-validated). The
directional graft — a `verified` edge must cite the call site in the caller's
own code and name the callee — closes the edge-existence hole that broke all
five prototypes; set-equality is proven non-vendorable and lives in a user-space
`validators:` seam (ADR-007). Folded into `wiki-check`; dogfood: `flows/bootstrap-vendoring`.
v0.4.1 (this) — flows v1 finished for every harness: a `sequence` diagram
projection (`flow_render: sequence` — same flow-meta, actors→participants,
edges→messages; verification unchanged), and the flow authoring loop +
verified-vs-inferred rule folded into the vendored `AGENTS.md` so a target repo
can draft a flow without the plugin-side `references/flow.md` (it becomes the
optional deep reference).
v0.4.x — flows v2: the reference user-space extractors, the diff-scoped
flow-refresh step, and the second dogfood flow page (`flows/update-classification`);
the `audit` workflow (LLM pass for wrongness/duplication — what hashes can't
catch) + findings-inbox v2 it feeds.
v0.5+ — `wiki-index.json` connector contract + llms.txt emitter; Quartz site
(renders flows from the flow-meta sidecars) + MCP connector recipes; GitHub
Action recipe; Copilot `applyTo` / Cursor `.mdc` emitters.
This section is the single roadmap home; the numbering in the report's §7 is
the original point-in-time plan and has diverged (§7 says so too).

## License

MIT

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
| `/repolore:update` | Bring the repo's vendored tooling up to the installed repolore version: deterministic classification (up-to-date / outdated-pristine / locally modified / missing / new), safe regeneration, manifest SHAs + version refreshed. Never overwrites your local edits without explicit `--force` consent. |

With the standalone skill the same three workflows are invoked in plain words
("set up a repolore wiki", "run repolore check/refresh") instead of slash
commands.

Day-to-day, pages get drafted **on demand** ("draft `features/refund-pipeline`
from the wiki plan") and updated as part of the change that altered the
behaviour — the pointer block installed by init tells every agent session to
do exactly that.

## Packaging

One source of truth, two distributions: the three procedures live in
[`references/`](./references/) and the assets in `scripts/` + `templates/`.
The root [`SKILL.md`](./SKILL.md) is the standalone umbrella skill the skills
CLI installs (root-`SKILL.md` discovery means `npx skills add` sees exactly
one skill), and the plugin's `skills/init|check|refresh` are thin shims that
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
```

**Pages are the product and always committed; tooling is regenerable; check
state is never committed** — freshness status is recomputed in under a second,
so there is no `status:` field to dirty your tree or conflict in merges.

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
v0.3.x — post-commit hook + `install-hook`; Copilot `applyTo` / Cursor `.mdc`
emitter; read-side consumption eval; dangling-reference and link lints;
`audit` workflow (LLM pass for wrongness/duplication — what hashes can't
catch).
v0.4+ — `wiki-index.json` connector contract + llms.txt emitter;
flow-validator plugin harness; Quartz site + MCP connector recipes; GitHub
Action recipe.
This section is the single roadmap home; the numbering in the report's §7 is
the original point-in-time plan and has diverged (§7 says so too).

## License

MIT

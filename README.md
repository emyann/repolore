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
- **Curated, not generated.** A page manifest you approve, a soft page budget,
  and a distillation rule ("if an agent can find it in 30 seconds, it doesn't
  belong here") keep it an orientation layer, not 400 pages of paraphrased code.

## Install

```text
/plugin marketplace add emyann/repolore     # or a local path while testing
/plugin install repolore@repolore
```

## Use

| Command | What it does |
|---|---|
| `/repolore:init` | One-time bootstrap: detect the stack → agree scope + a page manifest with you → vendor the wiki skeleton, schema doc (`AGENTS.md`), check scripts and templates into the repo → wire pointer blocks into `CLAUDE.md`/`AGENTS.md`/copilot-instructions. |
| `/repolore:check` | Health report: stale pages, uncovered «page-worthy» code clusters, index drift, page budget. Read-only, never blocks. |
| `/repolore:refresh` | Bring stale pages back in line with the code: diff-driven triage, citation re-verification, re-stamp, regenerate index, reviewable commit. |

Day-to-day, pages get drafted **on demand** ("draft `features/refund-pipeline`
from the wiki manifest") and updated as part of the change that altered the
behaviour — the pointer block installed by init tells every agent session to
do exactly that.

## What init vendors into your repo

```text
docs/wiki/                  # location configurable
  index.md                  # GENERATED catalog (llms.txt-shaped)
  AGENTS.md                 # the schema doc: taxonomy, frontmatter, citation + refresh rules
  CLAUDE.md -> AGENTS.md    # symlink so Claude Code auto-loads it in the wiki tree
  GLOSSARY.md  log.md       # vocabulary + append-only journal
  wiki.config.yml           # machine-read config: scope globs, tunables, page manifest
  architecture/ concepts/ features/ flows/ decisions/ gotchas/ howto/
  _templates/               # page.md + decision.md
scripts/repolore/           # vendored, stdlib-only (node + git), zero npm install
  wiki-check.mjs            # blob-SHA freshness: fresh / stale / unmanaged / malformed
  wiki-coverage.mjs         # in-scope files no page covers; --since <ref> new-page nudge
  wiki-stamp.mjs            # writes covers SHAs + generated_at_commit (never hand-compute)
  wiki-index.mjs            # regenerates index.md; --check for drift
.repolore/manifest.json     # wiki location + vendored-file hashes (for future safe updates)
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

## Roadmap

v0.1 (this) — init, check, refresh, stamp, generated index.
v0.2 — post-commit hook + `install-hook`; dangling-reference and link lints;
`wiki-index.json` connector contract + llms.txt emitter; `update` skill
(manifest-hash safe regeneration); flow-validator plugin harness; `audit`
skill (LLM pass for wrongness/duplication — what hashes can't catch); Quartz
site + MCP connector recipes; GitHub Action recipe.
See the report's §7 for the full sequence.

## License

MIT

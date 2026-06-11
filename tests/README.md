# repolore tests

Two layers, by what they can see:

## 1. Deterministic (CI, free, seconds)

```bash
node --test tests/*.test.mjs
```

`bootstrap.test.mjs` drives `scripts/bootstrap.mjs` against throwaway fixture
repos: dry-run census, full vendoring, placeholder instantiation, manifest
blob-SHA integrity, the re-run guard, config validation, the seeded-page path,
and the core invariant that **the file count shown at the approval gate equals
the coverage baseline**. Runs in CI via `.github/workflows/validate.yml`.

## 2. Agentic init-UX test (on demand, costs tokens, minutes)

The deterministic layer can't see the *experience* — question flow, report
framing, gates, what an agent actually does when handed the skill. For that,
a Claude Code workflow runs `/repolore:init` end to end in three scenario
repos and grades the result:

| Scenario | Exercises |
|---|---|
| `s1-defaults` | full defaults path; root `CLAUDE.md` with commit conventions and **no trailing newline** |
| `s2-no-context` | no agent context file — wiring must be skipped, never created uninvited |
| `s3-already-init` | already-initialized repo — preflight must abort gracefully |

Each scenario flows through three stages: a **runner** agent executes
`skills/init/SKILL.md` non-interactively (taking the skill's stated defaults),
`tests/validate-fixture.mjs` then asserts the mechanical end state (seeded +
stamped overview, single conventional commit, pointer-block placement,
manifest SHA integrity…), and a **judge** agent grades the runner's
user-facing report against a UX rubric (count shown at the gate,
interface-before-plumbing ordering, baseline framing, fully-done ending,
no micro-narration).

To run it, from a Claude Code session in this repo:

```text
> build fresh fixtures: node tests/make-fixtures.mjs /tmp/repolore-ux-<something-unique>
> run the test-init-ux workflow with args {pluginRoot: <this repo>, fixtures: {s1,s2,s3 paths printed by make-fixtures}}
```

The workflow definition lives at `.claude/workflows/test-init-ux.js`. Re-run
it after any change to `skills/init/SKILL.md` or `scripts/bootstrap.mjs`; the
judges' `summary` fields name the next UX improvement worth making.

# repolore — authoring a flow page

> Single source for the flow workflow. Flows are the highest-risk wiki artifact
> (models are weakest at *edges and sequence*), so the citation rules are
> stricter than any other page. A flow is **structured data** (`flow-meta`) from
> which the Mermaid diagram and tables are *generated* — you never hand-author
> arrows. Read `<wikiRoot>/AGENTS.md` first; this file is the flow-specific layer.

## The core idea

A flow page makes the one claim no other page makes: *ordered runtime
behaviour*. To keep that claim honest:

- The `flow_*` frontmatter is the **model**; `wiki-flow-render.mjs` emits the
  diagram + tables from it into a delimited `FLOW-RENDER` region. Editing inside
  the region by hand is rejected (regenerate-and-diff). `flow_render:` picks the
  diagram **projection** of that one model — `flowchart` (default, good for
  branching tool/job flows) or `sequence` (actors become participants, edges
  become messages; good for multi-actor request flows). Verification is identical
  either way — the projection is a view, not a different model.
- Every claim is **anchored** to code by blob SHA (like any covered file), and a
  `verified` edge is anchored **directionally** — see below.
- The page's **tier is computed** by `wiki-flow-check.mjs` on every run, never
  written to the page (ADR-002). Stamp records freshness; the tier is live.

## The verification ladder (computed, never committed)

| Tier | What it proves | Mechanism |
|---|---|---|
| `structural` | meta well-formed; edges/branches reference declared steps; enums valid; the one `FLOW-RENDER` region equals `render(meta)` and no mermaid lives outside it | vendored stdlib |
| `anchored` | every step's `anchor_path` exists at its recorded `anchor_sha` and contains `anchor_match` | vendored stdlib (`git hash-object`) |
| `edge-cited` | every `verified` edge cites the **call site in the caller's own code** (`call_anchor_path` == the from-step's `anchor_path`), within ≤40 lines, and that span contains **both** `call_match` and `callee_token` — proving the from→to hop, not just that bytes exist. Branch citations verified the same way | vendored stdlib |
| `branch-audited` | single-exit steps whose code shows branch keywords but carry no branch entry → **warning** (heuristic; never fails) | vendored stdlib |
| `set-validated` | the step/edge/branch set equals what a user-space extractor rebuilds from code — the only real catch for **omitted branches** | **user-space** extractor (ADR-007); absence degrades, never fails |

`verified`-edge ratio under 50% **caps the tier at `structural`** — a wall of
`inferred` is honest but earns no edge-cited credit.

## verified vs inferred — the honest line

Mark an edge `verified` only when you can cite the call site directionally
(the caller's code names the callee). When the hop is real but uncitable that
way — dynamic dispatch, a re-export, pure statement sequence, cross-file
indirection — mark it `inferred`. `inferred` is an honest authorial claim
(like `> TODO-VERIFY:`), not a failure; it just doesn't raise the tier.
Two-anchor kinds (`async`/`queue`/`event`) need both a `call_anchor_*` (emit
site) and a `handler_*` (registration) — there is no single call site to cite.

## The authoring loop

1. **Extract first.** Read the actual code along the path. Where a closed-world
   tool exists (route table, callgraph), you may *offer* to run it — consent-gated,
   a proposal, never an unprompted `npx`/install/entrypoint run.
2. **Author `flow_*`**, not Mermaid: steps with anchors, edges with directional
   citations + per-edge evidence, branches including error paths. One named
   scenario per page; schematic over exhaustive (collapse pure sequence).
3. `node .repolore/scripts/wiki-flow-render.mjs <page>` — fills the region + writes the JSON sidecar.
4. `node .repolore/scripts/wiki-stamp.mjs <page>` — writes the blob SHAs (`covers` and every `*_sha`).
5. `node .repolore/scripts/wiki-flow-check.mjs <page>` — must reach at least `anchored`.
6. Add the page to the plan (`pages:` in `wiki.config.yml`) and `log.md`.

## Maintain diff-scoped

When a covered blob moves, the page goes stale (and `*_sha` mismatches give
"moved — re-verify") — but the checker's signal is per-file while the claim
structure is per-span. `wiki-flow-refresh.mjs` computes the per-citation
worklist by diffing the recorded blob against the working tree:

```
node .repolore/scripts/wiki-flow-refresh.mjs <page>            # plan
node .repolore/scripts/wiki-flow-refresh.mjs <page> --apply    # fix the safe classes
```

Citations whose cited bytes are provably unchanged (`untouched`) or merely
moved (`shifted`) are mechanically fixed on `--apply` — re-recording a SHA over
byte-identical content is bookkeeping, not blessing. `touched` / `gone` /
`unknown` citations are left at their old SHA on purpose: after an apply,
`wiki-flow-check.mjs` fails on exactly the citations that still need a human.
Re-verify those per edge/branch (fix the span, the claim, or demote to
`inferred`), then re-render and stamp. Never blind regeneration — and note the
honesty line: this proves *byte*-level safety only; a semantic change whose
diff dodges every cited span is the audit workflow's territory.

## set-validated — the user-space extractor contract (v0.4)

The vendored ladder tops out at `branch-audited`. To reach `set-validated`,
register an extractor in `wiki.config.yml`:

```yaml
validators:
  - flow: <page-filename-without-.md>
    cmd: "node .repolore/validators/<flow>-seteq.mjs"
    kind: set-equality
```

`wiki-flow-check.mjs` runs `cmd` from the repo root and parses stdout as JSON:

```json
{ "steps": ["id", ...], "edges": [{"from":"a","to":"b"}], "branches": [{"at":"x","to":"y","condition":"..."}] }
```

It set-compares against the flow-meta and reports anything **in code but not the
flow** (omissions) or **in the flow but not the code** (fabrication). Contract:
the extractor must reconcile each branch by `at`/`to`/`condition` (not mere
source-line membership), and apply guard-vs-fork significance filtering. Rules:

- **Absence or failure degrades** the tier to `branch-audited` — never fails the check (ADR-007).
- `flow_asserts_complete: true` turns an extractor-found omission into a **hard
  fail** — but *only when an extractor actually ran*. With no extractor it reads
  as an unbacked assertion and caps the tier.
- Set-equality is sound only in **closed worlds** (single-file/statically-enumerable
  tool & infra flows). Open-world request/async flows honestly top out at
  `branch-audited` for everyone — the omitted-branch problem (RESEARCH-FLOWS §6.1)
  is not generally solved.
- The extractor is **never vendored**: the bake-off proved every AST engine is
  unaffordable for the vendored layer (web-tree-sitter ~752KB WASM, a Rust binary
  ~800KB/platform vs the whole ~30KB readable-JS vendored surface).

**Worked reference example.** repolore dogfoods this on
`flows/update-classification` (a closed-world tool flow): the extractor
`.repolore/validators/update-classification-seteq.mjs` scans `update.mjs` for its
disposition set (every `report.<key>.push` call site), maps each to the flow step
it folds into, and emits the JSON above — so a *new* disposition added to the code
that nobody wrote into the flow surfaces as a hard fail. It is plain Node stdlib
because that flow's outcomes are statically enumerable; copy it as the starting
shape for your own closed-world flows, reaching for a real parser only when the
enumeration needs one. The page sets `flow_asserts_complete: true` and reaches
`set-validated` — the only flow that does.

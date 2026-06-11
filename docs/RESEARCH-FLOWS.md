---
title: "Flows in repolore: state of the art & recommended design"
date: 2026-06-11
status: research-complete
provenance: "flows-sota-research workflow: 4 web angles + 1 local case study → synthesis → adversarial review; this document is the synthesis as revised per the review's verdicts (fabricated/misattributed citations removed, ADR conflicts adjudicated, missing modalities added)"
---

# Flows in repolore — state of the art and a recommended design

> Companion to [RESEARCH.md](./RESEARCH.md) §4/§5e. Point-in-time; sequencing
> decisions live in the README roadmap.

## 1. The problem: why flows are the hardest wiki artifact

A flow page makes the one claim no other category makes: **ordered runtime
behavior** — "when X happens, the code traverses A, then B, then C." Other
categories assert facts that are structural (checkable by existence) or
explicitly human (decisions). A flow asserts *edges and sequence*, and the
evidence says edges are where models fail:

- On runtime reasoning (REval, [arXiv 2403.16437](https://arxiv.org/html/2403.16437)):
  across evaluated models, ~44% average accuracy on execution-path questions
  and very low inter-step consistency — models predict a path while
  contradicting themselves about program state. Accuracy degrades with
  nesting depth and trace length ([arXiv 2512.00215](https://arxiv.org/pdf/2512.00215)).
- A 24-model study found LLMs "struggle with completeness and soundness" on
  call-graph **edges**, losing to 2021-era static tools (PyCG, Jelly) while
  *beating* those tools at type inference
  ([arXiv 2410.00603](https://arxiv.org/abs/2410.00603)). The role split
  this implies: **deterministic tooling proposes edges; the LLM narrates
  them** — never the reverse.
- The failure is asymmetric: an invented step is potentially catchable by a
  citation check; an **omitted branch** is a false negative no anchor check
  sees — and self-review doesn't help (a 2026 study of 150 LLM-generated
  diagrams: "LLMs often fail to detect mistakes in their output",
  [arXiv 2601.20476](https://arxiv.org/abs/2601.20476)).
- No benchmark for code→flow-diagram generation was found in five research
  passes; the closest (MermaidSeqBench,
  [arXiv 2511.14967](https://arxiv.org/html/2511.14967v1)) is NL→diagram.
  Anyone building here operates ahead of the measurement literature.

For repolore this matters twice. Near-term, the orientation layer: a wrong
flow page is worse than no page (DeepWiki-derived "AI-slop bug reports"
wasting maintainer time are already documented —
[HN 45002092](https://news.ycombinator.com/item?id=45002092)). Long-term,
the **lore builder**: a generated website where the project reads as a
story, with flows as its most visually leveraged artifact. Both demand the
same thing: flows as **structured, machine-checkable data** a renderer can
trust — not prose with a diagram in it.

## 2. What the field does today

Two well-funded teams shipped the same architecture months apart and
harvested the same complaints — consistent with (n=2, self-selected
complaint threads; a hypothesis, not proof) an *architectural* failure of
freeform LLM diagrams over retrieved context:

- **DeepWiki** (Cognition, 2025): freeform Mermaid, no validation. "Too
  handwavy to be useful… not tied down enough to the actual implementation
  details"; "for projects I know well, the diagrams are not engineering
  quality" ([HN thread](https://news.ycombinator.com/item?id=45002092)).
  Concrete wrongness in the same thread: an LLVM pipeline diagram omitting
  major passes; "LibreOffice has never used Buck"; name-driven hallucination.
- **Google Code Wiki** (2025): Gemini-generated diagrams, full regeneration
  per change, no validation. Reception
  ([HN 46054338](https://news.ycombinator.com/item?id=46054338)): "even the
  front diagram is completely contentless."
- **CodeWiki** (ACL 2026, [arXiv 2510.24428](https://arxiv.org/abs/2510.24428)):
  academic SOTA — real Tree-sitter dependency graph feeding generation — and
  still no diagram validation; its benchmark scores rubric coverage, not
  factual accuracy.
- **mutable.ai** (dead): v1 shredded for hallucination
  ([HN 38915999](https://news.ycombinator.com/item?id=38915999)); the
  lasting community verdict: "documentation that is wrong and cannot be
  fixed is worthless."
- **GitDiagram** (popular OSS): diagrams from file tree + README only; a
  diagrammed repo's own author publicly found an invented edge and a missing
  one ([HN 42521769](https://news.ycombinator.com/item?id=42521769)).

Where soundness exists, it comes from **changing the evidence source**:
AppMap (recorded runtime traces → sequence diagrams,
[appmap.io](https://appmap.io/blog/2022/11/29/automagically-generate-sequence-diagrams-of-your-codes-runtime-behavior/))
and OpenTelemetry-derived service graphs — sound for what executed, blind to
what didn't, per-platform instrumentation required. Drift-checking exists
only against hand-maintained parallel models (Erode + LikeC4/Structurizr) or
text anchors (Swimm Auto-sync). Mermaid *syntax* validation is commoditized;
**no product found validates a drawn flow's semantics against code** as of
mid-2026. The 2025–26 AI-native wave (CodeBoarding, Archyl, Erode) converged
on existence checks as the industry ceiling. Validated flows is the empty
quadrant — and repolore's reference implementation already crossed that
ceiling once (RESEARCH.md §4).

Business footnote: deterministic-visualization-only products also died
(CodeSee, Sourcetrail) — soundness alone isn't a product; narrative without
soundness is slop. The lore-builder bet is that flows must be both.

## 3. The extraction toolbox and its honest limits

| Ecosystem | Best tool (mid-2026) | What it proves | Where it lies / goes blind |
|---|---|---|---|
| JS/TS imports | [dependency-cruiser](https://github.com/sverweij/dependency-cruiser) (native Mermaid reporter, zero-config) | Module import edges | Not a call graph; dynamic `require(var)`; no ordering |
| JS/TS calls | [Jelly](https://github.com/cs-au-dk/jelly) | Static call edges | Self-described "intentionally not fully sound" |
| Python | PyCG (archived) → JARVIS; pyan3 | Call edges ~99% precision / ~70% recall ([arXiv 2103.00587](https://arxiv.org/abs/2103.00587)) | Decorators, getattr, DI, task-queue boundaries |
| Go | `golang.org/x/tools/cmd/callgraph` (VTA) | "Sound modulo reflection/unsafe" | Requires compilation |
| Rust | `rust-analyzer scip` | Defs/refs, derived call edges | Trait objects, macros, async executor hops |
| Java | SootUp/WALA/Doop | Bytecode call graphs | Frameworks disagree on ground truth ([arXiv 2604.00885](https://arxiv.org/abs/2604.00885)); DI invisible |
| HTTP entrypoints | [OWASP Noir](https://github.com/owasp-noir/noir) (single binary, 50+ frameworks, JSON out) | Routes + source files behind them | Coverage cliff at in-house routers |
| Any, per-symbol | LSP `callHierarchy` | Compiler-grade caller/callee | Interactive; no durable artifact; uneven server support |
| Runtime | AppMap; OTel servicegraph (+eBPF) | The only sound *ordering*, incl. queue edges | Only exercised paths; not available at checkout time |

What **no static tool sees**, anywhere: dynamic dispatch resolution, DI
wiring, reflection, event buses, queue/async producer→consumer edges (a
runtime-only edge — the OTel servicegraph connector's span-pairing is its
only deterministic home), and *order of traversal*.

Three structural facts:

1. **The zero-config-universal-resolution graveyard is fresh.** GitHub
   archived stack-graphs (2025); Nuanced (YC, call-graphs-as-agent-context)
   archived its OSS and pivoted (2026). Don't build on the premise that
   universal precise extraction exists.
2. **Grounding, not parser sophistication, is the demonstrated lever.**
   DocAgent's entity-existence verification lifted factual truthfulness from
   61%→96% ([arXiv 2504.08725](https://arxiv.org/html/2504.08725v2)); a 2026
   hybrid-retrieval system reported zero fabricated citations across 1,080
   responses with citation checking in the loop
   ([arXiv 2512.12117](https://arxiv.org/html/2512.12117v1) — note: a full
   BM25+dense+graph retrieval stack, not a minimal pipeline; the
   transferable lesson is the *checkability*, not that regex suffices).
3. **One study suggests graphs aid grounding more than comprehension** — a
   66-language tree-sitter knowledge graph produced worse QA quality than
   plain file exploration ([arXiv 2603.27277](https://arxiv.org/abs/2603.27277));
   single study, one harness, but it matches the role split in §1.

## 4. What the reference implementation proved — and its ceiling

(Reference: RESEARCH.md §4 — noting honestly that this section validates one
internal source against research passes from the same effort.)

The production repo shipped machine-validated flow diagrams: `flow-meta`
manifests, per-kind extractors rebuilding ground truth (string-literal
`callActivity` names, the Express mount graph, C# `[Function]` attributes),
**set-equality** or **anchor-existence** contracts. Nothing found shipping
in June 2026 does this. The ceiling is explicit: the extractors are the
project-specific 20%, valid only under unchecked closed-world conventions;
the §5e precondition ("anchors must be mechanically extractable") excludes
dynamic codebases.

And the decided-vs-shipped gap in repolore today is total: a category row in
`templates/AGENTS.md`, the `flows` enum value, an empty directory bootstrap
creates — no flow template, no flow-meta schema, no `validators:` key, no
dispatch in `wiki-check.mjs`. The "honesty gradient" is used twice in
RESEARCH.md and defined nowhere; the Mermaid corpus rule exists only in
RESEARCH.md §5e, not in any shipped doc. The dogfood wiki has zero flow
pages — while the schema doc's hardest rule ("never narrate runtime
behaviour you have not read in the code") makes an unvalidated flow the most
noncompliant artifact possible. The advertised category is the one the rules
most discourage writing.

## 5. Recommended design

The organizing decision, forced jointly by the soundness evidence and the
lore-builder vision:

> **A flow is a structured data record (flow-meta) from which the Mermaid
> diagram and the step table are deterministically *generated* — never the
> other way around.**

This buys: Mermaid validity **by construction** (the emitter writes a
conservative, GitHub-safe subset — killing the validate-and-retry problem);
the LLM authors what it's good at (steps, narration, citations) and never
free-hands arrows; diagram↔meta drift becomes impossible; and the lore
builder receives a typed flow record per page to render however it likes
(interactive sequence, story panel, evidence badges), with Mermaid as merely
the v1 GitHub projection. It is Structurizr/LikeC4's "model first, views
derived" without the fatal hand-maintained parallel model: here the model is
per-flow, citation-anchored, checked against code.

### 5.1 flow-meta — line-parseable by design (adjudicating the ADR-003 collision)

The adversarial review caught the synthesis proposing nested YAML with
inline maps — a head-on violation of ADR-003 ("new config shapes must stay
line-parseable"). Adjudication: **flatten, don't supersede.** The schema
uses only the shapes the vendored parsers already handle (lists of maps,
one level, scalar values — `parseCovers` shape), with dotted/prefixed keys
instead of nesting:

```yaml
flow_schema: flow-meta/v1
flow_scenario: "Agent runs the update workflow on a vendored repo"
flow_trigger_kind: command        # http | command | cron | queue | event
flow_trigger_anchor: skills/update/SKILL.md
flow_steps:
  - id: read-manifest
    actor: update-skill
    action: "Read the manifest and compare file hashes"
    anchor_path: scripts/update.mjs
    anchor_match: "manifest.generatedFiles"
flow_edges:
  - from: read-manifest
    to: classify
    kind: call                    # call | async | queue | http | db | event
    evidence: verified            # verified | inferred — per edge, authorial
    cite_path: scripts/update.mjs
    cite_lines: "118-141"
    cite_match: "masterContent"
flow_branches:
  - at: classify
    condition: "current != recorded (locally modified)"
    to: skip-and-report
    kind: error                   # branch kinds include error propagation
```

Rules baked in from the evidence:

- **Edge kinds extend the OTel servicegraph taxonomy** and add `event`
  (in-process emitter→listener — the review's B2). Queue/async/event edges
  require **two anchors** (emit site + handler registration): no single call
  site exists to cite.
- **Per-edge `evidence: verified | inferred`** is an *authorial claim*
  (committed content, like `TODO-VERIFY`). Pretending dynamic dispatch
  resolves statically is the field's documented lie; labeling it is the
  differentiator.
- **The page's overall tier is COMPUTED at check time, never committed**
  (adjudicating the ADR-002 collision): wiki-check derives it from which
  checks pass *now*, demoting automatically when covered blobs move. Any
  rendered badge (index, future website) is a generated artifact with a
  drift check.
- **Anchors live in meta/table, never in the diagram** — GitHub strips
  Mermaid `click`/href ([discussion 46096](https://github.com/orgs/community/discussions/46096));
  arc42 §6 blesses the numbered step table as first-class. The anchored
  table is the truth; the diagram is its projection.
- **Branch semantics include `kind: error`** — error propagation is the
  branch class incident debugging needs most.
- Authoring discipline from C4-dynamic/arc42 §6: one named scenario per
  page; few, architecturally chosen scenarios (including error paths and
  startup); schematic over exhaustive.

A vendored stdlib script (`wiki-flow-render.mjs`) emits the step table +
```mermaid block from the meta (`%% generated from flow-meta — do not
hand-edit`), verified by regenerate-and-diff like `index.md`. Escape hatch:
`flow_diagram: manual` for flows the subset can't express — capped at the
anchored tier, ratio watched in dogfooding.

### 5.2 The verification ladder — two axes, finally written down

Tiers are **computed** per check run. Each tier states what it does NOT
guarantee; correctness-of-drawn and completeness are *orthogonal* (the
review's D1) and reported separately.

| Tier | Checks | Mechanism | Does NOT guarantee |
|---|---|---|---|
| structural | meta well-formed; edges reference declared steps; generated table/diagram match meta | vendored stdlib | anything about the code |
| anchored | every anchor resolves: file exists, match string occurs, blob SHA recorded | vendored stdlib (`git` + string search) — the DocAgent 61→96% class of check | that cited code *does* what the step says; completeness |
| edge-cited | every `verified` edge's cited span exists at the recorded blob and lexically contains the match | vendored stdlib | **existence-grade only** — satisfiable by an import line; this is the industry ceiling with better granularity, said plainly |
| branch-audited | cited spans with multiple branch keywords but one outgoing edge and no branch entry → warning | vendored stdlib heuristic | omitted branches generally (unsolved — §6.1) |
| set-validated | step-set equals what an extractor rebuilds from code | **user-space** extractor via `wiki.config.yml validators:`; vendored harness dispatches; absence degrades tier, never fails | anything outside the closed world; only exists where conventions are closed-world (routes, handlers, attributes, **infra manifests**) |

**Traced** (agent ran a test/entrypoint and cites output) is demoted from
the synthesis's ladder to an **authoring aid** (the review's C4): it is
agent-asserted, not offline-reproducible, covers one execution, and running
entrypoints needs consent. If recorded, it's an annotation with a command +
output hash, auto-invalidated when covered blobs move — never a tier above
set-validated.

Placement adjudication (pre-registered for the future ADR): **vendored
stdlib owns structural→branch-audited** (repo-generic, survives the tool —
ADR-006's trust model); **set-validated extractors live in user space** as
opt-in upgrades. Consent rule throughout (the review's C3): authoring-time
helpers (Noir, depcruise, `go callgraph`, maid) are proposals the agent may
*offer* to fetch/run — never `npx -y`, never unprompted installs or
entrypoint execution.

**First-class set-equality targets the synthesis missed (review B3): infra
and declarative flows.** CI pipelines, K8s/Terraform/serverless manifests,
gateway configs are closed-world and *more* checkable than code — and the
reference implementation's `[Function]` extractor was exactly this class.
The `flows/` category definition should widen from "request/job/sync" to
include tool and infra flows; notably, the two planned dogfood pages
(bootstrap vendoring, update classification) are this kind.

**Monorepos (review B1):** cross-*package* flows inside one checkout are
statically verifiable but break current scoping — anchors may point outside
the wiki's `scope:` globs. Rule: anchors are repo-relative and may point
anywhere in the repo (scope governs *coverage accounting*, not citation
validity); a flow page lives in the wiki of the package that owns its
trigger. Per-workspace extractor invocation is a v0.4 harness concern.

### 5.3 The authoring loop

**Flows are never seeded at init** — highest-risk artifact, and the citation
rules rightly make them expensive. A flow page is born when explicitly
invoked ("draft `flows/order-lifecycle` from the wiki plan") or *proposed*
by coverage inversion (an entrypoint cluster with no flow page → a plan
entry, drafted on demand). The procedure (a future `references/flow.md`):

1. **Extract first.** Inventory the entrypoint deterministically where
   tooling exists (offer to run Noir/depcruise/callgraph — consent-gated;
   proposals, never authority). The agent reads the actual code along the
   path — its comparative advantage is narration and case-by-case dynamic
   dispatch resolution (§1's role split).
2. **Author flow-meta, not Mermaid** — steps with anchors, edges with
   citations and per-edge evidence labels, branches including error paths.
3. **Render** (`wiki-flow-render.mjs`), **gate** (wiki-check tiers), stamp
   covers like any page.
4. **Maintain diff-scoped.** When a covered blob moves, refresh receives
   the diff + the flow page and answers "does any step/edge claim contradict
   this?" — per-edge granularity gives a precise re-verify worklist. Never
   blind regeneration (the Code Wiki anti-pattern that makes human
   correction impossible; correctability was the field's loudest demand
   after accuracy).

### 5.4 Mermaid validation in stdlib-node reality

Facts: the official `@mermaid-js/parser` still doesn't cover
flowchart/sequence/state/class (Jison/DOM-entangled); mermaid-cli drags in
puppeteer/Chromium (hundreds of MB); the best pure-Node linter
([probelabs/maid](https://github.com/probelabs/maid)) carries its own deps;
GitHub renders an undocumented, lagging Mermaid version anyway. The
generated-diagram design makes this mostly moot: **the emitter is the
validator** (conservative subset: flowchart + sequenceDiagram, plain nodes,
quoted labels, no beta types). For `manual` escape-hatch pages, the vendored
lint does subset-structural checks; maid is an optional, consent-gated,
plugin-side authoring gate. Don't vendor browser tooling; don't chase
grammar-constrained decoding (needs logit access hosted agents lack, and
fixes syntax — which isn't the failing dimension,
[arXiv 2407.06146](https://arxiv.org/pdf/2407.06146)).

### 5.5 Sequencing

- **v0.3.x (decoupled from the harness — cheap):** write the honesty
  gradient into `templates/AGENTS.md` (currently undefined anywhere); widen
  the `flows/` definition to include tool/infra flows; ship
  `_templates/flow.md` + flow-meta/v1 (flattened encoding above); vendored
  structural+anchored checks (anchor-existence is the planned
  dangling-reference lint applied to flow anchors); `wiki-flow-render.mjs`;
  **dogfood two flow pages** (bootstrap vendoring, update classification) —
  the empty `flows/` directory is a standing credibility problem.
- **v0.4:** the validator harness (`validators:` registration, kind
  dispatch, edge-cited + branch-audit, two example extractors — suggest a
  router mount-graph extractor and a Noir-backed route extractor), the
  diff-scoped re-verify step in refresh, the harness-placement ADR.
- **v0.5+ / lore builder:** `wiki-index.json` carries parsed flow records
  (Tier B, additive); the site renders flows from flow-meta directly —
  interactive sequence views, per-step source links (the links GitHub's
  sandbox forbids), computed evidence badges ("every arrow on this page is
  cited and checked") as the headline trust feature. This is the reason
  flow-meta must be data from day one.

## 6. Open questions / risks

1. **Omitted branches remain unsolved.** Anchor/citation checks catch
   fabrication and rot, not absence. Branch-audit heuristics + diff-scoped
   re-trace are mitigations; set-equality is the only real answer and only
   exists in closed worlds. The drift literature warns LLMs are worse at
   code-side drift (7–42pp, [arXiv 2604.03447](https://arxiv.org/pdf/2604.03447)).
2. **Evidence gaming.** Marking every edge `inferred` passes checks while
   shipping vagueness with honest labels. Needs a lint floor (warn under
   ~50% verified edges) and audit-skill attention. A small eval harness
   (hand-built ground truth for 3–5 flows in fixture repos, reusing
   `tests/make-fixtures.mjs`) would be ahead of the literature — *no
   benchmark found* is also an opportunity.
3. **Tier aggregation.** Page-level tier from per-edge evidence needs a
   defined rule (proposal: min over edges for the correctness axis, with
   completeness reported separately); unspecified aggregation is the
   inflation vector.
4. **Checked absence has no vocabulary.** "This flow has no error path" is
   the claim readers most need; only set-equality implies it, silently.
   Candidate: an explicit `flow_asserts_complete: true` flag that *requires*
   set-validation to pass.
5. **Expressiveness ceiling.** Parallel fan-out and alt/opt nesting strain a
   conservative emitter; watch the manual-escape-hatch ratio in dogfooding.
6. **Maintenance economics.** Flows cover hot files by nature; per-edge
   anchor granularity is the mitigation; needs field data.
7. **Multi-service flows.** Cross-repo queue/HTTP edges can be labeled (two
   anchors) but never statically verified; if OTel instrumentation exists,
   citing span names is a cheap honesty upgrade; consuming traces is out of
   scope for a repo-local tool.

**Bottom line.** The field's verdict is recent and unanimous: freeform LLM
diagrams fail architecturally; existence checks are the industry ceiling;
nothing shipping validates flow semantics. The reference implementation
crossed that ceiling once, bespoke. The generalization is an inversion —
flow-meta as the citation-anchored source of truth, diagrams as deterministic
projections, honesty computed per check run on a vendored ladder, extractors
as opt-in upgrades, all encoded line-parseable so the existing stdlib layer
can own it. The same structured record is, unchanged, the lore builder's
richest input.

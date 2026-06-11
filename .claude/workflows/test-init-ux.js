export const meta = {
  name: 'test-init-ux',
  description: 'Agentic end-to-end test of the /repolore:init experience on fixture repos',
  whenToUse: 'After changing skills/init/SKILL.md or scripts/bootstrap.mjs. Build fixtures first (node tests/make-fixtures.mjs <fresh-dir>) and pass {pluginRoot, fixtures: {s1, s2, s3}} as args.',
  phases: [
    { title: 'Run init', detail: 'one agent per scenario executes the skill non-interactively' },
    { title: 'Validate end state', detail: 'mechanical asserts via tests/validate-fixture.mjs' },
    { title: 'Judge the experience', detail: 'UX rubric over the agent-facing run report' },
  ],
}

const A = typeof args === 'string' ? JSON.parse(args) : args
if (!A || !A.pluginRoot || !A.fixtures) {
  throw new Error('args required: {pluginRoot, fixtures: {s1, s2, s3}} — build fixtures with tests/make-fixtures.mjs first')
}
const PLUGIN = A.pluginRoot

const RUNNER_SCHEMA = {
  type: 'object',
  required: ['phase7Report', 'gateShowedFileCount', 'usedBootstrapScript', 'commitMade', 'abortedEarly'],
  properties: {
    phase7Report: { type: 'string', description: 'The final user-facing report, VERBATIM as you would print it (for s3: your abort message)' },
    questionsTakenAsDefaults: { type: 'array', items: { type: 'string' }, description: 'Each question the skill had you ask, with the default you took' },
    gateShowedFileCount: { type: 'boolean', description: 'Did you surface the in-scope source file count at the scope/approval gate?' },
    inScopeCountShown: { type: 'integer', description: 'The count you showed, or -1 if none' },
    usedBootstrapScript: { type: 'boolean', description: 'Did you vendor via bootstrap.mjs (true) or hand-copy files (false)?' },
    commitMade: { type: 'boolean' },
    abortedEarly: { type: 'boolean', description: 'True if you stopped at preflight (already-initialized repo)' },
    frictionNotes: { type: 'string', description: 'Anything ambiguous, slow, or awkward you hit while following the skill — the UX bugs we are hunting' },
  },
}

const VALIDATE_SCHEMA = {
  type: 'object',
  required: ['exitCode', 'output'],
  properties: { exitCode: { type: 'integer' }, output: { type: 'string' } },
}

const JUDGE_SCHEMA = {
  type: 'object',
  required: ['rubric', 'overallPass', 'summary'],
  properties: {
    rubric: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'pass', 'evidence'],
        properties: { id: { type: 'string' }, pass: { type: 'boolean' }, evidence: { type: 'string' } },
      },
    },
    overallPass: { type: 'boolean' },
    summary: { type: 'string' },
  },
}

const COMMON_RUBRIC = `
- R1-gate-count: the in-scope source-file count was surfaced at the scope/approval gate (before anything was written), so over-broad scope could be caught early.
- R2-interface-first: the final report leads with what exists + the next action and the /repolore:check / /repolore:refresh slash commands BEFORE any raw "node .repolore/scripts/..." invocations (plumbing may follow, but not lead).
- R3-baseline-framing: coverage is framed as a baseline that grows ("N in-scope files, coverage grows as pages are drafted") — NOT a bare "0% covered" that reads as failure needing an excuse.
- R4-fully-done: the run ends fully done — commit made and reported (defaults include commit consent); the report does not park on "say the word and I'll commit"-style round-trips.
- R5-no-micro-drama: the report contains no narration of trivial mechanical fixes (trailing newlines, spacing) — those happen silently.
- R6-first-win: the seeded architecture/overview page is presented as a concrete first artifact (with citations), not just scaffolding.`

const scenarios = [
  {
    id: 's1',
    dir: A.fixtures.s1,
    brief: 'Typical side project. Root CLAUDE.md exists, has commit conventions (no Co-Authored-By), and is missing its trailing newline.',
    rubric: COMMON_RUBRIC,
  },
  {
    id: 's2',
    dir: A.fixtures.s2,
    brief: 'Same project but NO agent context file exists anywhere.',
    rubric: COMMON_RUBRIC + `
- R7-no-uninvited-files: the report notes that entry-point wiring was skipped because no context file exists (non-interactive run must not create one), and includes the ready-to-paste pointer block so the user can wire it themselves.`,
  },
  {
    id: 's3',
    dir: A.fixtures.s3,
    brief: 'Repo ALREADY initialized by repolore (manifest + wiki committed). Init must abort at preflight.',
    rubric: `
- R8-graceful-abort: the run stopped at preflight without writing or proposing anything, and the message is short, friendly, and points the user at /repolore:check and /repolore:refresh as the existing maintenance loop.`,
  },
]

const runStage = (s) =>
  agent(
    `You are Claude Code executing the /repolore:init skill, end to end, in the repository ${s.dir}.

Setup facts:
- CLAUDE_PLUGIN_ROOT is ${PLUGIN} — wherever the skill references \${CLAUDE_PLUGIN_ROOT}, use that path.
- The skill definition to execute is ${PLUGIN}/skills/init/SKILL.md. Read it first, then follow its phases in order, faithfully — do not improvise around it, do not skip gates.
- Scenario context: ${s.brief}

Hard rules:
- Every shell command runs with the fixture repo as cwd (${s.dir}). NEVER modify anything under ${PLUGIN}.
- This is a NON-INTERACTIVE run: the user invoked the skill with "take all defaults". Wherever the skill says to use AskUserQuestion, take the skill's stated recommended default instead of asking.
- For any temp file the skill suggests (e.g. the init config JSON), use a path unique to this run, e.g. /tmp/repolore-init-${s.id}.json — and keep temp files OUT of the fixture repo.
- Git commits (if the skill's defaults call for one) use the repo's local git config, already set.

When you are done, your structured output is the test artifact: report exactly what happened, including the final user-facing report VERBATIM (phase7Report). Honesty over polish — if you hit friction, ambiguity, or had to improvise, say so in frictionNotes; that is the data this test exists to collect.`,
    { label: `run:${s.id}`, phase: 'Run init', schema: RUNNER_SCHEMA },
  )

const validateStage = (runner, s) =>
  agent(
    `Run exactly this command and report the result:

  node ${PLUGIN}/tests/validate-fixture.mjs --scenario ${s.id} --fixture ${s.dir}

Return its exit code and full stdout+stderr verbatim in output. Do not fix anything, do not re-run with changes — observe and report.`,
    { label: `validate:${s.id}`, phase: 'Validate end state', schema: VALIDATE_SCHEMA, model: 'haiku' },
  ).then((validation) => ({ runner, validation }))

const judgeStage = ({ runner, validation }, s) =>
  agent(
    `You are grading the user experience of a CLI onboarding run (the /repolore:init skill) against a rubric. Be strict: a rubric item passes only on clear evidence in the material below.

Scenario: ${s.id} — ${s.brief}

Rubric:${s.rubric}

The run's structured self-report (gateShowedFileCount=${runner?.gateShowedFileCount}, inScopeCountShown=${runner?.inScopeCountShown}, usedBootstrapScript=${runner?.usedBootstrapScript}, commitMade=${runner?.commitMade}, abortedEarly=${runner?.abortedEarly}).

Questions taken as defaults:
${JSON.stringify(runner?.questionsTakenAsDefaults ?? [], null, 2)}

The final user-facing report, verbatim:
---
${runner?.phase7Report ?? '(missing)'}
---

Runner friction notes: ${runner?.frictionNotes || '(none)'}

Mechanical validation said (exit ${validation?.exitCode}):
${validation?.output ?? '(missing)'}

Grade every rubric item with concrete evidence (quote the report). overallPass = every rubric item passed AND mechanical validation exited 0. In summary, name the single biggest UX improvement still worth making, if any.`,
    { label: `judge:${s.id}`, phase: 'Judge the experience', schema: JUDGE_SCHEMA },
  ).then((judgment) => ({ scenario: s.id, runner, validation, judgment }))

log(`Testing /repolore:init UX across ${scenarios.length} scenarios (plugin: ${PLUGIN})`)

const results = (await pipeline(scenarios, runStage, validateStage, judgeStage)).filter(Boolean)

const ok = results.length === scenarios.length
  && results.every((r) => r.validation?.exitCode === 0 && r.judgment?.overallPass)

for (const r of results) {
  log(`${r.scenario}: validation exit ${r.validation?.exitCode}, judge ${r.judgment?.overallPass ? 'PASS' : 'FAIL'} — ${r.judgment?.summary}`)
}

return { ok, results }

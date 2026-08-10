export const meta = {
  name: 'gauntlet',
  description: 'Gauntlet loop: fan out one worker per piece, pair each with a blind critic that RUNS the check, loop until the bar is green or the round cap is hit',
  whenToUse: 'Push an already-on-brief build to a much higher quality bar, when the bar is a command that exits non-zero or a named reference artefact. Not for first drafts.',
  phases: [
    { title: 'Decompose' },
    { title: 'Gauntlet' },
    { title: 'Regression' },
  ],
}

// ---------------------------------------------------------------- args
// {
//   task:         string   what to improve (required)
//   projectPath:  string   absolute repo path (required)
//   pieces:       [{name, brief}]  optional — decomposed by an agent if absent
//   checkCommand: string   the falsifiable bar, e.g. "npm run check"
//   bar:          string   prose bar for what the command cannot measure
//   references:   [string] absolute paths / URLs the critic compares against
//   maxRounds:    number   per-piece worker↔critic attempts (default 3)
//   serial:       bool     pieces touch shared files — run one at a time
//   pieceCount:   number   how many pieces to decompose into (default 5)
//   roundCost:    number   output tokens to reserve per round (default 60000)
// }

const a = args || {}
if (!a.task || !a.projectPath) throw new Error('gauntlet: task and projectPath are required')

const MAX_ROUNDS = a.maxRounds ?? 3
// A round is a worker at high effort plus a critic at high effort. Starting one
// with less than this left in the turn budget means the agent() call throws
// mid-piece, which reads as a crash instead of a budget decision.
const ROUND_COST = a.roundCost ?? 60_000
const CHECK = a.checkCommand || null
const REFS = a.references || []
const BAR = [
  CHECK ? `Hard gate: \`${CHECK}\` must exit 0. Run it yourself; do not trust a report that it passed.` : null,
  a.bar || null,
  REFS.length ? `Compare against these references: ${REFS.join(', ')}` : null,
  CHECK ? 'Regression net: every check that is green today stays green.' : null,
].filter(Boolean).join('\n')

const PIECE_SCHEMA = {
  type: 'object',
  properties: {
    pieces: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'short identifier' },
          brief: { type: 'string', description: 'what this piece must achieve, concretely' },
          files: { type: 'array', items: { type: 'string' }, description: 'likely files to touch' },
        },
        required: ['name', 'brief'],
      },
    },
  },
  required: ['pieces'],
}

const WORK_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string', description: 'what you changed, one paragraph' },
    filesChanged: { type: 'array', items: { type: 'string' } },
  },
  required: ['summary', 'filesChanged'],
}

const VERDICT_SCHEMA = {
  type: 'object',
  properties: {
    pass: { type: 'boolean', description: 'true only if the bar is fully met' },
    checkExitedZero: { type: 'boolean', description: 'did you run the check command, and did it exit 0' },
    defects: {
      type: 'array',
      items: { type: 'string' },
      description: 'specific, actionable defects — never vague dissatisfaction',
    },
    evidence: { type: 'string', description: 'the output or measurement you based the verdict on' },
    diffStat: {
      type: 'string',
      description: 'the last line of `git diff --stat` for the working tree, verbatim (empty string if the tree is clean)',
    },
  },
  required: ['pass', 'defects'],
}

// ------------------------------------------------------------ decompose
phase('Decompose')

let pieces = a.pieces
if (!pieces || !pieces.length) {
  const plan = await agent(
    `Repo: ${a.projectPath}\n\n` +
    `GOAL\n${a.task}\n\n` +
    `BAR\n${BAR}\n\n` +
    `Read enough of the repo to decompose this goal into at most ${a.pieceCount ?? 5} of the ` +
    `SMALLEST INDEPENDENT pieces that can each be worked and verified on their own. ` +
    `Prefer pieces that touch disjoint files. Do not write any code — only plan. ` +
    `Each brief must state a concrete outcome, not a vibe.`,
    { label: 'decompose', phase: 'Decompose', schema: PIECE_SCHEMA },
  )
  pieces = plan?.pieces || []
}
if (!pieces.length) throw new Error('gauntlet: nothing to work on — decomposition returned no pieces')
log(`${pieces.length} pieces · bar: ${CHECK || 'prose only'} · max ${MAX_ROUNDS} rounds each`)

// -------------------------------------------------------------- gauntlet
phase('Gauntlet')

// One piece through the worker <-> blind-critic loop. The critic never sees the
// worker's self-report: it inspects the repo and runs the check itself.
async function runPiece(piece) {
  const where = piece.files?.length ? `\nLikely files: ${piece.files.join(', ')}` : ''
  let defects = []
  let lastVerdict = null
  let lastState = null

  for (let round = 1; round <= MAX_ROUNDS; round++) {
    // Budget is shared across the whole turn, so a piece that starts a round it
    // cannot finish takes the rest of the run down with it. Stopping here ends
    // the piece as unverified — which is what it is — instead of as a failure
    // the worker could have fixed.
    if (budget.total && budget.remaining() < ROUND_COST) {
      log(`⊘ ${piece.name} — out of budget before round ${round}`)
      return {
        piece: piece.name, passed: false, unverified: true, budgetExhausted: true,
        rounds: round - 1, verdict: lastVerdict,
      }
    }

    const fix = defects.length
      ? `\n\nA critic rejected the previous round. Fix exactly these defects:\n- ${defects.join('\n- ')}`
      : ''

    await agent(
      `Repo: ${a.projectPath}\n\n` +
      `GOAL\n${a.task}\n\n` +
      `YOUR PIECE — ${piece.name}\n${piece.brief}${where}\n\n` +
      `BAR\n${BAR}${fix}\n\n` +
      `Implement this piece in the repo. Stay inside your piece: do not refactor ` +
      `unrelated code and do not weaken any existing check to make it pass. ` +
      (CHECK ? `Run \`${CHECK}\` before you finish and leave it green. ` : '') +
      `Report what you changed.`,
      { label: `work:${piece.name}`, phase: 'Gauntlet', schema: WORK_SCHEMA, effort: 'high' },
    )

    const verdict = await agent(
      `Repo: ${a.projectPath}\n\n` +
      `You are a CRITIC. You did not write this code and you have not been told what was ` +
      `changed — find out yourself (\`git diff\`, read the files, run things).\n\n` +
      `PIECE UNDER REVIEW — ${piece.name}\n${piece.brief}\n\n` +
      `BAR\n${BAR}\n\n` +
      (CHECK
        ? `Run \`${CHECK}\` yourself and read its output. If it exits non-zero, this fails — no exceptions.\n`
        : '') +
      (REFS.length
        ? `Put the result next to the reference(s) and list concrete mismatches, not impressions.\n`
        : '') +
      `Default to pass:false when you are uncertain. Every defect must be specific enough ` +
      `for someone else to fix without asking you a question. Do not invent work beyond the bar: ` +
      `if the bar is met, pass.\n` +
      `Also report diffStat: the last line of \`git diff --stat\` verbatim. It decides whether ` +
      `the previous round changed anything at all, so do not paraphrase or estimate it.`,
      { label: `critic:${piece.name}`, phase: 'Gauntlet', schema: VERDICT_SCHEMA, effort: 'high' },
    )

    // A dead agent is NOT an approval. agent() returns null when the subagent
    // is skipped or dies on a terminal API error (rate limit, outage) — and a
    // critic that never answered has verified nothing. Counting that as a pass
    // reports work that was never done, so it ends the piece as UNVERIFIED.
    if (!verdict) {
      log(`⚠ ${piece.name} — round ${round}: critic did not return (skipped or API error)`)
      return { piece: piece.name, passed: false, unverified: true, rounds: round, verdict: lastVerdict }
    }
    lastVerdict = verdict
    if (verdict.pass) {
      log(`✓ ${piece.name} — passed at round ${round}`)
      return { piece: piece.name, passed: true, rounds: round, verdict }
    }
    defects = verdict.defects || []

    // A round that left the tree exactly as it was, against the same defects,
    // has told us the worker cannot move this piece — rerunning it just spends
    // another worker and critic to be told the same thing. Prime Agent's gate
    // policy calls this out explicitly: never rerun an unchanged failed gate.
    // Only trust it when the critic actually reported a fingerprint; a missing
    // diffStat is unknown, not "unchanged".
    const state = verdict.diffStat != null ? `${verdict.diffStat} ${defects.join('|')}` : null
    if (state !== null && state === lastState) {
      log(`⊘ ${piece.name} — round ${round} changed nothing (same diff, same defects), stopping`)
      return { piece: piece.name, passed: false, stalled: true, rounds: round, verdict }
    }
    lastState = state

    log(`✗ ${piece.name} — round ${round}: ${defects.length} defect(s)`)
  }

  log(`⊘ ${piece.name} — round cap (${MAX_ROUNDS}) reached, still red`)
  return { piece: piece.name, passed: false, rounds: MAX_ROUNDS, verdict: lastVerdict }
}

let results
if (a.serial) {
  // Pieces share files: concurrent edits would clobber each other.
  results = []
  for (const p of pieces) results.push(await runPiece(p))
} else {
  results = await parallel(pieces.map(p => () => runPiece(p)))
}
results = results.filter(Boolean)

// ------------------------------------------------------------ regression
phase('Regression')

let regression = null
if (CHECK) {
  regression = await agent(
    `Repo: ${a.projectPath}\n\n` +
    `Run \`${CHECK}\` once on the current tree and report the verdict verbatim. ` +
    `Then run \`git diff --stat\` and report it. Fix nothing — this is a read-only final gate.`,
    { label: 'regression', phase: 'Regression', schema: VERDICT_SCHEMA, effort: 'low' },
  )
  if (regression && !regression.pass) log(`REGRESSION RED: ${(regression.defects || []).join(' · ')}`)
}

// Three outcomes, never conflated: verified-green, verified-red, and never
// verified at all (agent died / was skipped / budget ran out). The last one is
// the dangerous one to report as success — it means the piece may not have been
// worked. Running out of rounds, budget, or time is a reason the loop stopped;
// it is never evidence that the bar was met.
const unverified = results.filter(r => r.unverified)
const failed = results.filter(r => !r.passed && !r.unverified)
const stalled = failed.filter(r => r.stalled)
const passed = results.filter(r => r.passed)

if (failed.length) log(`${failed.length}/${results.length} pieces ended red (${stalled.length} stopped early: nothing changed)`)
if (unverified.length) log(`${unverified.length}/${results.length} pieces NOT VERIFIED — rerun them: ${unverified.map(r => r.piece).join(', ')}`)

const outcome = unverified.length ? 'unverified'
  : (failed.length || (regression && !regression.pass)) ? 'red'
  : 'green'
log(outcome === 'green'
  ? `GREEN — ${passed.length}/${results.length} pieces verified against the bar`
  : `${outcome.toUpperCase()} — the bar is not met; do not report this run as done`)

return {
  outcome,
  task: a.task,
  bar: BAR,
  passed: passed.map(r => r.piece),
  failed: failed.map(r => ({
    piece: r.piece,
    stalled: !!r.stalled,
    defects: r.verdict?.defects || [],
  })),
  unverified: unverified.map(r => ({ piece: r.piece, reason: r.budgetExhausted ? 'budget' : 'critic-missing' })),
  rounds: Object.fromEntries(results.map(r => [r.piece, r.rounds])),
  regression: regression ? { pass: regression.pass, evidence: regression.evidence } : null,
}

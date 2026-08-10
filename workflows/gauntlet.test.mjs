// Test harness for gauntlet.js (the workflow next to this file).
// The Workflow tool runs a script body with agent()/parallel()/phase()/log()/args/budget
// injected and a top-level `return`, so the script is not an importable ESM module.
// We reproduce that shape: strip `export` from meta and wrap the body in an AsyncFunction.
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

// Il workflow accanto a questo file, non un path assoluto: così la stessa copia
// gira sia da ~/.claude/workflows/ sia da un checkout del repo.
const SRC = readFileSync(new URL('./gauntlet.js', import.meta.url), 'utf8')
  .replace('export const meta', 'const meta')

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor

async function run({ args, critics, budgetTotal = null, spend = 0, regression = null }) {
  const calls = []
  let spent = 0

  const agent = async (_prompt, opts = {}) => {
    const label = opts.label || ''
    calls.push(label)
    spent += spend
    if (label.startsWith('decompose')) return { pieces: args.pieces }
    if (label.startsWith('work:')) return { summary: 'done', filesChanged: ['a.ts'] }
    if (label.startsWith('regression')) return regression ?? { pass: true, defects: [], evidence: 'exit 0' }
    if (label.startsWith('critic:')) {
      const piece = label.slice('critic:'.length)
      const seq = critics[piece]
      const n = calls.filter(c => c === label).length - 1
      return typeof seq === 'function' ? seq(n) : (seq[Math.min(n, seq.length - 1)])
    }
    throw new Error(`unexpected agent label: ${label}`)
  }

  const parallel = async thunks => {
    const out = []
    for (const t of thunks) { try { out.push(await t()) } catch { out.push(null) } }
    return out
  }
  const budget = {
    total: budgetTotal,
    spent: () => spent,
    remaining: () => (budgetTotal == null ? Infinity : Math.max(0, budgetTotal - spent)),
  }
  const logs = []
  const fn = new AsyncFunction('args', 'agent', 'parallel', 'pipeline', 'phase', 'log', 'budget', SRC)
  const result = await fn(args, agent, parallel, parallel, () => {}, m => logs.push(m), budget)
  return { result, calls, logs }
}

const base = {
  task: 'improve', projectPath: '/repo', checkCommand: 'npm run check',
  pieces: [{ name: 'p1', brief: 'do p1' }], serial: true,
}
const fail = (diffStat, defects = ['d1']) => ({ pass: false, defects, diffStat, evidence: 'exit 1' })
let n = 0
const ok = (name, cond, extra = '') => {
  n++
  assert.ok(cond, `T${n} ${name} FAILED ${extra}`)
  console.log(`  ok  T${n} ${name}`)
}

// T1 — critic passes immediately
{
  const { result, calls } = await run({
    args: base, critics: { p1: [{ pass: true, defects: [], diffStat: '1 file changed' }] },
  })
  ok('pass al primo round → outcome green', result.outcome === 'green' && result.passed.length === 1, JSON.stringify(result))
  ok('un solo critic invocato', calls.filter(c => c === 'critic:p1').length === 1)
}

// T2 — always red but the tree keeps changing: must burn the full cap, then report red
{
  const { result, calls } = await run({
    args: base, critics: { p1: i => fail(`${i + 1} files changed`) },
  })
  ok('cap raggiunto → outcome red, non green', result.outcome === 'red' && result.passed.length === 0)
  ok('ha usato tutti e 3 i tentativi', calls.filter(c => c === 'critic:p1').length === 3, JSON.stringify(calls))
  ok('non marcato stalled', result.failed[0].stalled === false)
}

// T3 — the core fix: identical diff + identical defects must stop the loop early
{
  const { result, calls } = await run({
    args: base, critics: { p1: () => fail('2 files changed, 3 insertions(+)') },
  })
  ok('stallo rilevato → stalled true', result.failed[0]?.stalled === true, JSON.stringify(result.failed))
  ok('si ferma al 2° tentativo invece di 3', calls.filter(c => c === 'critic:p1').length === 2, JSON.stringify(calls))
  ok('stallo non è successo', result.outcome === 'red')
}

// T3b — a critic that omits diffStat must NOT be treated as "unchanged"
{
  const { calls } = await run({
    args: base, critics: { p1: () => ({ pass: false, defects: ['d1'], evidence: 'exit 1' }) },
  })
  ok('diffStat assente → nessuno stallo dedotto, cap pieno', calls.filter(c => c === 'critic:p1').length === 3, JSON.stringify(calls))
}

// T4 — dead critic is not an approval
{
  const { result } = await run({ args: base, critics: { p1: () => null } })
  ok('critic morto → unverified, mai green', result.outcome === 'unverified' && result.unverified[0].reason === 'critic-missing', JSON.stringify(result))
}

// T5 — budget exhaustion stops before the round and reports unverified
{
  const { result, calls } = await run({
    args: base, critics: { p1: i => fail(`${i + 1} files changed`) },
    budgetTotal: 100_000, spend: 25_000,
  })
  ok('budget finito → unverified con reason budget', result.outcome === 'unverified' && result.unverified[0].reason === 'budget', JSON.stringify(result))
  ok('non ha esaurito i 3 tentativi', calls.filter(c => c === 'critic:p1').length < 3, JSON.stringify(calls))
}

// T6 — regression red flips a run whose pieces all passed
{
  const green = [{ pass: true, defects: [], diffStat: '1 file changed' }]
  const { result } = await run({
    args: base, critics: { p1: green },
    regression: { pass: false, defects: ['check exits 1 on the full tree'], evidence: 'exit 1' },
  })
  ok('pezzi verdi ma regression rossa → outcome red', result.outcome === 'red', JSON.stringify(result))
  ok('i pezzi restano riportati come passati', result.passed.length === 1 && result.failed.length === 0)
}

console.log(`\n${n} assert, tutti verdi`)

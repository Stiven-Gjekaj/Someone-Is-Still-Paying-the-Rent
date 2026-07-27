/**
 * Section 4.5, checked against the real gates in `data/scenes.json`.
 *
 * The act 1 gate is the one this pass has to get right: ten objects sorted and
 * the phone found, in either order, and shut until both. The act 2 gate is a
 * real-time wait and is tested here too, because the arithmetic is easier to get
 * wrong than the code that will eventually call it.
 */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

import { createInitialState } from '../src/content/flags.ts'
import { evaluateGate, nextAct } from '../src/rules/gates.ts'
import type { Act, SceneData } from '../src/content/types.ts'

const scenes = JSON.parse(
  readFileSync(new URL('../data/scenes.json', import.meta.url), 'utf8'),
) as SceneData

const acts: Act[] = scenes.acts

function act(number: number): Act {
  const found = acts.find((a) => a.act === number)
  assert.ok(found !== undefined, `act ${number} is missing from data/scenes.json`)
  return found
}

describe('the act 1 gate', () => {
  const gate = act(1).gate_to_next

  it('exists and asks for both a count and the phone', () => {
    assert.ok(gate !== undefined)
    assert.equal(typeof gate.sorted_count_min, 'number')
    assert.ok(gate.requires_flags?.includes('phone_found'))
  })

  it('is shut on a fresh state', () => {
    assert.ok(gate !== undefined)
    const status = evaluateGate(gate, createInitialState())

    assert.equal(status.open, false)
    assert.equal(status.outstanding.length, 2, 'both the count and the phone should be outstanding')
  })

  it('stays shut with the sorting done but the phone not found', () => {
    assert.ok(gate !== undefined)
    const state = createInitialState()
    state.sorted_count = gate.sorted_count_min ?? 10

    const status = evaluateGate(gate, state)
    assert.equal(status.open, false)
    assert.deepEqual(status.outstanding, [{ kind: 'flag', flag: 'phone_found' }])
  })

  it('stays shut with the phone found but nothing sorted', () => {
    assert.ok(gate !== undefined)
    const state = createInitialState()
    state.phone_found = true

    const status = evaluateGate(gate, state)
    assert.equal(status.open, false)
    assert.deepEqual(status.outstanding, [
      { kind: 'sorted_count', need: gate.sorted_count_min ?? 10, have: 0 },
    ])
  })

  it('stays shut one short of the count', () => {
    assert.ok(gate !== undefined)
    const need = gate.sorted_count_min ?? 10
    const state = createInitialState()
    state.phone_found = true
    state.sorted_count = need - 1

    assert.equal(evaluateGate(gate, state).open, false)
  })

  it('opens on both, in either order', () => {
    assert.ok(gate !== undefined)
    const need = gate.sorted_count_min ?? 10

    const sortedFirst = createInitialState()
    sortedFirst.sorted_count = need
    sortedFirst.phone_found = true
    assert.equal(evaluateGate(gate, sortedFirst).open, true)

    const phoneFirst = createInitialState()
    phoneFirst.phone_found = true
    phoneFirst.sorted_count = need
    assert.equal(evaluateGate(gate, phoneFirst).open, true)
  })

  it('does not close again once the count is past the threshold', () => {
    assert.ok(gate !== undefined)
    const state = createInitialState()
    state.phone_found = true
    state.sorted_count = (gate.sorted_count_min ?? 10) + 12

    assert.equal(evaluateGate(gate, state).open, true)
  })
})

describe('the act 2 gate', () => {
  const gate = act(2).gate_to_next

  it('waits for the phone to have been put on charge at all', () => {
    assert.ok(gate !== undefined)
    const state = createInitialState()
    state.act = 2
    state.charger_found = true
    state.phone_on = true

    const status = evaluateGate(gate, state, 60_000)
    assert.equal(status.open, false)
    assert.ok(status.outstanding.some((reason) => reason.kind === 'not_started'))
  })

  it('counts the wait in real seconds', () => {
    assert.ok(gate !== undefined)
    const charge = gate.charge_seconds ?? 240

    const state = createInitialState()
    state.act = 2
    state.charger_found = true
    state.phone_on = true
    state.phone_charging_started_at = 0

    const halfway = evaluateGate(gate, state, (charge / 2) * 1000)
    assert.equal(halfway.open, false)
    assert.ok(
      halfway.outstanding.some(
        (reason) => reason.kind === 'charging' && Math.round(reason.secondsRemaining) === charge / 2,
      ),
    )

    assert.equal(evaluateGate(gate, state, charge * 1000).open, true)
  })
})

describe('an unresolvable condition holds the gate shut', () => {
  it('does not open on a flag that names nothing', () => {
    const state = createInitialState()
    state.sorted_count = 999

    const status = evaluateGate({ description: 'broken', requires_flags: ['nonsense'] }, state)

    assert.equal(status.open, false)
    assert.deepEqual(status.outstanding, [{ kind: 'unresolvable', flag: 'nonsense' }])
  })
})

describe('nextAct', () => {
  it('is null while act 1 is unfinished', () => {
    assert.equal(nextAct(acts, createInitialState()), null)
  })

  it('is act 2 once act 1 is finished', () => {
    const gate = act(1).gate_to_next
    assert.ok(gate !== undefined)

    const state = createInitialState()
    state.sorted_count = gate.sorted_count_min ?? 10
    state.phone_found = true

    assert.equal(nextAct(acts, state), 2)
  })

  it('is null past the last act, because there is no act 4', () => {
    const state = createInitialState()
    state.act = 3
    assert.equal(nextAct(acts, state), null)
  })
})

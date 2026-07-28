/**
 * Section 8.4, checked against the real content.
 *
 * This is the only condition in the game with nothing after it. If a gate
 * misfires the player is stuck in an act and something is obviously wrong; if
 * this misfires the player finishes everything the flat has and then keeps
 * standing in it, and that reads as a game that forgot to end rather than as a
 * bug. So the failure it guards is worth the file.
 *
 * The other half of what is checked here is that it fires once. The ending is
 * not somewhere the player can walk back out of and into again.
 */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

import { createInitialState } from '../src/content/flags.ts'
import { createEnding } from '../src/game/ending.ts'
import { evaluateGate } from '../src/rules/gates.ts'
import type { Act, ActNumber, SceneData } from '../src/content/types.ts'

const sceneData = JSON.parse(
  readFileSync(new URL('../data/scenes.json', import.meta.url), 'utf8'),
) as SceneData

const acts = sceneData.acts

function actNumber(n: ActNumber): Act {
  const found = acts.find((act) => act.act === n)
  if (found === undefined) throw new Error(`act ${n} is missing from data/scenes.json`)
  return found
}

/** Act 3 with nothing done in it yet. */
function inActThree() {
  const state = createInitialState()
  state.act = 3
  return state
}

/** Counts the firings rather than just noticing one. */
function watching(state = inActThree()) {
  let ends = 0
  const ending = createEnding({ acts, state, onEnd: () => (ends += 1) })
  return { state, ending, ends: () => ends }
}

describe('what the data says ends the game', () => {
  it('lives on act 3, which is the act with no act after it', () => {
    assert.notEqual(actNumber(3).ends_when, undefined)
  })

  it('is not on an act the player can leave', () => {
    assert.equal(actNumber(1).ends_when, undefined)
    assert.equal(actNumber(2).ends_when, undefined)
  })

  it('does not gate past itself, because there is no act 4', () => {
    assert.equal(actNumber(3).gate_to_next, undefined)
  })

  it('asks for the desk and the bag, which are the two ends of the act 3 chain', () => {
    const condition = actNumber(3).ends_when
    assert.notEqual(condition, undefined)
    assert.deepEqual(condition?.requires_flags, ['desk_done', 'receipts_found'])
  })

  it('does not end on a clock, because that would be the game deciding', () => {
    assert.equal(actNumber(3).ends_when?.charge_seconds, undefined)
    assert.equal(actNumber(3).ends_when?.sorted_count_min, undefined)
  })

  it('is evaluated by the same function every gate is', () => {
    const condition = actNumber(3).ends_when
    assert.notEqual(condition, undefined)
    if (condition === undefined) return

    const state = inActThree()
    assert.equal(evaluateGate(condition, state).open, false)

    state.desk_done = true
    state.receipts_found = true
    assert.equal(evaluateGate(condition, state).open, true)
  })
})

describe('the watcher', () => {
  it('does not end a night that has only just started', () => {
    const { ending, ends } = watching(createInitialState())

    ending.check()
    assert.equal(ends(), 0)
    assert.equal(ending.hasEnded(), false)
  })

  it('does not end act 3 with the desk done and the bag unopened', () => {
    const { state, ending, ends } = watching()
    state.desk_done = true

    ending.check()
    assert.equal(ends(), 0)
  })

  it('does not end it with the bag opened and the desk left alone', () => {
    const { state, ending, ends } = watching()
    state.receipts_found = true

    ending.check()
    assert.equal(ends(), 0)
  })

  it('ends it whichever of the two comes last', () => {
    for (const order of [
      ['desk_done', 'receipts_found'],
      ['receipts_found', 'desk_done'],
    ] as const) {
      const { state, ending, ends } = watching()

      state[order[0]] = true
      ending.check()
      assert.equal(ends(), 0, `${order[0]} alone ended the game`)

      state[order[1]] = true
      ending.check()
      assert.equal(ends(), 1, `${order.join(' then ')} did not end the game`)
    }
  })

  it('ends once, however many frames go by afterwards', () => {
    const { state, ending, ends } = watching()
    state.desk_done = true
    state.receipts_found = true

    for (let frame = 0; frame < 60; frame += 1) ending.check()

    assert.equal(ends(), 1)
    assert.equal(ending.hasEnded(), true)
  })

  it('ignores an act 3 condition while the player is still in act 2', () => {
    const { state, ending, ends } = watching()
    state.act = 2
    state.desk_done = true
    state.receipts_found = true

    ending.check()
    assert.equal(ends(), 0)
  })

  it('holds shut rather than open when the data names a flag that is gone', () => {
    const state = inActThree()
    state.desk_done = true
    state.receipts_found = true

    let ends = 0
    const broken: Act[] = acts.map((act) =>
      act.act === 3
        ? { ...act, ends_when: { description: 'x', requires_flags: ['no_such_flag'] } }
        : act,
    )

    createEnding({ acts: broken, state, onEnd: () => (ends += 1) }).check()
    assert.equal(ends, 0)
  })
})

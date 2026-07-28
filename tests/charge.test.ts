/**
 * Section 4.5 and 8.2. The four minutes, and the bound that keeps this build in
 * act 2.
 *
 * The wait is the only thing in the game that happens without the player doing
 * anything, which makes it the only thing that can silently never happen. These
 * run against the real `data/scenes.json`, so a threshold edited to something
 * unreachable fails here rather than in a four-minute playtest.
 */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

import { createInitialState } from '../src/content/flags.ts'
import { createActs } from '../src/game/acts.ts'
import { createCharge } from '../src/game/charge.ts'
import type { SceneData } from '../src/content/types.ts'

const scenes = JSON.parse(
  readFileSync(new URL('../data/scenes.json', import.meta.url), 'utf8'),
) as SceneData

const acts = scenes.acts

const CHARGE_SECONDS = acts.find((a) => a.act === 2)?.gate_to_next?.charge_seconds ?? 0

/** A state that has done everything act 2 asks for except waiting. */
function plugged(at = 1_000_000) {
  const state = createInitialState()
  state.act = 2
  state.sorted_count = 12
  state.phone_found = true
  state.charger_found = true
  state.phone_charging_started_at = at
  return state
}

describe('the wait itself', () => {
  it('is the four real minutes section 8.2 asks for', () => {
    assert.equal(CHARGE_SECONDS, 240)
  })

  it('reports nothing while nothing is charging', () => {
    const state = createInitialState()
    state.act = 2

    const charge = createCharge({ acts, state, onDone: () => {} })
    assert.equal(charge.remaining(1_000_000), null)
  })

  it('counts down from the full wait', () => {
    const state = plugged()
    const charge = createCharge({ acts, state, onDone: () => {} })

    assert.equal(charge.remaining(1_000_000), CHARGE_SECONDS)
    assert.equal(charge.remaining(1_060_000), CHARGE_SECONDS - 60)
  })

  it('does not ring early, at any point in the wait', () => {
    const state = plugged()
    let rang = 0
    const charge = createCharge({ acts, state, onDone: () => { rang += 1 } })

    for (let second = 0; second < CHARGE_SECONDS; second += 1) {
      charge.update(1_000_000 + second * 1000)
    }

    assert.equal(rang, 0)
  })

  it('rings once the wait is up, and only once', () => {
    const state = plugged()
    let rang = 0
    const charge = createCharge({ acts, state, onDone: () => { rang += 1 } })

    charge.update(1_000_000 + CHARGE_SECONDS * 1000)
    assert.equal(rang, 1)

    // The frame callback runs it sixty times a second afterwards.
    for (let i = 0; i < 100; i += 1) charge.update(1_000_000 + (CHARGE_SECONDS + i) * 1000)
    assert.equal(rang, 1)
  })

  it('does nothing in act 1, which has no charge gate', () => {
    const state = createInitialState()
    state.phone_charging_started_at = 1_000_000

    let rang = 0
    const charge = createCharge({ acts, state, onDone: () => { rang += 1 } })
    charge.update(9_000_000)

    assert.equal(rang, 0)
    assert.equal(charge.remaining(9_000_000), null)
  })
})

describe('the chime opens the act 2 gate', () => {
  it('leaves the gate shut until phone_on is set', () => {
    const state = plugged()
    const acted = createActs({ acts, state, onEnter: () => {} })

    assert.ok(acted.outstanding(1_000_000 + CHARGE_SECONDS * 1000).some((r) => r.kind === 'flag'))
  })

  it('opens the gate once the chime has rung', () => {
    const state = plugged()
    state.phone_on = true

    const acted = createActs({ acts, state, onEnter: () => {} })
    assert.deepEqual(acted.outstanding(1_000_000 + CHARGE_SECONDS * 1000), [])
  })
})

describe('the act 2 bound', () => {
  it('holds the night at act 2 even with the gate wide open', () => {
    const state = plugged()
    state.phone_on = true

    const entered: number[] = []
    const acted = createActs({
      acts,
      state,
      stop_after: 2,
      onEnter: (act) => { entered.push(act) },
    })

    acted.check(1_000_000 + CHARGE_SECONDS * 1000)

    assert.equal(state.act, 2)
    assert.deepEqual(entered, [])
  })

  it('steps to act 3 the moment the bound is lifted', () => {
    // The one line v0.4 deletes. If this fails, act 3 is unreachable for a reason
    // other than the bound.
    const state = plugged()
    state.phone_on = true

    const entered: number[] = []
    const acted = createActs({ acts, state, onEnter: (act) => { entered.push(act) } })
    acted.check(1_000_000 + CHARGE_SECONDS * 1000)

    assert.equal(state.act, 3)
    assert.deepEqual(entered, [3])
  })

  it('still lets act 1 turn over, which is inside the bound', () => {
    const state = createInitialState()
    state.sorted_count = 12
    state.phone_found = true

    const acted = createActs({ acts, state, stop_after: 2, onEnter: () => {} })
    acted.check(1_000_000)

    assert.equal(state.act, 2)
  })
})

/**
 * Section 4.5, checked against the real content.
 *
 * Every act gate in this game is a flag, and every one of those flags is set by
 * looking at something. If one of these stops firing the act it belongs to
 * becomes unfinishable, and nothing else in the pipeline would notice: the game
 * would simply never move on, and it would look like the player had missed
 * something.
 */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

import { createInitialState } from '../src/content/flags.ts'
import { applyFlagEffects, examineEffects } from '../src/rules/effects.ts'
import { resolveExamine } from '../src/rules/secondlook.ts'
import type { GameObject } from '../src/content/types.ts'

const objects = JSON.parse(
  readFileSync(new URL('../data/objects.json', import.meta.url), 'utf8'),
) as GameObject[]

const byId = new Map(objects.map((object) => [object.id, object]))

function object(id: string): GameObject {
  const found = byId.get(id)
  assert.ok(found !== undefined, `${id} is missing from data/objects.json`)
  return found
}

/** Looks at an object the way the session does, and returns the state after. */
function look(id: string, state = createInitialState()) {
  const target = object(id)
  const reading = resolveExamine(target, state)
  const effects = examineEffects(target, state, reading.secondLook)

  for (const effect of effects) {
    if (effect.kind === 'start_charging') state.phone_charging_started_at = 1_000
  }
  applyFlagEffects(state, effects)

  return { state, effects, reading }
}

describe('the phone', () => {
  it('sets phone_found on the first look, which is the act 1 gate', () => {
    const { state } = look('phone_dead')
    assert.equal(state.phone_found, true)
  })

  it('does not start charging without the charger', () => {
    const { state } = look('phone_dead')
    assert.equal(state.phone_charging_started_at, null)
  })

  it('starts charging once the charger has been found', () => {
    const state = createInitialState()
    state.act = 2
    state.charger_found = true

    look('phone_dead', state)
    assert.equal(state.phone_charging_started_at, 1_000)
  })

  it('does not restart a charge that is already running', () => {
    const state = createInitialState()
    state.act = 2
    state.charger_found = true
    state.phone_charging_started_at = 500

    const { effects } = look('phone_dead', state)
    assert.ok(!effects.some((e) => e.kind === 'start_charging'))
    assert.equal(state.phone_charging_started_at, 500)
  })
})

describe('the junk drawer', () => {
  it('gives up nothing in act 1, because it is jammed shut', () => {
    const { state, reading } = look('junk_drawer')

    assert.equal(reading.secondLook, false)
    assert.equal(state.charger_found, false)
  })

  it('gives up the charger in act 2', () => {
    const state = createInitialState()
    state.act = 2

    const { reading } = look('junk_drawer', state)

    assert.equal(reading.secondLook, true)
    assert.equal(state.charger_found, true)
  })
})

describe('the under-bed box', () => {
  it('sets underbed_found, which is what lets the Mira thread out', () => {
    const state = createInitialState()
    state.act = 2

    look('underbed_box', state)
    assert.equal(state.underbed_found, true)
  })
})

describe('the documents that flags hang off', () => {
  it('sets referral_read, which the plant second look waits on', () => {
    const state = createInitialState()
    state.act = 2

    look('referral_letter', state)
    assert.equal(state.referral_read, true)
  })

  it('sets mira_read', () => {
    const state = createInitialState()
    state.act = 2

    look('mira_draft', state)
    assert.equal(state.mira_read, true)
  })
})

describe('the fridge towel', () => {
  it('muffles the fridge rather than setting a flag', () => {
    const { effects, state } = look('fridge_towel')

    assert.deepEqual(effects, [{ kind: 'muffle_fridge' }])
    assert.equal(state.record_playing, false)
  })
})

describe('everything else', () => {
  it('changes nothing when looked at', () => {
    const loud = new Set([
      'phone_dead',
      'junk_drawer',
      'underbed_box',
      'referral_letter',
      'mira_draft',
      'fridge_towel',
    ])

    for (const target of objects) {
      if (loud.has(target.id)) continue

      const state = createInitialState()
      state.act = 3
      const reading = resolveExamine(target, state)

      assert.deepEqual(
        examineEffects(target, state, reading.secondLook),
        [],
        `${target.id} writes state and is not in the table`,
      )
    }
  })
})

describe('every gate flag has something that sets it', () => {
  it('covers charger_found and phone_found, which act 1 and act 2 need', () => {
    // phone_on is set by the chime rather than by a look, so it is not here.
    const set = new Set<string>()

    for (const target of objects) {
      for (const showedSecondLook of [false, true]) {
        const state = createInitialState()
        state.act = 3
        state.charger_found = true

        for (const effect of examineEffects(target, state, showedSecondLook)) {
          if (effect.kind === 'flag') set.add(effect.flag)
        }
      }
    }

    for (const flag of ['phone_found', 'charger_found', 'underbed_found', 'referral_read', 'mira_read']) {
      assert.ok(set.has(flag), `nothing in the flat sets ${flag}`)
    }
  })
})

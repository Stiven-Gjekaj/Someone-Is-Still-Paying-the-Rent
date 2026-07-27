/**
 * Section 4.4, checked against the real content rather than fixtures.
 *
 * These read `data/objects.json` from disk the way the validator does, so a
 * second-look pair that stops resolving because its gate was edited fails here
 * rather than being noticed by somebody walking past the object.
 */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

import { createInitialState } from '../src/content/flags.ts'
import { markExamined, resolveExamine } from '../src/rules/secondlook.ts'
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

describe('resolveExamine', () => {
  it('gives the first reading to an object with no second look', () => {
    const bowl = object('key_bowl')
    const result = resolveExamine(bowl, createInitialState())

    assert.equal(result.secondLook, false)
    assert.equal(result.text, bowl.examine)
  })

  it('holds the boots back until the team photo has been seen', () => {
    const state = createInitialState()
    const boots = object('boots_muddy')

    assert.equal(resolveExamine(boots, state).secondLook, false)

    markExamined(state, 'team_photo', false)
    const after = resolveExamine(boots, state)

    assert.equal(after.secondLook, true)
    assert.equal(after.text, boots.second_look?.text)
  })

  it('holds the pots back until the plant has been looked at twice', () => {
    const state = createInitialState()
    const pots = object('empty_pots')

    // Examining Zlatan is not enough. The pots wait on his second look, which is
    // the one that mentions he was taking care of things.
    markExamined(state, 'zlatan_plant', false)
    assert.equal(resolveExamine(pots, state).secondLook, false)

    markExamined(state, 'zlatan_plant', true)
    assert.equal(resolveExamine(pots, state).secondLook, true)
  })

  it('opens the plant on a plain state flag', () => {
    const state = createInitialState()
    const plant = object('zlatan_plant')

    assert.equal(resolveExamine(plant, state).secondLook, false)
    state.referral_read = true
    assert.equal(resolveExamine(plant, state).secondLook, true)
  })

  it('falls back to the first reading when a gate stops resolving', () => {
    const broken: GameObject = {
      ...object('boots_muddy'),
      second_look: { requires_flag: 'nonsense', text: 'should never be shown' },
    }

    const result = resolveExamine(broken, createInitialState())
    assert.equal(result.secondLook, false)
    assert.equal(result.text, broken.examine)
  })

  it('leaves every second look shut on a fresh state', () => {
    const state = createInitialState()

    for (const candidate of objects) {
      if (candidate.second_look === undefined) continue
      assert.equal(
        resolveExamine(candidate, state).secondLook,
        false,
        `${candidate.id} shows hindsight before anything has happened`,
      )
    }
  })
})

describe('markExamined', () => {
  it('records the object and keeps a second look once it has been seen', () => {
    const state = createInitialState()

    markExamined(state, 'mug_blue', false)
    assert.deepEqual(state.objects['mug_blue'], {
      examined: true,
      second_look_seen: false,
      sorted_to: null,
    })

    markExamined(state, 'mug_blue', true)
    assert.equal(state.objects['mug_blue']?.second_look_seen, true)

    // Looking again without the gate must not take it back.
    markExamined(state, 'mug_blue', false)
    assert.equal(state.objects['mug_blue']?.second_look_seen, true)
  })
})

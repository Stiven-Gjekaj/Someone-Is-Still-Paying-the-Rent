/**
 * Section 12. What a checkpoint is allowed to bring back.
 *
 * `restoreState` is the whole of the risk, so it is the whole of these tests: a
 * save that half-restores is worse than no save at all, because it looks like it
 * worked. Everything that is not exactly right is dropped, and the sorted count
 * is recomputed rather than believed.
 *
 * localStorage is not involved here. The reader and writer around it are three
 * lines of try/catch each; this is the part with rules in it.
 */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

import { createInitialState } from '../src/content/flags.ts'
import { restoreState } from '../src/game/save.ts'
import type { GameObject } from '../src/content/types.ts'

const objects = JSON.parse(
  readFileSync(new URL('../data/objects.json', import.meta.url), 'utf8'),
) as GameObject[]

const known = new Set(objects.map((object) => object.id))

function saved(): Record<string, unknown> {
  const state = createInitialState()
  state.act = 2
  state.phone_found = true
  state.objects['boots_muddy'] = { examined: true, second_look_seen: true, sorted_to: 'lena' }
  state.objects['team_bib'] = { examined: true, second_look_seen: false, sorted_to: 'donate' }
  state.sorted_count = 2

  return JSON.parse(JSON.stringify(state)) as Record<string, unknown>
}

describe('restoreState', () => {
  it('brings back the act, the flags, and the destinations', () => {
    const state = restoreState(saved(), known)
    assert.ok(state !== null)

    assert.equal(state.act, 2)
    assert.equal(state.phone_found, true)
    assert.equal(state.objects['boots_muddy']?.sorted_to, 'lena')
    assert.equal(state.objects['boots_muddy']?.second_look_seen, true)
    assert.equal(state.sorted_count, 2)
  })

  it('refuses anything that is not a state', () => {
    for (const bad of [null, undefined, 7, 'act 2', [], {}]) {
      assert.equal(restoreState(bad, known), null)
    }
  })

  it('refuses an act that does not exist', () => {
    for (const act of [0, 4, 2.5, '2', null]) {
      assert.equal(restoreState({ ...saved(), act }, known), null)
    }
  })

  it('drops objects that are no longer in the flat', () => {
    const stored = saved()
    const objectsIn = stored['objects'] as Record<string, unknown>
    objectsIn['a_thing_that_was_cut'] = { examined: true, second_look_seen: false, sorted_to: 'lena' }

    const state = restoreState(stored, known)
    assert.ok(state !== null)

    assert.equal(state.objects['a_thing_that_was_cut'], undefined)
    // And the count does not include it, which is the reason it matters.
    assert.equal(state.sorted_count, 2)
  })

  it('recomputes the count rather than believing it', () => {
    const state = restoreState({ ...saved(), sorted_count: 400 }, known)
    assert.ok(state !== null)

    assert.equal(state.sorted_count, 2)
  })

  it('drops a destination that is not one of the three', () => {
    const stored = saved()
    const objectsIn = stored['objects'] as Record<string, unknown>
    objectsIn['boots_muddy'] = { examined: true, second_look_seen: false, sorted_to: 'the_bin' }

    const state = restoreState(stored, known)
    assert.ok(state !== null)

    assert.equal(state.objects['boots_muddy']?.sorted_to, null)
    assert.equal(state.sorted_count, 1)
  })

  it('does not let a stored flag turn on something that is not a flag', () => {
    const state = restoreState({ ...saved(), fly_mode: true }, known)
    assert.ok(state !== null)

    assert.equal((state as unknown as Record<string, unknown>)['fly_mode'], undefined)
  })

  it('keeps a false flag false rather than truthy', () => {
    const state = restoreState({ ...saved(), lights_on: 'yes' }, known)
    assert.ok(state !== null)

    assert.equal(state.lights_on, false)
  })

  it('ignores a charge timestamp that is not a number', () => {
    for (const bad of ['soon', Infinity, NaN, {}]) {
      const state = restoreState({ ...saved(), phone_charging_started_at: bad }, known)
      assert.ok(state !== null)
      assert.equal(state.phone_charging_started_at, null)
    }
  })

  it('survives an objects field that is not an object', () => {
    const state = restoreState({ ...saved(), objects: 'none' }, known)
    assert.ok(state !== null)

    assert.equal(state.sorted_count, 0)
  })

  it('brings back the one thing that was taken', () => {
    const state = restoreState({ ...saved(), taken: 'boots_muddy' }, known)
    assert.ok(state !== null)

    assert.equal(state.taken, 'boots_muddy')
  })

  it('starts with nothing taken, because the night has not asked yet', () => {
    const state = restoreState(saved(), known)
    assert.ok(state !== null)

    assert.equal(state.taken, null)
  })

  it('drops a taken object the flat no longer has', () => {
    for (const bad of ['gone_since', '', 7, null, {}]) {
      const state = restoreState({ ...saved(), taken: bad }, known)
      assert.ok(state !== null)
      assert.equal(state.taken, null)
    }
  })
})

/**
 * What is in the flat, and when. Checked against the real content.
 *
 * Two things are being defended. That act 1 contains exactly what act 1 is
 * supposed to contain, so a stray `act_min` cannot quietly put the Mira thread
 * on the floor at the start of the game. And that every hidden object becomes
 * reachable through some sequence a player can actually perform.
 */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

import { createInitialState } from '../src/content/flags.ts'
import { isRevealed, newlyRevealed } from '../src/rules/reveal.ts'
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

const MIRA_THREAD = ['hoodie_mira', 'photobooth_strip', 'mira_draft', 'dad_lighter']

describe('isRevealed', () => {
  it('holds an object back until its act', () => {
    const state = createInitialState()
    assert.equal(isRevealed(object('bass_case'), state), false)

    state.act = 2
    assert.equal(isRevealed(object('bass_case'), state), true)
  })

  it('keeps the Mira thread in the box even in act 2', () => {
    const state = createInitialState()
    state.act = 2

    for (const id of MIRA_THREAD) {
      assert.equal(isRevealed(object(id), state), false, `${id} should still be in the box`)
    }
  })

  it('lets the Mira thread out once the box is opened', () => {
    const state = createInitialState()
    state.act = 2
    state.underbed_found = true

    for (const id of MIRA_THREAD) {
      assert.equal(isRevealed(object(id), state), true, `${id} should be out of the box`)
    }
  })

  it('will not let the box out early, whatever the flag says', () => {
    // The flag is act 2's, and setting it in act 1 must not drag act 2 forward.
    const state = createInitialState()
    state.underbed_found = true

    for (const id of MIRA_THREAD) {
      assert.equal(isRevealed(object(id), state), false, `${id} appeared in act 1`)
    }
  })

  it('keeps the demo behind the record until the shelf gives it up', () => {
    const state = createInitialState()
    state.act = 2

    assert.equal(isRevealed(object('demo_cdr'), state), false)

    // Examining the shelf is not enough. Its second look is the reveal.
    state.objects['vinyl_shelf'] = { examined: true, second_look_seen: false, sorted_to: null }
    assert.equal(isRevealed(object('demo_cdr'), state), false)

    state.objects['vinyl_shelf'] = { examined: true, second_look_seen: true, sorted_to: null }
    assert.equal(isRevealed(object('demo_cdr'), state), true)
  })

  it('holds an object back when its condition stops resolving', () => {
    // The safe direction. An unfindable object is a bug somebody reports; one
    // that appears early spoils the beat it was hidden for.
    const broken: GameObject = { ...object('dad_lighter'), hidden_until: 'nonsense' }
    const state = createInitialState()
    state.act = 2

    assert.equal(isRevealed(broken, state), false)
  })
})

describe('the flat at the start of the game', () => {
  const state = createInitialState()
  const present = objects.filter((o) => isRevealed(o, state))

  it('contains every act 1 object and nothing else', () => {
    assert.equal(present.length, 35)
    for (const object of present) assert.equal(object.act_min, 1)
  })

  it('contains the phone, which is what the first act is for', () => {
    assert.ok(present.some((o) => o.id === 'phone_dead'))
  })

  it('contains nothing from the Mira thread', () => {
    for (const id of MIRA_THREAD) {
      assert.ok(!present.some((o) => o.id === id), `${id} is in act 1`)
    }
  })
})

describe('the flat in act 2', () => {
  const state = createInitialState()
  state.act = 2
  const present = objects.filter((o) => isRevealed(o, state))

  it('gains the ten objects that are simply there once the act turns over', () => {
    // Ten, not nine: the under-bed box itself is one of them. It is in the room
    // from the start of the act, and only its contents are inside it.
    assert.equal(present.length, 35 + 10)
  })

  it('still hides the four in the box and the one behind the record', () => {
    const hidden = objects.filter((o) => o.act_min === 2 && !isRevealed(o, state))
    assert.deepEqual(hidden.map((o) => o.id).sort(), [...MIRA_THREAD, 'demo_cdr'].sort())
  })
})

describe('newlyRevealed', () => {
  it('returns nothing when nothing is being held back', () => {
    assert.deepEqual(newlyRevealed(objects, createInitialState(), []), [])
  })

  it('returns only what has just become due', () => {
    const state = createInitialState()
    state.act = 2

    const held = objects.filter((o) => o.act_min === 2).map((o) => o.id)
    const due = newlyRevealed(objects, state, held)

    assert.equal(due.length, 10)
    assert.ok(due.includes('underbed_box'))
    for (const id of MIRA_THREAD) assert.ok(!due.includes(id))
  })

  it('does not return something that is not being held', () => {
    const state = createInitialState()
    state.act = 2
    state.underbed_found = true

    // Only the lighter is still held. The other three are already in the room.
    assert.deepEqual(newlyRevealed(objects, state, ['dad_lighter']), ['dad_lighter'])
  })
})

describe('every hidden object is reachable', () => {
  it('is hidden behind something that appears no later than it does', () => {
    for (const object of objects) {
      if (object.hidden_until === undefined) continue

      const colon = object.hidden_until.indexOf(':')
      if (colon === -1) continue

      const gate = byId.get(object.hidden_until.slice(colon + 1))
      assert.ok(gate !== undefined, `${object.id} is hidden behind a missing object`)
      assert.ok(
        gate.act_min <= object.act_min,
        `${object.id} is act ${object.act_min} but ${gate.id} is act ${gate.act_min}`,
      )
    }
  })
})

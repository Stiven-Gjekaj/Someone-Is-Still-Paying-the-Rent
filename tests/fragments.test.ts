/**
 * Section 4.3 and section 6, checked against the real content.
 *
 * The pacing rules are pure and can be asserted directly. What cannot be asserted
 * is whether a memory is any good, so what is checked here is the shape section 6
 * promises: three to six lines, one trigger object each, and a trigger that is
 * actually in the flat by the act the fragment belongs to.
 */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

import { dwellFor, lineSchedule, sequenceDuration } from '../src/rules/pacing.ts'
import type { Fragment, GameObject } from '../src/content/types.ts'

const fragments = JSON.parse(
  readFileSync(new URL('../data/fragments.json', import.meta.url), 'utf8'),
) as Fragment[]

const objects = JSON.parse(
  readFileSync(new URL('../data/objects.json', import.meta.url), 'utf8'),
) as GameObject[]

const byId = new Map(objects.map((object) => [object.id, object]))

describe('dwellFor', () => {
  it('holds a longer line for longer', () => {
    assert.ok(dwellFor('He is late.') < dwellFor('He is late, and he is jogging up the street.'))
  })

  it('never drops a line before it can be read', () => {
    // Three words is the shortest thing section 6 contains. Even that gets a beat.
    assert.ok(dwellFor('He is late.') >= 1000)
  })

  it('caps the longest line, so nothing stalls', () => {
    const forever = 'x'.repeat(4000)
    assert.ok(dwellFor(forever) <= 5000)
  })
})

describe('lineSchedule', () => {
  it('starts the first line immediately', () => {
    assert.equal(lineSchedule(['one', 'two'])[0], 0)
  })

  it('never shows two lines at the same moment', () => {
    for (const fragment of fragments) {
      const at = lineSchedule(fragment.lines)
      for (let i = 1; i < at.length; i += 1) {
        assert.ok(
          (at[i] ?? 0) > (at[i - 1] ?? 0),
          `${fragment.id} would show lines ${i - 1} and ${i} together`,
        )
      }
    }
  })

  it('adds up to the sequence duration', () => {
    for (const fragment of fragments) {
      const at = lineSchedule(fragment.lines)
      const last = at[at.length - 1] ?? 0
      const lastLine = fragment.lines[fragment.lines.length - 1] ?? ''

      assert.equal(sequenceDuration(fragment.lines), last + dwellFor(lastLine))
    }
  })

  it('gives an empty fragment nothing to do rather than throwing', () => {
    assert.deepEqual(lineSchedule([]), [])
    assert.equal(sequenceDuration([]), 0)
  })
})

describe('the twelve fragments', () => {
  it('has twelve of them', () => {
    assert.equal(fragments.length, 12)
  })

  it('gives every one three to six lines, per section 4.3', () => {
    for (const fragment of fragments) {
      assert.ok(
        fragment.lines.length >= 3 && fragment.lines.length <= 6,
        `${fragment.id} has ${fragment.lines.length} lines`,
      )
    }
  })

  it('hangs every one off an object that exists', () => {
    for (const fragment of fragments) {
      assert.ok(byId.has(fragment.trigger), `${fragment.id} triggers on missing ${fragment.trigger}`)
    }
  })

  it('never puts a memory in an act before its object is in the flat', () => {
    for (const fragment of fragments) {
      const trigger = byId.get(fragment.trigger)
      assert.ok(trigger !== undefined)
      assert.ok(
        fragment.act >= trigger.act_min,
        `${fragment.id} is act ${fragment.act} but ${trigger.id} only appears in act ${trigger.act_min}`,
      )
    }
  })

  it('reaches nine of them in act 1', () => {
    // Section 6. F-08 and F-10 need act 2 objects and F-12 needs act 3, so act 1
    // is nine. If this moves, the first act has quietly changed shape.
    const inActOne = fragments.filter((fragment) => {
      const trigger = byId.get(fragment.trigger)
      return fragment.act <= 1 && trigger !== undefined && trigger.act_min <= 1
    })

    assert.equal(inActOne.length, 9)
  })

  it('gives each object at most one memory', () => {
    const triggers = fragments.map((fragment) => fragment.trigger)
    assert.equal(new Set(triggers).size, triggers.length)
  })
})

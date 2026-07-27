/**
 * The flag namespace. Section 12 documents `requires_flag` as one string, and
 * this is the widening that lets that one string mean three different things.
 */

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  BOOLEAN_FLAGS,
  createInitialState,
  isSatisfied,
  parseFlagReference,
} from '../src/content/flags.ts'

describe('parseFlagReference', () => {
  it('reads a bare state flag', () => {
    const reference = parseFlagReference('referral_read')
    assert.deepEqual(reference, { kind: 'state', flag: 'referral_read' })
  })

  it('reads examined and secondlook forms', () => {
    assert.deepEqual(parseFlagReference('examined:team_photo'), {
      kind: 'derived',
      prefix: 'examined',
      object: 'team_photo',
    })
    assert.deepEqual(parseFlagReference('secondlook:zlatan_plant'), {
      kind: 'derived',
      prefix: 'secondlook',
      object: 'zlatan_plant',
    })
  })

  it('rejects anything else', () => {
    assert.equal(parseFlagReference('not_a_flag'), null)
    assert.equal(parseFlagReference('opened:junk_drawer'), null)
    assert.equal(parseFlagReference('examined:'), null)
    assert.equal(parseFlagReference(''), null)
  })

  it('accepts every boolean flag it declares', () => {
    for (const flag of BOOLEAN_FLAGS) {
      assert.deepEqual(parseFlagReference(flag), { kind: 'state', flag }, flag)
    }
  })

  it('does not treat a counter as a condition', () => {
    // act and sorted_count are numbers, so they cannot gate a second look.
    assert.equal(parseFlagReference('act'), null)
    assert.equal(parseFlagReference('sorted_count'), null)
  })
})

describe('isSatisfied', () => {
  it('follows a state flag', () => {
    const state = createInitialState()
    const reference = parseFlagReference('referral_read')
    assert.ok(reference !== null)

    assert.equal(isSatisfied(state, reference), false)
    state.referral_read = true
    assert.equal(isSatisfied(state, reference), true)
  })

  it('is false for an object never touched', () => {
    const state = createInitialState()
    const reference = parseFlagReference('examined:team_photo')
    assert.ok(reference !== null)
    assert.equal(isSatisfied(state, reference), false)
  })

  it('separates examining an object from seeing its second look', () => {
    const state = createInitialState()
    state.objects['zlatan_plant'] = { examined: true, second_look_seen: false, sorted_to: null }

    const examined = parseFlagReference('examined:zlatan_plant')
    const secondLook = parseFlagReference('secondlook:zlatan_plant')
    assert.ok(examined !== null && secondLook !== null)

    assert.equal(isSatisfied(state, examined), true)
    assert.equal(isSatisfied(state, secondLook), false)
  })
})

describe('createInitialState', () => {
  it('starts at act 1 with nothing found', () => {
    const state = createInitialState()
    assert.equal(state.act, 1)
    assert.equal(state.sorted_count, 0)
    assert.equal(state.phone_charging_started_at, null)
    assert.deepEqual(state.objects, {})

    for (const flag of BOOLEAN_FLAGS) {
      assert.equal(state[flag], false, flag)
    }
  })
})

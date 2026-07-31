/**
 * What the orientation key is allowed to say.
 *
 * The composition is easy and the constraint is the point. Section 8.2 forbids
 * an objective marker, and this is the feature in the game closest to being one:
 * it exists to tell a player who cannot see the room which way to walk.
 *
 * So the tests that matter here are the ones that would still pass if somebody
 * quietly widened it. The line names what is within reach and one thing the goal
 * has already named. A version that listed the room, or ranked by importance, or
 * pointed at something unrevealed would be a different feature wearing the same
 * name, and these are here to make that change loud.
 */

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  orientationLine,
  type Nearby,
  type OrientationInput,
  type OrientationWords,
} from '../src/rules/orientation.ts'

/** Deliberately not the shipped words: this tests composition, not copy. */
const WORDS: OrientationWords = {
  nothing_in_reach: 'NOTHING.',
  in_reach_lead: 'NEAR:',
  toward: '{name}, {bearing}, {metres} m.',
  one_metre: '{name}, {bearing}, close.',
  bearings: {
    ahead: 'AHEAD',
    ahead_left: 'AHEAD-LEFT',
    left: 'LEFT',
    behind_left: 'BEHIND-LEFT',
    behind: 'BEHIND',
    behind_right: 'BEHIND-RIGHT',
    right: 'RIGHT',
    ahead_right: 'AHEAD-RIGHT',
  },
}

const HERE = { x: 4, y: 1.66, z: 3 }

function near(id: string, name: string, x = HERE.x, z = HERE.z): Nearby {
  return { id, name, at: { x, y: HERE.y, z } }
}

function input(over: Partial<OrientationInput> = {}): OrientationInput {
  return {
    room: 'Living room',
    from: HERE,
    facing: 0,
    inReach: [],
    toward: null,
    ...over,
  }
}

describe('orientationLine', () => {
  it('opens with the room, which is the one fact Tab cannot give you', () => {
    assert.match(orientationLine(input(), WORDS), /^Living room\./)
  })

  it('says so plainly when there is nothing beside you', () => {
    assert.equal(orientationLine(input(), WORDS), 'Living room. NOTHING.')
  })

  it('lists what is within reach, in the order it was given', () => {
    // The order is Tab's, decided by `turnOrder` in reach.ts. Re-sorting here by
    // anything at all, importance most of all, is the objective marker section
    // 8.2 rules out.
    const line = orientationLine(input({
      inReach: [near('a', 'Zlatan'), near('b', 'Record player'), near('c', 'The desk')],
    }), WORDS)

    assert.equal(line, 'Living room. NEAR: Zlatan, Record player, The desk.')
  })

  it('points at the one thing it was handed, and nothing else', () => {
    const line = orientationLine(input({
      inReach: [near('a', 'Zlatan')],
      toward: near('boxes', 'The three boxes', 4, -1),
    }), WORDS)

    assert.match(line, /The three boxes, AHEAD, 4 m\./)
    // Nothing else in the flat gets a bearing, however many things exist.
    assert.equal(line.match(/ m\./g)?.length, 1)
  })

  it('says nothing about direction when there is nowhere to be sent', () => {
    // Two of the six goals are not about a place. A line that invented a bearing
    // rather than staying quiet would be the game pointing on its own initiative.
    const line = orientationLine(input({ inReach: [near('a', 'Zlatan')], toward: null }), WORDS)
    assert.equal(line, 'Living room. NEAR: Zlatan.')
  })

  it('does not name the same thing twice when it is already beside you', () => {
    // Within reach means Tab reaches it. Repeating it as a bearing is the same
    // fact twice, and the shorter line is the one that gets listened to.
    const boxes = near('boxes', 'The three boxes', 4.8, 3)
    const line = orientationLine(input({ inReach: [boxes], toward: boxes }), WORDS)

    assert.equal(line, 'Living room. NEAR: The three boxes.')
  })

  it('measures across the floor rather than through the air', () => {
    // A folder on a high shelf is not further away to somebody walking toward
    // it, and up is not a direction anybody can walk in.
    const high = { id: 'folder', name: 'Folder', at: { x: 4, y: 8, z: -1 } }
    const line = orientationLine(input({ toward: high }), WORDS)

    assert.match(line, /Folder, AHEAD, 4 m\./)
  })

  it('turns with the player rather than with the flat', () => {
    const boxes = near('boxes', 'The three boxes', 4, -1)
    const facing = (yaw: number): string => orientationLine(input({ toward: boxes, facing: yaw }), WORDS)

    assert.match(facing(0), /AHEAD/)
    assert.match(facing(Math.PI), /BEHIND/)
    assert.match(facing(Math.PI / 2), /RIGHT/)
  })
})

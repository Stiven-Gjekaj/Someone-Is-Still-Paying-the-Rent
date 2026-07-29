/**
 * Section 4.2 and 8.2. Stepping through what is near you, without being pointed.
 *
 * Two things are defended here. The first is that the ring is a ring: the same
 * place and the same facing always produce the same order, so Tab walks the room
 * predictably rather than shuffling.
 *
 * The second is the constraint that keeps this from being an objective marker.
 * It offers only what is within the raycast's reach, and it sorts by angle and
 * nothing else. A test that let it order by importance would pass just as
 * happily, so the ordering is pinned here deliberately.
 */

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  aimAt,
  distanceTo,
  turnFrom,
  turnOrder,
  type Point3,
  type Reachable,
} from '../src/interaction/reach.ts'

const HERE: Point3 = { x: 0, y: 1.62, z: 0 }
const REACH = 2.4

/** At eye level, so bearings are the only thing under test. */
function at(x: number, z: number, id = `${x}_${z}`): Reachable {
  return { id, at: { x, y: HERE.y, z } }
}

const degrees = (radians: number): number => Number(((radians * 180) / Math.PI).toFixed(3))

describe('aiming at a point', () => {
  it('looks down negative Z at a yaw of zero, the way the camera does', () => {
    assert.equal(degrees(aimAt(HERE, at(0, -1).at).yaw), 0)
  })

  it('turns left for something on the left, because yaw grows anticlockwise', () => {
    assert.equal(degrees(aimAt(HERE, at(-1, 0).at).yaw), 90)
  })

  it('turns right for something on the right', () => {
    assert.equal(degrees(aimAt(HERE, at(1, 0).at).yaw), -90)
  })

  it('turns all the way round for something behind', () => {
    assert.equal(Math.abs(degrees(aimAt(HERE, at(0, 1).at).yaw)), 180)
  })

  it('looks down at something on the floor and up at something on a shelf', () => {
    assert.ok(aimAt(HERE, { x: 0, y: 0.1, z: -1 }).pitch < 0)
    assert.ok(aimAt(HERE, { x: 0, y: 2.1, z: -1 }).pitch > 0)
  })

  it('is level with something at eye height', () => {
    assert.equal(aimAt(HERE, at(0, -1).at).pitch, 0)
  })
})

describe('how far round the next thing is', () => {
  it('never answers zero, because Tab means the next one', () => {
    assert.equal(turnFrom(0, 0, 'right'), Math.PI * 2)
    assert.equal(turnFrom(0, 0, 'left'), Math.PI * 2)
  })

  it('counts clockwise going right and anticlockwise going left', () => {
    // A quarter turn to the right of straight ahead.
    assert.equal(degrees(turnFrom(0, -Math.PI / 2, 'right')), 90)
    assert.equal(degrees(turnFrom(0, -Math.PI / 2, 'left')), 270)
  })

  it('wraps rather than going negative', () => {
    assert.ok(turnFrom(3, -3, 'right') > 0)
    assert.ok(turnFrom(-3, 3, 'left') > 0)
  })
})

describe('the ring', () => {
  const around = [
    at(0, -1, 'ahead'),
    at(-1, 0, 'left'),
    at(1, 0, 'right'),
    at(0, 1, 'behind'),
  ]

  it('walks clockwise from where the player is facing', () => {
    const order = turnOrder(HERE, 0, around, { reach: REACH, direction: 'right' })
    assert.deepEqual(order.map((item) => item.id), ['right', 'behind', 'left', 'ahead'])
  })

  it('walks the other way on the other key', () => {
    const order = turnOrder(HERE, 0, around, { reach: REACH, direction: 'left' })
    assert.deepEqual(order.map((item) => item.id), ['left', 'behind', 'right', 'ahead'])
  })

  it('starts from wherever the player has turned to', () => {
    // Facing left, so the next thing clockwise is what was straight ahead.
    const order = turnOrder(HERE, Math.PI / 2, around, { reach: REACH, direction: 'right' })
    assert.equal(order[0]?.id, 'ahead')
  })

  it('moves off what the player is already on', () => {
    const order = turnOrder(HERE, 0, around, { reach: REACH, direction: 'right', skip: 'right' })
    assert.ok(!order.some((item) => item.id === 'right'))
    assert.equal(order[0]?.id, 'behind')
  })

  it('gives the same answer twice from the same place', () => {
    const once = turnOrder(HERE, 0.7, around, { reach: REACH, direction: 'right' })
    const twice = turnOrder(HERE, 0.7, around, { reach: REACH, direction: 'right' })
    assert.deepEqual(once.map((i) => i.id), twice.map((i) => i.id))
  })

  it('breaks a tie the same way every time rather than by input order', () => {
    const same = [at(0, -1, 'zulu'), at(0, -1, 'alpha')]

    assert.deepEqual(
      turnOrder(HERE, Math.PI, same, { reach: REACH, direction: 'right' }).map((i) => i.id),
      ['alpha', 'zulu'],
    )
    assert.deepEqual(
      turnOrder(HERE, Math.PI, [...same].reverse(), { reach: REACH, direction: 'right' }).map((i) => i.id),
      ['alpha', 'zulu'],
    )
  })
})

// Section 8.2. This is the line between a convenience and an objective marker,
// and it is the reason the reach is passed in rather than chosen here.
describe('what it refuses to offer', () => {
  it('drops anything past the reach it is given', () => {
    const far = [at(0, -1, 'near'), at(0, -9, 'across the room')]
    const order = turnOrder(HERE, 0, far, { reach: REACH, direction: 'right' })

    assert.deepEqual(order.map((item) => item.id), ['near'])
  })

  it('measures reach in three dimensions, not along the floor', () => {
    // Well inside reach along the floor and well outside it once the height
    // counts, which is the whole point of measuring the hypotenuse.
    const overhead: Reachable = { id: 'top shelf', at: { x: 0, y: HERE.y + 2.5, z: -0.4 } }
    assert.ok(distanceTo(HERE, overhead.at) > REACH)
    assert.deepEqual(turnOrder(HERE, 0, [overhead], { reach: REACH, direction: 'right' }), [])
  })

  it('offers nothing at all from the middle of an empty room', () => {
    assert.deepEqual(turnOrder(HERE, 0, [], { reach: REACH, direction: 'right' }), [])
  })

  it('takes no notice of anything but where a thing is', () => {
    // The same two positions under two different sets of ids. If the order ever
    // depended on what the objects were rather than where they are, this breaks.
    const first = turnOrder(HERE, 0, [at(-1, 0, 'a'), at(1, 0, 'b')], {
      reach: REACH,
      direction: 'right',
    })
    const second = turnOrder(HERE, 0, [at(-1, 0, 'phone_dead'), at(1, 0, 'spare_towel')], {
      reach: REACH,
      direction: 'right',
    })

    assert.deepEqual(
      first.map((i) => (i.at.x < 0 ? 'left' : 'right')),
      second.map((i) => (i.at.x < 0 ? 'left' : 'right')),
    )
  })
})

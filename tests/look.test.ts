/**
 * Section 4.2, on the keyboard.
 *
 * Aiming is the only verb the game has, and until v0.5 it could only be done
 * with a mouse. What is checked here is the arithmetic behind the arrow keys:
 * the rate, the ramp that makes a tap finer than a sweep, and the clamp that
 * keeps the keyboard inside the same limits as the mouse.
 *
 * None of it can be measured by driving the real game. A headless browser on a
 * software rasteriser renders at a couple of frames a second, and the engine
 * clamps `delta` so a stalled tab cannot teleport anybody, so wall-clock time
 * and game time come apart by a factor of five out there. Here they do not.
 */

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  LOOK_FLOOR,
  LOOK_PITCH,
  LOOK_RAMP_SECONDS,
  LOOK_YAW,
  clampPitch,
  lookStep,
  rampAt,
} from '../src/player/look.ts'

const FRAME = 1 / 60

/**
 * Runs the arrows for a while at a steady frame rate and returns where it got to.
 *
 * Counts frames rather than accumulating elapsed time. `elapsed += 1 / 15`
 * lands on 0.9999999999999999 after fifteen steps and runs a sixteenth, which
 * is a seven per cent error and looks exactly like a real frame-rate bug.
 */
function hold(seconds: number, input: { turn?: number; tilt?: number; sensitivity?: number }) {
  let held = 0
  let yaw = 0
  let pitch = 0

  const frames = Math.round(seconds / FRAME)

  for (let frame = 0; frame < frames; frame += 1) {
    const step = lookStep({
      turn: input.turn ?? 0,
      tilt: input.tilt ?? 0,
      held,
      delta: FRAME,
      sensitivity: input.sensitivity ?? 1,
    })

    held = step.held
    yaw += step.yaw
    pitch += step.pitch
  }

  return { yaw, pitch, held }
}

describe('which way the arrows turn', () => {
  it('turns left on a positive turn, the way the camera counts yaw', () => {
    assert.ok(lookStep({ turn: 1, tilt: 0, held: 0, delta: FRAME, sensitivity: 1 }).yaw > 0)
  })

  it('turns right on a negative one', () => {
    assert.ok(lookStep({ turn: -1, tilt: 0, held: 0, delta: FRAME, sensitivity: 1 }).yaw < 0)
  })

  it('looks up on a positive tilt and down on a negative one', () => {
    assert.ok(lookStep({ turn: 0, tilt: 1, held: 0, delta: FRAME, sensitivity: 1 }).pitch > 0)
    assert.ok(lookStep({ turn: 0, tilt: -1, held: 0, delta: FRAME, sensitivity: 1 }).pitch < 0)
  })

  it('does nothing at all when nothing is held', () => {
    const step = lookStep({ turn: 0, tilt: 0, held: 0.3, delta: FRAME, sensitivity: 1 })
    assert.deepEqual(step, { yaw: 0, pitch: 0, held: 0 })
  })

  it('turns and tilts at once, because a diagonal is one gesture', () => {
    const step = lookStep({ turn: 1, tilt: -1, held: 0, delta: FRAME, sensitivity: 1 })
    assert.ok(step.yaw > 0 && step.pitch < 0)
  })
})

describe('the ramp', () => {
  it('starts at the floor rather than at nothing', () => {
    assert.equal(rampAt(0), LOOK_FLOOR)
  })

  it('reaches full speed after the ramp and stays there', () => {
    assert.equal(rampAt(LOOK_RAMP_SECONDS), 1)
    assert.equal(rampAt(LOOK_RAMP_SECONDS * 4), 1)
  })

  it('only ever climbs', () => {
    let last = -Infinity
    for (let held = 0; held <= LOOK_RAMP_SECONDS; held += 0.01) {
      const now = rampAt(held)
      assert.ok(now >= last, `ramp fell at ${held}s`)
      last = now
    }
  })

  // The whole reason the ramp exists. A tap has to be able to settle on a
  // thirty-millimetre drawer front, and a hold has to be able to turn round.
  it('makes a tap far finer than a sweep, per second held', () => {
    const tap = hold(0.05, { turn: 1 })
    const sweep = hold(1.2, { turn: 1 })

    const tapRate = tap.yaw / 0.05
    const sweepRate = sweep.yaw / 1.2

    assert.ok(tapRate < sweepRate * 0.55, `tap ${tapRate} vs sweep ${sweepRate} rad/s`)
  })

  it('resets the moment the key is let go', () => {
    const after = lookStep({ turn: 0, tilt: 0, held: LOOK_RAMP_SECONDS, delta: FRAME, sensitivity: 1 })
    assert.equal(after.held, 0)
  })

  it('never banks more hold than the ramp needs', () => {
    assert.equal(hold(10, { turn: 1 }).held, LOOK_RAMP_SECONDS)
  })
})

describe('the rate', () => {
  it('settles at the authored speed once the ramp is done', () => {
    // A long hold is almost all full speed, so the average lands just under it.
    const seconds = 6
    const rate = hold(seconds, { turn: 1 }).yaw / seconds

    assert.ok(rate < LOOK_YAW && rate > LOOK_YAW * 0.9, `${rate} rad/s against ${LOOK_YAW}`)
  })

  it('tilts slower than it turns, because pitch has a quarter of the range', () => {
    assert.ok(LOOK_PITCH < LOOK_YAW)
    assert.ok(hold(2, { tilt: 1 }).pitch < hold(2, { turn: 1 }).yaw)
  })

  it('is the same however the frame rate falls', () => {
    // Two frame rates over the same second land in the same place, which is what
    // stops a slow machine playing a different game from a fast one.
    function at(frame: number): number {
      let held = 0
      let yaw = 0
      const frames = Math.round(1 / frame)

      for (let i = 0; i < frames; i += 1) {
        const step = lookStep({ turn: 1, tilt: 0, held, delta: frame, sensitivity: 1 })
        held = step.held
        yaw += step.yaw
      }
      return yaw
    }

    // Tight, because the midpoint rule integrates the ramp exactly. Sampling it
    // at the end of the frame instead put these nearly ten per cent apart.
    assert.ok(Math.abs(at(1 / 60) - at(1 / 15)) < 0.01, `${at(1 / 60)} against ${at(1 / 15)}`)
  })

  it('scales with the sensitivity the mouse uses', () => {
    const slow = hold(2, { turn: 1, sensitivity: 0.5 })
    const fast = hold(2, { turn: 1, sensitivity: 2 })

    assert.ok(Math.abs(fast.yaw / slow.yaw - 4) < 0.001, `${fast.yaw / slow.yaw}x`)
  })
})

describe('the clamp', () => {
  // The defaults PointerLockControls ships with: straight up to straight down.
  const MIN_POLAR = 0
  const MAX_POLAR = Math.PI

  it('leaves an ordinary pitch alone', () => {
    assert.equal(clampPitch(0.4, MIN_POLAR, MAX_POLAR), 0.4)
  })

  it('stops at the floor and at the ceiling', () => {
    assert.equal(clampPitch(-99, MIN_POLAR, MAX_POLAR), -Math.PI / 2)
    assert.equal(clampPitch(99, MIN_POLAR, MAX_POLAR), Math.PI / 2)
  })

  // The reason the bounds are passed in rather than written down here. Narrow
  // the controls and the arrows have to narrow with them, or the keyboard can
  // look somewhere the mouse cannot.
  it('follows the controls when they are narrowed', () => {
    const narrow = { min: Math.PI / 4, max: (Math.PI * 3) / 4 }

    assert.equal(clampPitch(99, narrow.min, narrow.max), Math.PI / 2 - narrow.min)
    assert.equal(clampPitch(-99, narrow.min, narrow.max), Math.PI / 2 - narrow.max)
  })
})

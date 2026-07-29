/**
 * How far the arrow keys turn the camera in one frame.
 *
 * Pure, and takes its data as arguments, so the rate, the ramp and the clamp run
 * under `node --test` with no renderer and no clock. That matters more here than
 * it looks: a headless browser on a software rasteriser renders at a couple of
 * frames a second, the engine clamps `delta` so a stalled tab cannot teleport
 * anybody, and the two together make it impossible to measure a turn rate by
 * driving the real game. The arithmetic is checked here instead, and the browser
 * only has to prove the wiring.
 *
 * Section 4.2's only verb is aiming, so this is the part of the controller most
 * worth being sure about.
 */

/** Radians per second at full tilt. Pitch is slower: its whole range is a quarter turn. */
export const LOOK_YAW = 1.75
export const LOOK_PITCH = 1.3

/**
 * How a held arrow key gets up to speed, and where it starts.
 *
 * One flat rate cannot do both jobs. Fast enough to turn round and see the room
 * is far too fast to settle on a drawer front, and slow enough to aim makes
 * crossing the flat a chore. So it starts at a third and ramps if the key stays
 * down: a tap is a nudge, a hold is a turn.
 */
export const LOOK_RAMP_SECONDS = 0.45
export const LOOK_FLOOR = 0.34

export interface LookInput {
  /** Left is positive, matching the camera's own yaw. */
  turn: number
  /** Up is positive. */
  tilt: number
  /** Seconds the arrows have been held without a break. */
  held: number
  delta: number
  /** The same multiplier the mouse uses. */
  sensitivity: number
}

export interface LookStep {
  /** Radians to add to yaw. */
  yaw: number
  /** Radians to add to pitch, before clamping. */
  pitch: number
  /** The hold time to carry into the next frame. Zero once the keys are let go. */
  held: number
}

/** Where the ramp is after this long on the key, between the floor and one. */
export function rampAt(held: number): number {
  const along = Math.min(1, Math.max(0, held / LOOK_RAMP_SECONDS))
  return LOOK_FLOOR + (1 - LOOK_FLOOR) * along
}

export function lookStep(input: LookInput): LookStep {
  const { turn, tilt, delta, sensitivity } = input

  // Letting go resets the ramp, so the next tap is a nudge again rather than
  // carrying on at whatever speed the last sweep reached.
  if (turn === 0 && tilt === 0) return { yaw: 0, pitch: 0, held: 0 }

  const held = Math.min(LOOK_RAMP_SECONDS, input.held + delta)

  // The ramp is sampled halfway through the frame rather than at the end of it.
  // Sampling at the end overestimates by more the longer the frame, which had
  // the camera turning almost ten per cent faster at fifteen frames a second
  // than at sixty. The midpoint integrates a straight line exactly, so a slow
  // machine and a fast one now cover the same ground in the same second.
  const scale = rampAt((input.held + held) / 2) * sensitivity * delta

  return {
    yaw: turn * LOOK_YAW * scale,
    pitch: tilt * LOOK_PITCH * scale,
    held,
  }
}

/**
 * The limit the mouse already stops at.
 *
 * `PointerLockControls` clamps pitch to its own polar angles, so the bounds come
 * from there rather than being written down twice. Duplicating the arithmetic
 * would work right up until somebody narrowed the controls and left the arrows
 * able to look somewhere the mouse cannot.
 */
export function clampPitch(pitch: number, minPolar: number, maxPolar: number): number {
  const lowest = Math.PI / 2 - maxPolar
  const highest = Math.PI / 2 - minPolar
  return Math.max(lowest, Math.min(highest, pitch))
}

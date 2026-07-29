/**
 * What is within arm's length, and which way to turn to see it.
 *
 * Pure, and takes its data as arguments, so it runs under `node --test` with no
 * renderer and no scene graph. Everything with logic in it lives somewhere the
 * tests can reach, and the order Tab walks the room in is logic.
 *
 * ## Why this exists
 *
 * Section 4.2 gives the game one verb, aiming, and v0.5 gave the arrow keys a
 * way to do it. That is enough to look around and not quite enough to play:
 * `junk_drawer` is a thirty-millimetre panel visible from about a third of one
 * per cent of the angles in the kitchen, and settling on it by holding a key is
 * miserable. So the player can step through what is near them instead.
 *
 * ## What it must never become
 *
 * Section 8.2's design note forbids an objective marker outright: "no forced
 * camera, no objective marker, no interruption". Stepping through things and
 * being shown where they are is one short step from being told where to go.
 *
 * The line is drawn at reach. This offers nothing the player could not already
 * have found by turning their head where they are standing, because the reach
 * it is given is the raycast's own. It removes the precision from searching, not
 * the searching. Do not widen it to "everything in the room", and do not sort by
 * anything but angle: sorting by importance, by act, or by what is unexamined
 * would all be the game pointing.
 */

export interface Point3 {
  x: number
  y: number
  z: number
}

export interface Reachable {
  id: string
  /** Where to point to have it in the middle of the screen. */
  at: Point3
}

export interface Aim {
  yaw: number
  pitch: number
}

/** Which way Tab walks. Right is clockwise, which is decreasing yaw. */
export type Turn = 'left' | 'right'

const TAU = Math.PI * 2

export function distanceTo(from: Point3, at: Point3): number {
  return Math.hypot(at.x - from.x, at.y - from.y, at.z - from.z)
}

/**
 * The yaw and pitch that put a point in the centre of the screen.
 *
 * Yaw follows the camera's own convention: zero looks down negative Z, and it
 * increases anticlockwise, which is why the x term is negated.
 */
export function aimAt(from: Point3, at: Point3): Aim {
  const dx = at.x - from.x
  const dy = at.y - from.y
  const dz = at.z - from.z

  return {
    yaw: Math.atan2(-dx, -dz),
    pitch: Math.atan2(dy, Math.hypot(dx, dz)),
  }
}

/** How far round, in the given direction, from one heading to another. */
export function turnFrom(facing: number, toward: number, direction: Turn): number {
  const raw = direction === 'left' ? toward - facing : facing - toward

  // Into (0, TAU]. Not [0, TAU): something dead ahead should sort last rather
  // than first, because Tab means "the next one", never "the one I am on".
  const wrapped = raw - Math.floor(raw / TAU) * TAU
  return wrapped === 0 ? TAU : wrapped
}

export interface TurnOrderOptions {
  /** The raycast's reach. Not a number of this module's own choosing. */
  reach: number
  direction: Turn
  /** What the player is already on, which Tab should move off rather than back to. */
  skip?: string | null
}

/**
 * Everything within reach, in the order Tab should walk it.
 *
 * Angle only, and always the same angle from the same place, so stepping through
 * a room is a ring rather than a shuffle. Ties break by distance and then by id,
 * which matters only so that two things at the same bearing do not swap places
 * between one press and the next.
 */
export function turnOrder(
  from: Point3,
  facing: number,
  items: Reachable[],
  options: TurnOrderOptions,
): Reachable[] {
  const within = items
    .filter((item) => item.id !== options.skip)
    .map((item) => ({
      item,
      distance: distanceTo(from, item.at),
      turn: turnFrom(facing, aimAt(from, item.at).yaw, options.direction),
    }))
    .filter((entry) => entry.distance <= options.reach)

  within.sort((a, b) => {
    if (a.turn !== b.turn) return a.turn - b.turn
    if (a.distance !== b.distance) return a.distance - b.distance
    return a.item.id.localeCompare(b.item.id)
  })

  return within.map((entry) => entry.item)
}

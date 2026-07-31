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

/**
 * Which way something is, in eight sectors, as a key rather than as words.
 *
 * A key because the words are player-facing and player-facing words live in
 * `data/`, not here. See `data/orientation.json` and the note in the README
 * about narrative living in data: it is what lets the validator and the v0.6
 * content review see every string the game can say.
 */
export type Bearing =
  | 'ahead'
  | 'ahead_left'
  | 'left'
  | 'behind_left'
  | 'behind'
  | 'behind_right'
  | 'right'
  | 'ahead_right'

/** Clockwise from straight ahead, matching the sectors below. */
const BEARINGS: Bearing[] = [
  'ahead', 'ahead_right', 'right', 'behind_right',
  'behind', 'behind_left', 'left', 'ahead_left',
]

/**
 * Which of eight sectors a heading falls in, relative to where you are looking.
 *
 * Eight rather than four because "ahead and to your left" is a thing somebody
 * can act on and "left" covers a hundred and eighty degrees of the room. Sectors
 * are centred rather than cornered, so straight ahead is `ahead` rather than
 * sitting on the boundary between two answers.
 *
 * Yaw here is the camera's own: zero looks down negative Z and it increases
 * anticlockwise, which is why the sector index counts the other way.
 */
export function bearingFrom(facing: number, toward: number): Bearing {
  const SECTOR = TAU / BEARINGS.length

  // Anticlockwise yaw into a clockwise sector index, offset by half a sector so
  // each label owns the angles around it rather than the angles after it.
  const raw = facing - toward + SECTOR / 2
  const wrapped = raw - Math.floor(raw / TAU) * TAU

  return BEARINGS[Math.floor(wrapped / SECTOR)] ?? 'ahead'
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

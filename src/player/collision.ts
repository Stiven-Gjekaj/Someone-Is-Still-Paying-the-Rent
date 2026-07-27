/**
 * Keeps the player inside the flat and out of the furniture.
 *
 * Rooms are rectangles and furniture footprints are boxes, so this is all
 * interval arithmetic. A move that fails is retried one axis at a time, which is
 * what makes walking along a wall slide rather than stick.
 *
 * The balcony is inset further than anywhere else. Hard Rule 10 says nothing
 * there may carry dark connotation, and the cheapest way to guarantee the drop
 * never composes into a shot is to stop the player getting near enough to the
 * parapet to look over it steeply. Half a metre of standoff turns the steepest
 * available sightline into the warm haze on the backdrop rather than anything
 * below.
 */

import type { FloorPlan, FurniturePiece, WallSide } from '../content/types.ts'
import type { Collider } from './controller.ts'

const PLAYER_RADIUS = 0.28

/** Standoff from any side of a room carrying a parapet. */
const PARAPET_STANDOFF = 0.55

/** How far a doorway passage reaches either side of the wall it cuts. */
const PASSAGE_DEPTH = 0.7

/** Furniture whose underside clears this is walked under, not into. */
const DUCKABLE_HEIGHT = 1.0

interface Box {
  minX: number
  minZ: number
  maxX: number
  maxZ: number
}

function contains(box: Box, x: number, z: number): boolean {
  return x >= box.minX && x <= box.maxX && z >= box.minZ && z <= box.maxZ
}

export interface FlatCollider extends Collider {
  /**
   * Whether the player could stand with their centre here.
   *
   * Exposed rather than kept private because `resolve` cannot answer it: a move
   * of zero length always succeeds, so asking "can I stay put" tells you nothing.
   * The reachability test needs the predicate itself.
   */
  standable(x: number, z: number): boolean
}

export function createCollider(plan: FloorPlan, furniture: FurniturePiece[]): FlatCollider {
  // Where the player may stand: each room, pulled in by their radius, and more
  // on any side with a parapet.
  const floors: Box[] = plan.rooms.map((room) => {
    const sides = new Set<WallSide>(room.parapet?.sides ?? [])
    const inset = (side: WallSide): number => (sides.has(side) ? PARAPET_STANDOFF : PLAYER_RADIUS)

    return {
      minX: room.min[0] + inset('west'),
      maxX: room.max[0] - inset('east'),
      minZ: room.min[1] + inset('north'),
      maxZ: room.max[1] - inset('south'),
    }
  })

  // Doorways, so the inset rooms are actually connected. The front door is not
  // one of them: it is shut, and it stays shut until the ending.
  const passages: Box[] = plan.openings
    .filter((opening) => opening.kind !== 'front_door')
    .map((opening) => {
      const low = opening.centre - opening.width / 2 + PLAYER_RADIUS
      const high = opening.centre + opening.width / 2 - PLAYER_RADIUS

      return opening.wall === 'z'
        ? { minX: low, maxX: high, minZ: opening.at - PASSAGE_DEPTH, maxZ: opening.at + PASSAGE_DEPTH }
        : { minX: opening.at - PASSAGE_DEPTH, maxX: opening.at + PASSAGE_DEPTH, minZ: low, maxZ: high }
    })

  const blockers: Box[] = []

  for (const piece of furniture) {
    if ((piece.elevation ?? 0) >= DUCKABLE_HEIGHT) continue

    const angle = piece.rotation ?? 0
    const cos = Math.abs(Math.cos(angle))
    const sin = Math.abs(Math.sin(angle))
    const extentX = (piece.size[0] / 2) * cos + (piece.size[2] / 2) * sin
    const extentZ = (piece.size[0] / 2) * sin + (piece.size[2] / 2) * cos

    blockers.push({
      minX: piece.position[0] - extentX - PLAYER_RADIUS,
      maxX: piece.position[0] + extentX + PLAYER_RADIUS,
      minZ: piece.position[1] - extentZ - PLAYER_RADIUS,
      maxZ: piece.position[1] + extentZ + PLAYER_RADIUS,
    })
  }

  function standable(x: number, z: number): boolean {
    if (blockers.some((box) => contains(box, x, z))) return false
    if (floors.some((box) => contains(box, x, z))) return true
    return passages.some((box) => contains(box, x, z))
  }

  return {
    standable,

    resolve(fromX: number, fromZ: number, toX: number, toZ: number): { x: number; z: number } {
      if (standable(toX, toZ)) return { x: toX, z: toZ }

      // Slide: give up the axis that is blocked and keep the one that is not.
      if (standable(toX, fromZ)) return { x: toX, z: fromZ }
      if (standable(fromX, toZ)) return { x: fromX, z: toZ }

      return { x: fromX, z: fromZ }
    },
  }
}

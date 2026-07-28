/**
 * Puts the objects where `data/placement.json` says they go.
 *
 * Offsets are read in the surface's own frame: local X runs along the surface,
 * local Y is up, local Z is out of it. That is what lets the data say "a little
 * to the left of the bedside table" instead of a world coordinate that nobody can
 * check by reading it.
 *
 * After rotating, anything resting on a horizontal surface is dropped so its
 * lowest point touches that surface. A phone turned face down and a frame tilted
 * back have different undersides, and working the correction out from the bounds
 * is more reliable than writing a Y offset per pose by hand.
 */

import * as THREE from 'three'

import type { GameObject, Placement } from '../content/types.ts'
import type { SurfaceAnchor } from './furniture.ts'
import type { PropFactory } from './props.ts'

export interface PlacedObjects {
  group: THREE.Group
  /** Everything the raycast can hit, by object id. */
  byObject: Map<string, THREE.Object3D>
  /** Ids of placements skipped, because their object is not in the flat yet. */
  deferred: string[]
  /**
   * Builds a skipped placement and puts it in the room, now.
   *
   * Returns null if the id was never deferred or has already been revealed, so
   * a caller can run the whole pass repeatedly without tracking what it did.
   */
  reveal(id: string): THREE.Object3D | null
  dispose(): void
}

const X_AXIS = new THREE.Vector3(1, 0, 0)
const Y_AXIS = new THREE.Vector3(0, 1, 0)

/** Half a millimetre, which is enough to win a raycast tie and too little to see. */
const SURFACE_CLEARANCE = 0.0005

/** How far each pose tips the prop back from lying flat. */
const POSE_TILT: Record<string, number> = {
  flat: 0,
  face_down: Math.PI,
  upright: -Math.PI / 2,
  leaning: -1.35,
}

/**
 * `isPresent` decides what is in the room. It is passed in rather than computed
 * here because "is this object in the flat yet" is a content rule, not a
 * geometry one: see `src/rules/reveal.ts`, which owns both halves of it.
 */
export function placeObjects(
  placements: Placement[],
  surfaces: Map<string, SurfaceAnchor>,
  props: PropFactory,
  objects: GameObject[],
  isPresent: (object: GameObject) => boolean,
): PlacedObjects {
  const group = new THREE.Group()
  group.name = 'objects'

  const byObject = new Map<string, THREE.Object3D>()

  // Kept as the whole record rather than just the id: revealing one later needs
  // the surface and the shape, and looking them up again from `getPlacements()`
  // would put the same list in two places.
  const held = new Map<string, Placement>()

  const present = new Set(objects.filter(isPresent).map((o) => o.id))

  function build(placement: Placement): THREE.Object3D {
    const surface = surfaces.get(placement.surface)
    if (surface === undefined) {
      // The validator rules this out, so reaching here means the data and the
      // registry have drifted apart and staying quiet would hide it.
      throw new Error(`placement "${placement.id}" names unknown surface "${placement.surface}"`)
    }

    const prop = props.build(placement.shape, placement.tint)
    prop.name = `object:${placement.id}`

    const scale = placement.scale ?? 1
    prop.scale.setScalar(scale)

    const offset = new THREE.Vector3(...(placement.offset ?? [0, 0, 0]))
    offset.applyAxisAngle(Y_AXIS, surface.yaw)

    if (surface.orientation === 'vertical') {
      // Most things on a wall are flat and want tipping up, so the face that
      // pointed at the ceiling ends up pointing into the room. Things that hang
      // do not: tipping a run of string lights turns its sag into depth and
      // pushes it straight through the wall. `pose: upright` opts out.
      const upright = placement.pose === 'upright'

      prop.quaternion.setFromAxisAngle(Y_AXIS, surface.yaw)
      if (!upright) {
        prop.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(X_AXIS, Math.PI / 2))
      }

      prop.position.copy(surface.position).add(offset)
    } else {
      const tilt = POSE_TILT[placement.pose ?? 'flat'] ?? 0
      prop.quaternion
        .setFromAxisAngle(Y_AXIS, surface.yaw + (placement.yaw ?? 0))
        .multiply(new THREE.Quaternion().setFromAxisAngle(X_AXIS, tilt))

      prop.position.copy(surface.position).add(offset)

      // Settle it onto the surface rather than through it, and then a hair above.
      //
      // Resting a two-millimetre paper sleeve exactly on a shelf leaves its
      // underside coplanar with the shelf top, which is a raycast tie and a
      // depth-buffer one. Neither has been seen to bite, so this is insurance
      // rather than a fix: half a millimetre is invisible and settles both.
      prop.updateMatrixWorld(true)
      const bounds = new THREE.Box3().setFromObject(prop)
      prop.position.y += surface.position.y + offset.y - bounds.min.y + SURFACE_CLEARANCE
    }

    prop.traverse((node) => {
      node.userData['objectId'] = placement.id
    })

    group.add(prop)
    byObject.set(placement.id, prop)
    return prop
  }

  for (const placement of placements) {
    if (present.has(placement.id)) build(placement)
    else held.set(placement.id, placement)
  }

  return {
    group,
    byObject,
    get deferred(): string[] {
      return [...held.keys()]
    },

    reveal(id: string): THREE.Object3D | null {
      const placement = held.get(id)
      if (placement === undefined) return null

      held.delete(id)
      return build(placement)
    },

    dispose(): void {
      group.clear()
      byObject.clear()
      held.clear()
    },
  }
}

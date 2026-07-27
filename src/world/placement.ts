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

import type { ActNumber, GameObject, Placement } from '../content/types.ts'
import type { SurfaceAnchor } from './furniture.ts'
import type { PropFactory } from './props.ts'

export interface PlacedObjects {
  group: THREE.Group
  /** Everything the raycast can hit, by object id. */
  byObject: Map<string, THREE.Object3D>
  /** Placements skipped because their object belongs to a later act. */
  deferred: string[]
  dispose(): void
}

const X_AXIS = new THREE.Vector3(1, 0, 0)
const Y_AXIS = new THREE.Vector3(0, 1, 0)

/** How far each pose tips the prop back from lying flat. */
const POSE_TILT: Record<string, number> = {
  flat: 0,
  face_down: Math.PI,
  upright: -Math.PI / 2,
  leaning: -1.35,
}

export function placeObjects(
  placements: Placement[],
  surfaces: Map<string, SurfaceAnchor>,
  props: PropFactory,
  objects: GameObject[],
  act: ActNumber,
): PlacedObjects {
  const group = new THREE.Group()
  group.name = 'objects'

  const byObject = new Map<string, THREE.Object3D>()
  const deferred: string[] = []

  const present = new Set(objects.filter((o) => o.act_min <= act).map((o) => o.id))

  for (const placement of placements) {
    if (!present.has(placement.id)) {
      deferred.push(placement.id)
      continue
    }

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
      // Tip the prop up so the face that pointed at the ceiling now points out of
      // the wall, then turn it to match the wall.
      prop.quaternion
        .setFromAxisAngle(Y_AXIS, surface.yaw)
        .multiply(new THREE.Quaternion().setFromAxisAngle(X_AXIS, Math.PI / 2))

      prop.position.copy(surface.position).add(offset)
    } else {
      const tilt = POSE_TILT[placement.pose ?? 'flat'] ?? 0
      prop.quaternion
        .setFromAxisAngle(Y_AXIS, surface.yaw + (placement.yaw ?? 0))
        .multiply(new THREE.Quaternion().setFromAxisAngle(X_AXIS, tilt))

      prop.position.copy(surface.position).add(offset)

      // Settle it onto the surface rather than through it.
      prop.updateMatrixWorld(true)
      const bounds = new THREE.Box3().setFromObject(prop)
      prop.position.y += surface.position.y + offset.y - bounds.min.y
    }

    prop.traverse((node) => {
      node.userData['objectId'] = placement.id
    })

    group.add(prop)
    byObject.set(placement.id, prop)
  }

  return {
    group,
    byObject,
    deferred,
    dispose(): void {
      group.clear()
      byObject.clear()
    },
  }
}

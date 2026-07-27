/**
 * What the player is looking at.
 *
 * Section 4.2: a ray from the centre of the screen, one target at a time. The
 * ray tests the whole scene graph under the roots it is given and then walks up
 * from whatever it hit to find the nearest ancestor carrying an object id, so a
 * hit on one drawer of the desk resolves to the desk.
 *
 * Reach is short on purpose. Objects you can read from across the room are
 * objects you never walk over to, and this game is largely about walking over to
 * things.
 */

import * as THREE from 'three'

import type { GameObject } from '../content/types.ts'

const REACH = 2.4

export interface Target {
  id: string
  object: GameObject
  node: THREE.Object3D
  distance: number
}

export interface Targeting {
  /** Recomputes the target and returns it. Null when nothing is in reach. */
  update(): Target | null
  current(): Target | null
}

function objectIdOf(node: THREE.Object3D): string | null {
  let current: THREE.Object3D | null = node
  while (current !== null) {
    const id = current.userData['objectId']
    if (typeof id === 'string') return id
    current = current.parent
  }
  return null
}

export function createTargeting(
  camera: THREE.Camera,
  roots: THREE.Object3D[],
  objects: GameObject[],
): Targeting {
  const raycaster = new THREE.Raycaster()
  raycaster.far = REACH

  const byId = new Map(objects.map((object) => [object.id, object]))
  const centre = new THREE.Vector2(0, 0)

  let target: Target | null = null

  return {
    update(): Target | null {
      raycaster.setFromCamera(centre, camera)
      const hits = raycaster.intersectObjects(roots, true)

      target = null

      for (const hit of hits) {
        const id = objectIdOf(hit.object)
        if (id === null) continue

        const object = byId.get(id)
        // An id with no object behind it means the scene and the data have
        // drifted. Skipping quietly would hide that, so let the ray pass through
        // and let the missing prompt be the symptom.
        if (object === undefined) continue

        target = { id, object, node: hit.object, distance: hit.distance }
        break
      }

      return target
    },

    current(): Target | null {
      return target
    },
  }
}

/** Section 4.2. One context action, chosen by what the object is. */
export function verbFor(object: GameObject): string {
  if (object.type.includes('readable') || object.type.includes('keystone')) return 'Read'
  return 'Examine'
}

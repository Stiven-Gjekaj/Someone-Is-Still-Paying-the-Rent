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
import type { Reachable } from './reach.ts'

const REACH = 2.4

export interface Target {
  id: string
  object: GameObject
  /** The exact mesh the ray hit. */
  node: THREE.Object3D
  /** The whole object it belongs to, which is what gets outlined. */
  owner: THREE.Object3D
  distance: number
}

export interface Targeting {
  /** Recomputes the target and returns it. Null when nothing is in reach. */
  update(): Target | null
  current(): Target | null
  /** How far the ray goes, so nothing else has to decide what "in reach" means. */
  reach(): number
  /**
   * Everything in the scene carrying an object id, with somewhere to aim at.
   *
   * Bounding box centres rather than origins: a desk's origin can be at one
   * corner, and turning to face a corner of something is not turning to face it.
   * Unfiltered by distance, because the caller owns that question and the answer
   * has to come from `reach()` rather than from two places agreeing.
   */
  candidates(): Reachable[]
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

/**
 * The outermost ancestor still carrying the same id. Placement tags every mesh
 * in a prop, so this walks up to the prop itself: hovering one drawer front
 * should outline the desk, not the drawer.
 */
function ownerOf(node: THREE.Object3D, id: string): THREE.Object3D {
  let owner = node
  let current: THREE.Object3D | null = node.parent

  while (current !== null) {
    if (current.userData['objectId'] === id) owner = current
    current = current.parent
  }

  return owner
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

        target = { id, object, node: hit.object, owner: ownerOf(hit.object, id), distance: hit.distance }
        break
      }

      return target
    },

    current(): Target | null {
      return target
    },

    reach(): number {
      return REACH
    },

    candidates(): Reachable[] {
      const found = new Map<string, Reachable>()
      const box = new THREE.Box3()
      const centre = new THREE.Vector3()

      for (const root of roots) {
        root.traverse((node) => {
          const id = objectIdOf(node)
          if (id === null || found.has(id) || !byId.has(id)) return

          // The outermost node with this id, so the box covers the whole prop
          // rather than whichever mesh the traversal reached first.
          const owner = ownerOf(node, id)
          if (!owner.visible) return

          box.setFromObject(owner)
          if (box.isEmpty()) return

          box.getCenter(centre)
          found.set(id, { id, at: { x: centre.x, y: centre.y, z: centre.z } })
        })
      }

      return [...found.values()]
    },
  }
}

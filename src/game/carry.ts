/**
 * Holding one of his things.
 *
 * Single slot, deliberately. Section 4.1 is about deciding what to do with an
 * object, and you cannot decide about six at once. Carrying one thing at a time
 * means every trip to the boxes is a separate small decision, which is the whole
 * mechanic.
 *
 * The held prop is parented to the camera rather than drawn as a HUD sprite, so
 * it is lit by the room it is in. Walking his jumper from the bedroom into the
 * dark living room should look like walking it into the dark living room.
 */

import * as THREE from 'three'

import type { GameObject } from '../content/types.ts'

/** How far in front of the eye a held object sits, and how far down and right. */
const HELD_OFFSET = new THREE.Vector3(0.23, -0.29, -0.58)

/**
 * The largest a held object is allowed to appear across, in metres.
 *
 * Objects are modelled at real size, and a real suitcase held 40cm from your
 * face fills the screen. Anything bigger than this is scaled down to fit; nothing
 * is ever scaled up, so a bottle cap stays a bottle cap.
 */
const HELD_ENVELOPE = 0.24

export interface Held {
  id: string
  object: GameObject
  node: THREE.Object3D
}

export interface Carry {
  held(): Held | null
  /** Lifts an object out of the world. Ignored if something is already held. */
  take(id: string, object: GameObject, node: THREE.Object3D): boolean
  /** Returns the held object to exactly where it was standing. */
  putBack(): Held | null
  /**
   * Hands the held object over for good. The caller owns the node afterwards,
   * which for sorting means dropping it in a box and never showing it again.
   */
  release(): Held | null
  dispose(): void
}

interface Origin {
  parent: THREE.Object3D
  position: THREE.Vector3
  quaternion: THREE.Quaternion
  scale: THREE.Vector3
}

export function createCarry(camera: THREE.Camera): Carry {
  const bounds = new THREE.Box3()
  const span = new THREE.Vector3()

  let held: Held | null = null
  let origin: Origin | null = null

  function restore(): Held | null {
    if (held === null || origin === null) return null

    const was = held
    origin.parent.add(was.node)
    was.node.position.copy(origin.position)
    was.node.quaternion.copy(origin.quaternion)
    was.node.scale.copy(origin.scale)

    held = null
    origin = null
    return was
  }

  return {
    held(): Held | null {
      return held
    },

    take(id, object, node): boolean {
      if (held !== null) return false
      if (node.parent === null) return false

      origin = {
        parent: node.parent,
        position: node.position.clone(),
        quaternion: node.quaternion.clone(),
        scale: node.scale.clone(),
      }

      camera.add(node)
      node.position.copy(HELD_OFFSET)
      // Turned a little, as anything is when you pick it up rather than place it.
      node.rotation.set(0.18, -0.5, 0.09)
      node.scale.copy(origin.scale)
      node.updateMatrixWorld(true)

      bounds.setFromObject(node).getSize(span)
      const widest = Math.max(span.x, span.y, span.z)
      if (widest > HELD_ENVELOPE) node.scale.multiplyScalar(HELD_ENVELOPE / widest)

      held = { id, object, node }
      return true
    },

    putBack(): Held | null {
      return restore()
    },

    release(): Held | null {
      if (held === null) return null

      const was = held
      was.node.removeFromParent()

      held = null
      origin = null
      return was
    },

    dispose(): void {
      // Put it down before the session goes away, so the node is back under the
      // group that knows how to dispose of it.
      restore()
    },
  }
}

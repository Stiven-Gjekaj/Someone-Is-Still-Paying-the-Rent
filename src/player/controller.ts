/**
 * Walking around the flat, and looking around it.
 *
 * Deliberately slow. This is a game about a room you do not want to be in, and a
 * player who can cross it in three strides is playing a different one. There is
 * no sprint and there never will be.
 *
 * Head bob is off by default when the system asks for reduced motion, and can be
 * switched off regardless from the pause menu. Some people will start this game
 * already upset, and motion sickness on top of that is not a cost worth any
 * amount of immersion.
 *
 * ## The arrow keys look rather than move
 *
 * They used to be a second set of movement keys, duplicating WASD, and looking
 * was mouse only. Aiming the crosshair is the only verb section 4.2 has, so that
 * arrangement meant the game could not be played at all without a mouse: two
 * mappings for walking and none for the thing the game is made of.
 *
 * Rebinding costs somebody their habit, and it is still right. Adding a third
 * obscure cluster to leave the arrows alone would have hidden the fix from
 * exactly the people who need it.
 */

import * as THREE from 'three'
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js'

import type { FloorPlan } from '../content/types.ts'
import { clampPitch, lookStep } from './look.ts'

/** Metres per second. A slow indoor walk. */
const WALK_SPEED = 1.45

const BOB_AMPLITUDE = 0.017
const BOB_RATE = 8.6

export interface Collider {
  /** Slides the move along whatever it runs into and returns where it ends up. */
  resolve(fromX: number, fromZ: number, toX: number, toZ: number): { x: number; z: number }
}

export interface Player {
  update(delta: number): void
  lock(): void
  unlock(): void
  isLocked(): boolean
  setSensitivity(value: number): void
  setHeadBob(enabled: boolean): void
  onLockChange(listener: (locked: boolean) => void): void
  dispose(): void
}

export interface PlayerOptions {
  collider?: Collider
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function createPlayer(
  camera: THREE.PerspectiveCamera,
  domElement: HTMLElement,
  plan: FloorPlan,
  options: PlayerOptions = {},
): Player {
  const controls = new PointerLockControls(camera, domElement)

  camera.position.set(plan.spawn.position[0], plan.eye_height, plan.spawn.position[1])
  camera.rotation.order = 'YXZ'
  camera.rotation.y = plan.spawn.facing

  const pressed = new Set<string>()
  let bobEnabled = !prefersReducedMotion()
  let bobPhase = 0
  let travelled = 0

  /** How long the arrows have been held without a break, for the ramp. */
  let looking = 0

  const forward = new THREE.Vector3()
  const right = new THREE.Vector3()

  function onKeyDown(event: KeyboardEvent): void {
    pressed.add(event.code)
  }

  function onKeyUp(event: KeyboardEvent): void {
    pressed.delete(event.code)
  }

  // A key held while the pointer unlocks would otherwise stay held forever.
  function clearKeys(): void {
    pressed.clear()
    looking = 0
  }

  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('blur', clearKeys)
  controls.addEventListener('unlock', clearKeys)

  function axis(negative: string[], positive: string[]): number {
    const back = negative.some((code) => pressed.has(code)) ? 1 : 0
    const fore = positive.some((code) => pressed.has(code)) ? 1 : 0
    return fore - back
  }

  /**
   * Turns the camera with the arrows.
   *
   * Written straight to the camera rather than through the controls, which is
   * safe: their mouse handler reads `camera.quaternion` at the top of every
   * move, so it picks up whatever the keyboard did rather than fighting it from
   * a private copy. The two inputs share one camera and cannot drift apart.
   *
   * The arithmetic is in `look.ts` so it can be checked without a frame rate.
   * The sensitivity is read back off the controls rather than stored twice.
   */
  function look(delta: number): void {
    const step = lookStep({
      turn: axis(['ArrowRight'], ['ArrowLeft']),
      tilt: axis(['ArrowDown'], ['ArrowUp']),
      held: looking,
      delta,
      sensitivity: controls.pointerSpeed,
    })

    looking = step.held
    if (step.yaw === 0 && step.pitch === 0) return

    camera.rotation.y += step.yaw
    camera.rotation.x = clampPitch(
      camera.rotation.x + step.pitch,
      controls.minPolarAngle,
      controls.maxPolarAngle,
    )
  }

  return {
    update(delta: number): void {
      look(delta)

      const ahead = axis(['KeyS'], ['KeyW'])
      const across = axis(['KeyA'], ['KeyD'])

      if (ahead === 0 && across === 0) {
        // Settle the bob rather than freezing it mid-step.
        travelled = 0
        bobPhase *= Math.max(0, 1 - delta * 6)
        camera.position.y = plan.eye_height + Math.sin(bobPhase) * BOB_AMPLITUDE
        return
      }

      camera.getWorldDirection(forward)
      forward.y = 0
      forward.normalize()
      right.crossVectors(forward, camera.up).normalize()

      const step = WALK_SPEED * delta
      const move = new THREE.Vector3()
      move.addScaledVector(forward, ahead)
      move.addScaledVector(right, across)
      if (move.lengthSq() > 0) move.normalize().multiplyScalar(step)

      const fromX = camera.position.x
      const fromZ = camera.position.z
      const target = { x: fromX + move.x, z: fromZ + move.z }

      const settled = options.collider === undefined
        ? target
        : options.collider.resolve(fromX, fromZ, target.x, target.z)

      camera.position.x = settled.x
      camera.position.z = settled.z

      travelled += Math.hypot(settled.x - fromX, settled.z - fromZ)

      if (bobEnabled) {
        bobPhase += travelled > 0 ? delta * BOB_RATE : 0
        camera.position.y = plan.eye_height + Math.sin(bobPhase) * BOB_AMPLITUDE
      } else {
        camera.position.y = plan.eye_height
      }
    },

    lock(): void {
      controls.lock()
    },

    unlock(): void {
      controls.unlock()
    },

    isLocked(): boolean {
      return controls.isLocked
    },

    setSensitivity(value: number): void {
      controls.pointerSpeed = Math.min(Math.max(value, 0.2), 3)
    },

    setHeadBob(enabled: boolean): void {
      bobEnabled = enabled
      if (!enabled) camera.position.y = plan.eye_height
    },

    onLockChange(listener: (locked: boolean) => void): void {
      controls.addEventListener('lock', () => listener(true))
      controls.addEventListener('unlock', () => listener(false))
    },

    dispose(): void {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', clearKeys)
      controls.disconnect()
    },
  }
}

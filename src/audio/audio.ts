/**
 * Holds the sound sources together and keeps them oriented around the player.
 *
 * Nothing starts until the player presses Begin. Browsers require a gesture
 * before audio, and it is the right behaviour anyway: the advisory screen should
 * be silent.
 *
 * The fridge is the only positioned source. It belongs in the kitchen, it is
 * supposed to be irritating from the next room, and the whole gag in section 5
 * depends on noticing when it stops.
 */

import * as THREE from 'three'

import type { FloorPlan, RoomId } from '../content/types.ts'
import { createFridgeHum, createRain, createRoomTone, noiseBuffer, tick, type Hum, type Source } from './synth.ts'

const RAIN_LEVEL = 0.075
const ROOM_TONE_LEVEL = 0.03
const FRIDGE_LEVEL = 0.055
const TICK_LEVEL = 0.035

const TICK_MIN_GAP = 5
const TICK_MAX_GAP = 16

export interface Audio {
  /** Must be called from a user gesture. Safe to call more than once. */
  start(): Promise<void>
  update(delta: number, camera: THREE.Camera): void
  /** Section 5. The towel wins, posthumously. */
  setFridgeMuffled(muffled: boolean): void
  setMuted(muted: boolean): void
  dispose(): void
}

function centreOf(plan: FloorPlan, room: RoomId): THREE.Vector3 {
  const rect = plan.rooms.find((r) => r.id === room)
  if (rect === undefined) return new THREE.Vector3()
  return new THREE.Vector3((rect.min[0] + rect.max[0]) / 2, 1.0, (rect.min[1] + rect.max[1]) / 2)
}

export function createAudio(plan: FloorPlan): Audio {
  let context: AudioContext | null = null
  let master: GainNode | null = null
  let fridge: Hum | null = null
  let radiators: GainNode | null = null
  const sources: Source[] = []

  let untilNextTick = TICK_MIN_GAP
  let muted = false

  const forward = new THREE.Vector3()
  const up = new THREE.Vector3()

  return {
    async start(): Promise<void> {
      if (context !== null) {
        if (context.state === 'suspended') await context.resume()
        return
      }

      const ctx = new AudioContext()
      context = ctx

      const out = ctx.createGain()
      out.gain.value = muted ? 0 : 1
      out.connect(ctx.destination)
      master = out

      const noise = noiseBuffer(ctx)

      const rain = createRain(ctx, noise, RAIN_LEVEL)
      rain.output.connect(out)
      sources.push(rain)

      const tone = createRoomTone(ctx, noise, ROOM_TONE_LEVEL)
      tone.output.connect(out)
      sources.push(tone)

      const ticks = ctx.createGain()
      ticks.gain.value = 1
      ticks.connect(out)
      radiators = ticks

      const hum = createFridgeHum(ctx, FRIDGE_LEVEL)
      const panner = ctx.createPanner()
      panner.panningModel = 'HRTF'
      panner.distanceModel = 'inverse'
      panner.refDistance = 1.2
      panner.maxDistance = 12
      panner.rolloffFactor = 1.8

      const kitchen = centreOf(plan, 'kitchen')
      panner.positionX.value = kitchen.x
      panner.positionY.value = kitchen.y
      panner.positionZ.value = kitchen.z

      hum.output.connect(panner).connect(out)
      fridge = hum
      sources.push(hum)

      for (const source of sources) source.start()
      if (ctx.state === 'suspended') await ctx.resume()
    },

    update(delta: number, camera: THREE.Camera): void {
      if (context === null || radiators === null) return

      const listener = context.listener
      camera.getWorldDirection(forward)
      up.copy(camera.up).applyQuaternion(camera.quaternion)

      // The modern listener is a set of AudioParams. Older Safari still only has
      // the deprecated setters, so fall back rather than going silent.
      if (listener.positionX !== undefined) {
        listener.positionX.value = camera.position.x
        listener.positionY.value = camera.position.y
        listener.positionZ.value = camera.position.z
        listener.forwardX.value = forward.x
        listener.forwardY.value = forward.y
        listener.forwardZ.value = forward.z
        listener.upX.value = up.x
        listener.upY.value = up.y
        listener.upZ.value = up.z
      } else {
        listener.setPosition(camera.position.x, camera.position.y, camera.position.z)
        listener.setOrientation(forward.x, forward.y, forward.z, up.x, up.y, up.z)
      }

      untilNextTick -= delta
      if (untilNextTick <= 0) {
        tick(context, radiators, TICK_LEVEL)
        untilNextTick = TICK_MIN_GAP + Math.random() * (TICK_MAX_GAP - TICK_MIN_GAP)
      }
    },

    setFridgeMuffled(value: boolean): void {
      fridge?.setMuffled(value)
    },

    setMuted(value: boolean): void {
      muted = value
      if (master !== null && context !== null) {
        master.gain.setTargetAtTime(value ? 0 : 1, context.currentTime, 0.1)
      }
    },

    dispose(): void {
      for (const source of sources) {
        try {
          source.stop()
        } catch {
          // Already stopped. Nothing to do.
        }
      }
      sources.length = 0
      void context?.close()
      context = null
      master = null
      fridge = null
      radiators = null
    },
  }
}

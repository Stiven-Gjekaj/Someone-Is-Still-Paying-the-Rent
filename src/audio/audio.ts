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
import {
  createFridgeHum,
  createRain,
  createRoomTone,
  chime,
  createDemo,
  drawer,
  keyInLock,
  noiseBuffer,
  tick,
  type Hum,
  type Source,
} from './synth.ts'

const RAIN_LEVEL = 0.075
const ROOM_TONE_LEVEL = 0.03
const FRIDGE_LEVEL = 0.055
const TICK_LEVEL = 0.035
// Quiet. Section 8.2 wants a sound the player stops for, not one that stops them.
const CHIME_LEVEL = 0.09
// Under the rain rather than over it. It is a stereo in another room.
const DEMO_LEVEL = 0.06
// Close and dry. It is a desk in the room you are standing in.
const DRAWER_LEVEL = 0.12

const TICK_MIN_GAP = 5
const TICK_MAX_GAP = 16

/**
 * How far the flat recedes under a memory. Not silence: section 4.3 has you
 * standing in the room the whole time, and a hard cut to nothing would say
 * otherwise.
 */
const DUCK_LEVEL = 0.22

/** Ducking is slower than muting, and coming back is slower still. */
const MUTE_RAMP = 0.1
const DUCK_DOWN_RAMP = 0.35
const DUCK_UP_RAMP = 0.7

export interface Audio {
  /** Must be called from a user gesture. Safe to call more than once. */
  start(): Promise<void>
  update(delta: number, camera: THREE.Camera): void
  /** Section 5. The towel wins, posthumously. */
  setFridgeMuffled(muffled: boolean): void
  setMuted(muted: boolean): void
  /** Section 4.3. Pulls the room back while a memory has the screen. */
  setDucked(ducked: boolean): void
  /**
   * Section 8.1. The key in the lock, over the black. Returns how long it runs,
   * or 0 if the context is not up yet, so the opening can wait for it.
   */
  playKeyInLock(): number
  /**
   * Section 8.2. The charge finishing, from wherever the phone is rather than
   * from everywhere. The player should have to notice which room it came from.
   */
  playChime(room: RoomId): number
  /**
   * Section 5. The Low Orbit demo on his stereo, from where the stereo is.
   * Returns whether it is playing now, so the caller can track `record_playing`.
   */
  setDemoPlaying(playing: boolean, room: RoomId): boolean
  /** Section 8.3. One drawer. The scene fires these faster and then stops. */
  playDrawer(): number
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
  let ducked = false
  let noise: AudioBuffer | null = null
  let demo: Source | null = null

  const forward = new THREE.Vector3()
  const up = new THREE.Vector3()

  /** Mute wins over duck, so pausing inside a memory still goes quiet. */
  function level(): number {
    if (muted) return 0
    return ducked ? DUCK_LEVEL : 1
  }

  function rampTo(seconds: number): void {
    if (master === null || context === null) return
    master.gain.setTargetAtTime(level(), context.currentTime, seconds)
  }

  return {
    async start(): Promise<void> {
      if (context !== null) {
        if (context.state === 'suspended') await context.resume()
        return
      }

      const ctx = new AudioContext()
      context = ctx

      const out = ctx.createGain()
      out.gain.value = level()
      out.connect(ctx.destination)
      master = out

      noise = noiseBuffer(ctx)

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

    playKeyInLock(): number {
      if (context === null || master === null || noise === null) return 0
      // Louder than the ambience it plays over: the flat is silent, the screen is
      // black, and this is the only thing happening.
      return keyInLock(context, noise, master, 0.32)
    },

    playChime(room: RoomId): number {
      if (context === null || master === null) return 0

      const panner = context.createPanner()
      panner.panningModel = 'HRTF'
      panner.distanceModel = 'inverse'
      panner.refDistance = 1.5
      panner.maxDistance = 16
      panner.rolloffFactor = 1.1

      const at = centreOf(plan, room)
      panner.positionX.value = at.x
      panner.positionY.value = at.y
      panner.positionZ.value = at.z
      panner.connect(master)

      return chime(context, panner, CHIME_LEVEL)
    },

    setDemoPlaying(playing: boolean, room: RoomId): boolean {
      if (context === null || master === null || noise === null) return false

      if (!playing) {
        demo?.stop()
        demo = null
        return false
      }

      if (demo !== null) return true

      const song = createDemo(context, noise, DEMO_LEVEL)
      const panner = context.createPanner()
      panner.panningModel = 'HRTF'
      panner.distanceModel = 'inverse'
      panner.refDistance = 1.4
      panner.maxDistance = 14
      panner.rolloffFactor = 1.4

      const at = centreOf(plan, room)
      panner.positionX.value = at.x
      panner.positionY.value = at.y
      panner.positionZ.value = at.z

      song.output.connect(panner).connect(master)
      song.start()
      demo = song
      sources.push(song)
      return true
    },

    playDrawer(): number {
      if (context === null || master === null || noise === null) return 0
      return drawer(context, noise, master, DRAWER_LEVEL)
    },

    setFridgeMuffled(value: boolean): void {
      fridge?.setMuffled(value)
    },

    setMuted(value: boolean): void {
      muted = value
      rampTo(MUTE_RAMP)
    },

    setDucked(value: boolean): void {
      if (ducked === value) return
      ducked = value
      rampTo(value ? DUCK_DOWN_RAMP : DUCK_UP_RAMP)
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
      noise = null
      demo = null
      ducked = false
      fridge = null
      radiators = null
    },
  }
}

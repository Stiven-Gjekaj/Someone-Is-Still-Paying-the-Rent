/**
 * The lamps, one room at a time.
 *
 * The mood column in `data/rooms.json` is prose written for people, so it is not
 * parsed. Each rig below quotes the line it is trying to be, and that line is the
 * thing to argue with if a room looks wrong.
 *
 * Three uses physical units, so these intensities are candela and fall off with
 * the square of distance. A domestic bulb lands in single digits. Numbers that
 * look absurdly small next to pre-r155 Three code are correct here.
 */

import * as THREE from 'three'

import type { ActNumber, RoomId } from '../content/types.ts'

interface Lamp {
  room: RoomId
  /** Why this lamp exists, from the room's mood line. */
  note: string
  position: [number, number, number]
  color: number
  intensity: number
  distance: number
  shadow?: boolean
}

const LAMPS: Lamp[] = [
  {
    room: 'entry_hall',
    note: 'Dim. One warm bulb.',
    position: [4.0, 2.32, 6.2],
    color: 0xffc489,
    intensity: 3.4,
    distance: 6.5,
  },

  // "Lamplight in pools." Three sources, deliberately not reaching each other.
  {
    room: 'living_room',
    note: 'The desk lamp, left on over the paper.',
    position: [4.15, 1.02, 0.95],
    color: 0xffcf95,
    intensity: 1.9,
    distance: 3.4,
  },
  {
    room: 'living_room',
    note: 'The floor lamp by the sofa, which is the one you actually sit under.',
    position: [6.75, 1.62, 3.5],
    color: 0xffbe80,
    intensity: 6.5,
    distance: 7.0,
    shadow: true,
  },
  {
    room: 'living_room',
    note: 'A low spill across the vinyl, so the shelf is not a black slab.',
    position: [5.7, 1.45, 4.6],
    color: 0xffb877,
    intensity: 1.3,
    distance: 2.8,
  },

  {
    room: 'kitchen',
    note: 'Cold fluorescent until the player switches to the counter lamp.',
    position: [1.3, 2.42, 1.7],
    color: 0xd6e8ef,
    intensity: 5.5,
    distance: 6.0,
  },

  {
    room: 'bathroom',
    note: 'Small, honest light.',
    position: [1.3, 2.3, 4.3],
    color: 0xf4ecdc,
    intensity: 3.0,
    distance: 4.5,
  },

  {
    // The string lights are off until the player turns them on, so this is only
    // what falls out of the living room door and bounces off wet concrete. It
    // exists because Hard Rule 10 makes the balcony a place of warm memory, and a
    // balcony too dark to see the two chairs on cannot be that.
    room: 'balcony',
    note: 'String lights. They still work, but nobody has switched them on.',
    position: [6.2, 1.85, -0.15],
    color: 0xffc98d,
    intensity: 1.7,
    distance: 4.6,
  },

  {
    room: 'bedroom',
    note: 'The darkest room. Bedside lamp only.',
    position: [2.24, 0.86, 7.15],
    color: 0xffab63,
    intensity: 2.1,
    distance: 3.6,
    shadow: true,
  },
]

/**
 * Section 3, the lighting progression. Act 1 is the baseline the lamps above are
 * tuned against; the later acts pull it down and cool it off, and the dawn stage
 * is handled by the ending rather than here.
 */
const ACT_LEVELS: Record<number, number> = {
  1: 1.0,
  2: 0.82,
  3: 0.66,
}

export interface LightingRig {
  group: THREE.Group
  applyAct(act: ActNumber): void
  /**
   * Section 5. The string lights on the balcony, which are off until the player
   * turns them on and which nothing else in the flat depends on.
   *
   * A separate light from the balcony lamp on purpose. That one is what falls out
   * of the living room door and bounces off wet concrete; this one hangs on the
   * wire, where the bulbs are.
   */
  setStringLights(on: boolean): void
  dispose(): void
}

/**
 * Where the run of bulbs hangs, from `data/placement.json`: the south balcony
 * wall, 0.62 up from the surface anchor. Small and close, because six bulbs are
 * not a room light.
 */
const STRING_LIGHTS = {
  position: [6.2, 1.6, -0.06] as const,
  color: 0xffc98d,
  intensity: 2.6,
  distance: 3.4,
}

export function buildLighting(act: ActNumber): LightingRig {
  const group = new THREE.Group()
  group.name = 'lighting'

  // A cold, very low fill so the unlit corners are dark rather than pure black.
  // It is the city outside, not a light anyone switched on.
  const fill = new THREE.HemisphereLight(0x2c313a, 0x14100c, 0.38)
  group.add(fill)

  const lamps: { light: THREE.PointLight; base: number }[] = []

  for (const lamp of LAMPS) {
    const light = new THREE.PointLight(lamp.color, lamp.intensity, lamp.distance, 2)
    light.position.set(...lamp.position)
    light.name = `lamp:${lamp.room}`

    if (lamp.shadow === true) {
      // Point lights render six faces per shadow, so only the two lamps that
      // actually shape a room get one, and at a modest resolution.
      light.castShadow = true
      light.shadow.mapSize.set(512, 512)
      light.shadow.camera.near = 0.08
      light.shadow.camera.far = lamp.distance
      light.shadow.bias = -0.004
    }

    group.add(light)
    lamps.push({ light, base: lamp.intensity })
  }

  const string = new THREE.PointLight(
    STRING_LIGHTS.color,
    0,
    STRING_LIGHTS.distance,
    2,
  )
  string.position.set(...STRING_LIGHTS.position)
  string.name = 'lamp:string_lights'
  group.add(string)

  function applyAct(next: ActNumber): void {
    const level = ACT_LEVELS[next] ?? 1
    for (const lamp of lamps) lamp.light.intensity = lamp.base * level
    fill.intensity = 0.38 * level
  }

  applyAct(act)

  return {
    group,
    applyAct,

    setStringLights(on: boolean): void {
      string.intensity = on ? STRING_LIGHTS.intensity : 0
    },

    dispose(): void {
      string.dispose()
      for (const lamp of lamps) lamp.light.dispose()
      lamps.length = 0
      fill.dispose()
      group.clear()
    },
  }
}

/**
 * Rain on the windows, rain falling outside, and the city it falls through.
 *
 * It has been raining all night and it does not stop until the ending, so this
 * runs the whole game. Three parts:
 *
 *   the city    a cylinder around the flat, warm windows opposite
 *   the fall    points dropping outside the building, never inside it
 *   the glass   a scrolling streak sheet just outside each window
 *
 * There is no street surface and no drop anywhere in here. From the balcony,
 * looking down finds the warm haze at the bottom of the backdrop, which is
 * Hard Rule 10 holding at the one place the camera could break it.
 */

import * as THREE from 'three'

import type { FloorPlan } from '../content/types.ts'
import { cityTexture, rainStreakTexture } from './textures.ts'

export interface Weather {
  group: THREE.Group
  update(delta: number): void
  dispose(): void
}

const DROP_COUNT = 2600
const FALL_SPEED = 7.5
const VOLUME_MARGIN = 9
const VOLUME_TOP = 13
const VOLUME_BOTTOM = -3

export function buildWeather(plan: FloorPlan): Weather {
  const group = new THREE.Group()
  group.name = 'weather'

  const owned: { dispose(): void }[] = []

  // Where the flat sits, so rain can be kept out of it.
  let minX = Infinity
  let minZ = Infinity
  let maxX = -Infinity
  let maxZ = -Infinity
  for (const room of plan.rooms) {
    minX = Math.min(minX, room.min[0])
    minZ = Math.min(minZ, room.min[1])
    maxX = Math.max(maxX, room.max[0])
    maxZ = Math.max(maxZ, room.max[1])
  }
  const centreX = (minX + maxX) / 2
  const centreZ = (minZ + maxZ) / 2

  // Indoor rooms only. Rain on the balcony is the point.
  const indoors = plan.rooms.filter((room) => room.outdoor !== true)

  // The city.
  const city = cityTexture()
  city.repeat.set(3, 1)
  owned.push(city)

  const skyGeometry = new THREE.CylinderGeometry(30, 30, 26, 48, 1, true)
  const skyMaterial = new THREE.MeshBasicMaterial({
    map: city,
    side: THREE.BackSide,
    fog: false,
  })
  owned.push(skyGeometry, skyMaterial)

  const sky = new THREE.Mesh(skyGeometry, skyMaterial)
  sky.position.set(centreX, 4, centreZ)
  sky.name = 'city'
  group.add(sky)

  // The fall.
  const positions = new Float32Array(DROP_COUNT * 3)
  const spans = new Float32Array(DROP_COUNT)

  const insideFlat = (x: number, z: number): boolean =>
    indoors.some(
      (room) => x > room.min[0] - 0.3 && x < room.max[0] + 0.3 && z > room.min[1] - 0.3 && z < room.max[1] + 0.3,
    )

  for (let i = 0; i < DROP_COUNT; i += 1) {
    let x = 0
    let z = 0
    // Drops never move sideways, so rejecting once at birth keeps them out of
    // the flat for good.
    for (let attempt = 0; attempt < 24; attempt += 1) {
      x = minX - VOLUME_MARGIN + Math.random() * (maxX - minX + VOLUME_MARGIN * 2)
      z = minZ - VOLUME_MARGIN + Math.random() * (maxZ - minZ + VOLUME_MARGIN * 2)
      if (!insideFlat(x, z)) break
    }

    positions[i * 3] = x
    positions[i * 3 + 1] = VOLUME_BOTTOM + Math.random() * (VOLUME_TOP - VOLUME_BOTTOM)
    positions[i * 3 + 2] = z
    spans[i] = 0.85 + Math.random() * 0.5
  }

  const dropGeometry = new THREE.BufferGeometry()
  dropGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  owned.push(dropGeometry)

  const dropMaterial = new THREE.PointsMaterial({
    color: 0x9fb4c4,
    size: 0.035,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    fog: false,
  })
  owned.push(dropMaterial)

  const drops = new THREE.Points(dropGeometry, dropMaterial)
  drops.frustumCulled = false
  drops.name = 'rainfall'
  group.add(drops)

  // The glass.
  const streaks = rainStreakTexture()
  streaks.repeat.set(1.6, 1.2)
  owned.push(streaks)

  const streakMaterial = new THREE.MeshBasicMaterial({
    map: streaks,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    fog: false,
  })
  owned.push(streakMaterial)

  for (const w of plan.windows) {
    const room = plan.rooms.find((r) => r.id === w.room)
    if (room === undefined) continue

    const alongX = w.wall === 'north' || w.wall === 'south'
    const at = w.wall === 'north' ? room.min[1] : w.wall === 'south' ? room.max[1] : w.wall === 'west' ? room.min[0] : room.max[0]

    // Just outside the pane, so it reads as water on the far side of the glass.
    const outward = 0.02
    const push = w.wall === 'north' ? -outward : w.wall === 'south' ? outward : 0
    const pushX = w.wall === 'west' ? -outward : w.wall === 'east' ? outward : 0

    const geometry = new THREE.PlaneGeometry(w.width, w.height)
    owned.push(geometry)

    const sheet = new THREE.Mesh(geometry, streakMaterial)
    sheet.rotation.y = w.wall === 'north' ? 0 : w.wall === 'south' ? Math.PI : w.wall === 'west' ? Math.PI / 2 : -Math.PI / 2
    sheet.position.set(
      alongX ? w.centre : at + pushX,
      w.sill + w.height / 2,
      alongX ? at + push : w.centre,
    )
    sheet.name = `rain:${w.room}:${w.wall}`
    group.add(sheet)
  }

  const attribute = dropGeometry.getAttribute('position') as THREE.BufferAttribute

  return {
    group,

    update(delta: number): void {
      const array = attribute.array as Float32Array
      for (let i = 0; i < DROP_COUNT; i += 1) {
        const index = i * 3 + 1
        const fallen = (array[index] ?? 0) - FALL_SPEED * (spans[i] ?? 1) * delta
        array[index] = fallen < VOLUME_BOTTOM ? VOLUME_TOP : fallen
      }
      attribute.needsUpdate = true

      // The sheet on the glass runs faster than the drops behind it, which is
      // what selling "this is on the near surface" takes.
      streaks.offset.y -= delta * 0.55
      streaks.offset.x = Math.sin(streaks.offset.y * 0.7) * 0.01
    },

    dispose(): void {
      for (const item of owned) item.dispose()
      owned.length = 0
      group.clear()
    },
  }
}

import './styles.css'
import * as THREE from 'three'
import { renderAdvisory } from './advisory.ts'
import { getFloorPlan } from './content/index.ts'
import { createEngine } from './core/engine.ts'
import { createMaterials } from './world/materials.ts'
import { buildFlat } from './world/flat.ts'
import type { RoomId } from './content/types.ts'

/**
 * Dev aid. `?room=kitchen` starts the camera in the middle of that room instead
 * of at the front door, which is how the rooms get screenshotted without needing
 * pointer lock in a headless browser. Unknown values fall back to the spawn.
 */
function requestedRoom(): RoomId | null {
  const asked = new URLSearchParams(window.location.search).get('room')
  if (asked === null) return null

  const plan = getFloorPlan()
  return plan.rooms.some((room) => room.id === asked) ? (asked as RoomId) : null
}

function enterFlat(mount: HTMLElement): void {
  mount.replaceChildren()

  const plan = getFloorPlan()
  const engine = createEngine(mount)
  const materials = createMaterials()
  const flat = buildFlat(plan, materials)
  engine.scene.add(flat.group)

  const room = requestedRoom()
  const rect = room === null ? undefined : plan.rooms.find((r) => r.id === room)

  if (rect === undefined) {
    engine.camera.position.set(plan.spawn.position[0], plan.eye_height, plan.spawn.position[1])
    engine.camera.rotation.y = plan.spawn.facing
  } else {
    engine.camera.position.set(
      (rect.min[0] + rect.max[0]) / 2,
      plan.eye_height,
      (rect.min[1] + rect.max[1]) / 2,
    )
  }

  // Placeholder light so the geometry is legible before the lighting rig lands.
  engine.scene.add(new THREE.HemisphereLight(0xb9a888, 0x2a2622, 1.4))

  engine.start(() => {})
}

function showAdvisory(mount: HTMLElement): void {
  renderAdvisory(mount)

  const begin = document.createElement('button')
  begin.className = 'begin'
  begin.type = 'button'
  begin.textContent = 'Begin'
  begin.addEventListener('click', () => enterFlat(mount))
  mount.append(begin)
}

const app = document.getElementById('app')

if (app === null) {
  throw new Error('#app is missing from index.html')
}

showAdvisory(app)

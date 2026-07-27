/**
 * One sitting in the flat.
 *
 * Owns the state, the world, the player, and the frame callback, and knows how
 * to take all of it down again. Everything that used to live in `main.ts` is
 * here, so that main is only ever responsible for the three screens before the
 * front door: the advisory, the title, and handing over.
 *
 * `dispose` matters more than it looks. Resuming a checkpoint means throwing a
 * session away and building another one, and a session that leaks its listeners
 * and its GPU buffers makes that unusable after the second try.
 */

import { content, getFurniture, getPlacements, getScenes, getText } from '../content/index.ts'
import { createInitialState } from '../content/flags.ts'
import { createEngine } from '../core/engine.ts'
import { createMaterials } from '../world/materials.ts'
import { buildFlat } from '../world/flat.ts'
import { buildFurniture } from '../world/furniture.ts'
import { createPropFactory } from '../world/props.ts'
import { placeObjects } from '../world/placement.ts'
import { buildLighting } from '../world/lighting.ts'
import { buildWeather } from '../world/rain.ts'
import { createPlayer } from '../player/controller.ts'
import { createCollider } from '../player/collision.ts'
import { createHud } from '../ui/hud.ts'
import { createGoalLine } from '../ui/goal.ts'
import { createOverlay } from '../ui/overlay.ts'
import { createMenu } from '../ui/menu.ts'
import { renderDocument } from '../ui/document.ts'
import { createTargeting, documentReadable, verbFor } from '../interaction/targeting.ts'
import { createHighlight } from '../interaction/highlight.ts'
import { createAudio } from '../audio/audio.ts'
import { markExamined, resolveExamine } from '../rules/secondlook.ts'
import { loadSettings, saveSettings, type Settings } from '../settings.ts'
import type { ActNumber, FloorPlan, RoomId } from '../content/types.ts'

export interface SessionConfig {
  plan: FloorPlan
  act: ActNumber
  /** Dev aids, resolved by the caller. See the README. */
  view?: {
    room?: RoomId
    yaw?: number
    pitch?: number
  }
  /**
   * Set when the URL carried any dev parameter. Attaches a handle to the canvas
   * so a headless pass can aim the camera and read the state without reloading
   * the world for every angle. Absent in a normal session.
   */
  dev?: boolean
}

export interface Session {
  dispose(): void
}

export function startSession(mount: HTMLElement, config: SessionConfig): Session {
  const { plan, act } = config

  mount.replaceChildren()

  const engine = createEngine(mount)
  const materials = createMaterials()

  const flat = buildFlat(plan, materials)
  engine.scene.add(flat.group)

  const furnishings = buildFurniture(plan, getFurniture(), materials)
  engine.scene.add(furnishings.group)

  const props = createPropFactory(materials)
  const placed = placeObjects(getPlacements(), furnishings.surfaces, props, content.objects, act)
  engine.scene.add(placed.group)

  // Say plainly what is not in the room. A flat quietly missing sixteen objects
  // looks identical to a flat where placement silently failed.
  console.info(
    `act ${act}: ${placed.byObject.size} objects placed, ${placed.deferred.length} held back for later acts`,
  )

  const lighting = buildLighting(act)
  engine.scene.add(lighting.group)

  const weather = buildWeather(plan)
  engine.scene.add(weather.group)

  const collider = createCollider(plan, getFurniture())
  const player = createPlayer(engine.camera, engine.renderer.domElement, plan, { collider })

  const hud = createHud(mount)
  const goalLine = createGoalLine(mount, getScenes().goals)
  const overlay = createOverlay(mount)
  const menu = createMenu(mount)
  const targeting = createTargeting(engine.camera, [placed.group, furnishings.group], content.objects)
  const highlight = createHighlight()

  const audio = createAudio(plan)
  void audio.start()

  const state = createInitialState()
  state.act = act
  goalLine.refresh(state)

  // Dev camera placement, applied after the player has taken its spawn.
  const view = config.view
  const rect = view?.room === undefined ? undefined : plan.rooms.find((r) => r.id === view.room)

  if (rect !== undefined) {
    engine.camera.position.set(
      (rect.min[0] + rect.max[0]) / 2,
      plan.eye_height,
      (rect.min[1] + rect.max[1]) / 2,
    )
  }

  const yaw = view?.yaw ?? 0
  const pitch = view?.pitch ?? 0

  if (yaw !== 0 || pitch !== 0) {
    engine.camera.rotation.order = 'YXZ'
    engine.camera.rotation.y = (yaw * Math.PI) / 180
    engine.camera.rotation.x = (pitch * Math.PI) / 180
  }

  let settings = loadSettings()

  function applySettings(next: Settings): void {
    settings = next
    saveSettings(next)
    player.setHeadBob(next.headBob)
    player.setSensitivity(next.sensitivity)
    engine.setFieldOfView(next.fieldOfView)
  }

  applySettings(settings)

  function showPause(): void {
    hud.setVisible(false)
    menu.showPause([
      {
        label: 'Resume',
        onSelect: (): void => {
          menu.close()
          player.lock()
        },
      },
      {
        label: 'Comfort',
        onSelect: (): void => menu.showComfort(settings, applySettings, showPause),
      },
      {
        // Hard Rule 9. Always reachable, from anywhere, without unloading the flat.
        label: 'Support resources',
        onSelect: (): void => menu.showResources(showPause),
      },
    ])
  }

  // Escape releases the pointer, and the browser owns that key, so the pause menu
  // hangs off the unlock rather than off a key handler that could be missed.
  player.onLockChange((locked) => {
    if (locked) {
      menu.close()
      hud.setVisible(true)
      goalLine.setVisible(true)
      return
    }
    goalLine.setVisible(false)
    // The overlay unlocks on purpose when a document opens. That is not a pause.
    if (overlay.isOpen()) return
    showPause()
  })

  overlay.onClose(() => {
    hud.setVisible(true)
    goalLine.setVisible(true)
    if (!player.isLocked()) player.lock()
  })

  function interact(): void {
    const target = targeting.current()
    if (target === null || overlay.isOpen()) return

    const reading = resolveExamine(target.object, state)
    markExamined(state, target.id, reading.secondLook)

    // Section 4.5. Finding the phone is what sets the goal for the rest of the
    // night, and finding it is just examining it.
    if (target.id === 'phone_dead') state.phone_found = true
    goalLine.refresh(state)

    // Section 5. He wedged a folded towel under the front left corner and it
    // worked. You just never noticed the quiet until you looked at it.
    if (target.id === 'fridge_towel') audio.setFridgeMuffled(true)

    hud.setVisible(false)
    goalLine.setVisible(false)
    player.unlock()

    // A readable opens its document, if this act is allowed to read it. The dead
    // phone is the reason for the second half of that sentence.
    const keystone = documentReadable(target.object, state.act) && target.object.text !== undefined
      ? getText(target.object.text)
      : undefined

    if (keystone === undefined) {
      overlay.showExamine(reading.text, reading.secondLook)
    } else {
      overlay.showDocument(keystone.title, renderDocument(keystone))
    }
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (event.code === 'KeyE' && !overlay.isOpen()) interact()
  }

  function onCanvasClick(): void {
    if (player.isLocked()) interact()
    else player.lock()
  }

  if (config.dev === true) {
    Object.assign(engine.renderer.domElement, { __dev: { camera: engine.camera, state, targeting } })
  }

  window.addEventListener('keydown', onKeyDown)
  engine.renderer.domElement.addEventListener('click', onCanvasClick)

  engine.start((delta) => {
    if (player.isLocked()) player.update(delta)
    weather.update(delta)
    audio.update(delta, engine.camera)

    const target = targeting.update()
    highlight.set(target === null ? null : target.owner)

    if (target === null) hud.setPrompt(null)
    else hud.setPrompt(verbFor(target.object, state.act), target.object.name)
  })

  return {
    dispose(): void {
      window.removeEventListener('keydown', onKeyDown)
      engine.renderer.domElement.removeEventListener('click', onCanvasClick)

      engine.stop()
      player.dispose()
      audio.dispose()

      highlight.dispose()
      overlay.dispose()
      menu.dispose()
      hud.dispose()
      goalLine.dispose()

      placed.dispose()
      props.dispose()
      weather.dispose()
      lighting.dispose()
      furnishings.dispose()
      flat.dispose()
      materials.dispose()

      engine.dispose()
    },
  }
}

import './styles.css'
import { renderAdvisory } from './advisory.ts'
import { createMenu } from './ui/menu.ts'
import { content, getFloorPlan, getFurniture, getPlacements, getText } from './content/index.ts'
import { createEngine } from './core/engine.ts'
import { createMaterials } from './world/materials.ts'
import { buildFlat } from './world/flat.ts'
import { buildFurniture } from './world/furniture.ts'
import { createPropFactory } from './world/props.ts'
import { buildLighting } from './world/lighting.ts'
import { buildWeather } from './world/rain.ts'
import { createPlayer } from './player/controller.ts'
import { createCollider } from './player/collision.ts'
import { createHud } from './ui/hud.ts'
import { createTargeting, verbFor } from './interaction/targeting.ts'
import { createHighlight } from './interaction/highlight.ts'
import { createOverlay } from './ui/overlay.ts'
import { createInitialState } from './content/flags.ts'
import { markExamined, resolveExamine } from './rules/secondlook.ts'
import { renderDocument } from './ui/document.ts'
import { createAudio } from './audio/audio.ts'
import { placeObjects } from './world/placement.ts'
import type { ActNumber, RoomId } from './content/types.ts'

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

/**
 * The flat is act 1, so only act 1 objects stand in it. `?act=2` spawns the later
 * ones for content review, which is the only reason to look at them before the
 * game gets there.
 */
function currentAct(): ActNumber {
  const asked = Number(new URLSearchParams(window.location.search).get('act') ?? '1')
  return asked === 2 ? 2 : asked === 3 ? 3 : 1
}

function enterFlat(mount: HTMLElement): void {
  mount.replaceChildren()

  const plan = getFloorPlan()
  const engine = createEngine(mount)
  const materials = createMaterials()
  const flat = buildFlat(plan, materials)
  engine.scene.add(flat.group)

  const furnishings = buildFurniture(plan, getFurniture(), materials)
  engine.scene.add(furnishings.group)

  const props = createPropFactory(materials)
  const placed = placeObjects(getPlacements(), furnishings.surfaces, props, content.objects, currentAct())
  engine.scene.add(placed.group)

  const collider = createCollider(plan, getFurniture())
  const player = createPlayer(engine.camera, engine.renderer.domElement, plan, { collider })

  // Clicking the flat takes the pointer. Escape gives it back, which the browser
  // handles for us and which Hard Rule 9 requires to always work.
  engine.renderer.domElement.addEventListener('click', () => {
    if (player.isLocked()) interact()
    else player.lock()
  })

  const room = requestedRoom()
  const rect = room === null ? undefined : plan.rooms.find((r) => r.id === room)

  if (rect !== undefined) {
    engine.camera.position.set(
      (rect.min[0] + rect.max[0]) / 2,
      plan.eye_height,
      (rect.min[1] + rect.max[1]) / 2,
    )
  }

  // `?yaw=180&pitch=-25` aims the camera, in degrees, with negative pitch looking
  // down. Pairs with `?room=` so a headless pass can inspect any wall or the
  // things standing on the floor without pointer lock.
  const search = new URLSearchParams(window.location.search)
  const yaw = Number(search.get('yaw') ?? '0')
  const pitch = Number(search.get('pitch') ?? '0')

  if (Number.isFinite(yaw) && Number.isFinite(pitch) && (yaw !== 0 || pitch !== 0)) {
    engine.camera.rotation.order = 'YXZ'
    engine.camera.rotation.y = (yaw * Math.PI) / 180
    engine.camera.rotation.x = (pitch * Math.PI) / 180
  }

  const lighting = buildLighting(currentAct())
  engine.scene.add(lighting.group)

  const weather = buildWeather(plan)
  engine.scene.add(weather.group)

  const hud = createHud(mount)
  const targeting = createTargeting(engine.camera, [placed.group, furnishings.group], content.objects)
  const highlight = createHighlight()
  const overlay = createOverlay(mount)
  const audio = createAudio(plan)
  void audio.start()
  const state = createInitialState()
  state.act = currentAct()

  const menu = createMenu(mount)

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
      return
    }
    // The overlay unlocks on purpose when a document opens. That is not a pause.
    if (overlay.isOpen()) return
    showPause()
  })

  overlay.onClose(() => {
    hud.setVisible(true)
    if (!player.isLocked()) player.lock()
  })

  function interact(): void {
    const target = targeting.current()
    if (target === null || overlay.isOpen()) return

    const reading = resolveExamine(target.object, state)
    markExamined(state, target.id, reading.secondLook)

    // Section 5. He wedged a folded towel under the front left corner and it
    // worked. You just never noticed the quiet until you looked at it.
    if (target.id === 'fridge_towel') audio.setFridgeMuffled(true)

    hud.setVisible(false)
    player.unlock()

    // A readable opens its document. Everything else is a thought you have while
    // standing in front of it.
    const keystone = target.object.text === undefined ? undefined : getText(target.object.text)

    if (keystone === undefined) {
      overlay.showExamine(reading.text, reading.secondLook)
    } else {
      overlay.showDocument(keystone.title, renderDocument(keystone))
    }
  }

  window.addEventListener('keydown', (event) => {
    if (event.code === 'KeyE' && !overlay.isOpen()) interact()
  })

  engine.start((delta) => {
    if (player.isLocked()) player.update(delta)
    weather.update(delta)
    audio.update(delta, engine.camera)

    const target = targeting.update()
    highlight.set(target === null ? null : target.owner)

    if (target === null) hud.setPrompt(null)
    else hud.setPrompt(verbFor(target.object), target.object.name)
  })
}

/**
 * Section 11 puts the advisory before the main menu, so the order is advisory,
 * then title, then the flat. Nobody reaches the front door without being told
 * what the game is first.
 */
function showAdvisory(mount: HTMLElement): void {
  renderAdvisory(mount)

  const onward = document.createElement('button')
  onward.className = 'begin'
  onward.type = 'button'
  onward.textContent = 'Continue'
  onward.addEventListener('click', () => showTitle(mount))
  mount.append(onward)
}

function showTitle(mount: HTMLElement): void {
  mount.replaceChildren()

  const menu = createMenu(mount)
  menu.showTitle([
    {
      label: 'Begin',
      onSelect: (): void => {
        menu.dispose()
        enterFlat(mount)
      },
    },
    {
      label: 'Read the advisory again',
      onSelect: (): void => {
        menu.dispose()
        showAdvisory(mount)
      },
    },
  ])
}

const app = document.getElementById('app')

if (app === null) {
  throw new Error('#app is missing from index.html')
}

showAdvisory(app)

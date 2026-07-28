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

import { content, getFragment, getFurniture, getPlacements, getScenes, getText } from '../content/index.ts'
import { createInitialState, type GameState } from '../content/flags.ts'
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
import { createFragmentPlayer } from '../ui/fragment.ts'
import { createOpening } from '../ui/opening.ts'
import { createMenu } from '../ui/menu.ts'
import { renderDocument } from '../ui/document.ts'
import { createTargeting } from '../interaction/targeting.ts'
import { createHighlight } from '../interaction/highlight.ts'
import { createAudio } from '../audio/audio.ts'
import { markExamined, resolveExamine } from '../rules/secondlook.ts'
import { documentReadable, verbFor } from '../rules/verbs.ts'
import { recordSort, sortDestinations, sortLabel } from '../rules/sorting.ts'
import { isRevealed, newlyRevealed } from '../rules/reveal.ts'
import { createCarry } from './carry.ts'
import { createActs } from './acts.ts'
import { writeCheckpoint } from './save.ts'
import { loadSettings, saveSettings, type Settings } from '../settings.ts'
import type {
  ActNumber,
  FloorPlan,
  Fragment,
  GameObject,
  RoomId,
  SortDestination,
} from '../content/types.ts'

export interface SessionConfig {
  plan: FloorPlan
  act: ActNumber
  /**
   * A restored checkpoint. The act comes from the state rather than from `act`,
   * and anything already put in a box is taken back out of the flat.
   */
  resume?: GameState
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
  const { plan } = config
  const state = config.resume ?? createInitialState()
  const act = config.resume?.act ?? config.act

  if (config.resume === undefined) state.act = act

  mount.replaceChildren()

  const engine = createEngine(mount)
  const materials = createMaterials()

  const flat = buildFlat(plan, materials)
  engine.scene.add(flat.group)

  const furnishings = buildFurniture(plan, getFurniture(), materials)
  engine.scene.add(furnishings.group)

  const props = createPropFactory(materials)

  const placed = placeObjects(
    getPlacements(),
    furnishings.surfaces,
    props,
    content.objects,
    (object) => isRevealed(object, state),
  )
  engine.scene.add(placed.group)

  // Anything already in a box stays in the box. Without this, resuming act 2
  // would put every sorted object back on its shelf and the count would no
  // longer describe the flat.
  for (const id of Object.keys(state.objects)) {
    if (state.objects[id]?.sorted_to == null) continue
    placed.byObject.get(id)?.removeFromParent()
    placed.byObject.delete(id)
  }

  // Say plainly what is not in the room. A flat quietly missing sixteen objects
  // looks identical to a flat where placement silently failed.
  console.info(
    `act ${act}: ${placed.byObject.size} objects placed, ${placed.deferred.length} not found yet`,
  )

  const lighting = buildLighting(act)
  engine.scene.add(lighting.group)

  const weather = buildWeather(plan)
  weather.applyAct(act)
  engine.scene.add(weather.group)

  const collider = createCollider(plan, getFurniture())
  const player = createPlayer(engine.camera, engine.renderer.domElement, plan, { collider })

  const hud = createHud(mount)
  const goalLine = createGoalLine(mount, getScenes().goals)
  const overlay = createOverlay(mount)
  const memories = createFragmentPlayer(mount)
  const opening = createOpening(mount, () => void audio.playKeyInLock())
  const menu = createMenu(mount)
  const targeting = createTargeting(engine.camera, [placed.group, furnishings.group], content.objects)
  const highlight = createHighlight()
  const carry = createCarry(engine.camera)

  const audio = createAudio(plan)
  void audio.start()

  // Owed by the object currently being looked at, and paid when its thought closes.
  let pendingFragment: Fragment | null = null
  goalLine.refresh(state)

  /**
   * Puts into the flat anything that has just become findable.
   *
   * Cheap enough to run after every state change, and it has to be: the act
   * turning over, a shoebox coming out from under the bed, and a record being
   * moved on a shelf all reveal things, and none of them knows about the others.
   */
  function revealPending(): void {
    for (const id of newlyRevealed(content.objects, state, placed.deferred)) {
      placed.reveal(id)
    }
  }

  const acts = createActs({
    acts: content.acts,
    state,
    onEnter: (next): void => {
      // Section 4.6. The night gets later, and the flat gets deeper: act 2's
      // middle layer arrives here, minus whatever is still inside something.
      lighting.applyAct(next)
      revealPending()
      weather.applyAct(next)
      goalLine.refresh(state)

      // Section 12. One checkpoint, written when an act begins. Not mid-act: the
      // decisions inside an act are supposed to stand.
      writeCheckpoint(state)
      console.info(`act ${next}`)
    },
  })

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
    // The overlay unlocks on purpose when a document opens, and so does a memory.
    // Neither is a pause, and neither is the opening, which nobody has started
    // playing yet.
    if (overlay.isOpen() || memories.isPlaying() || opening.isPlaying()) return
    showPause()
  })

  /**
   * Hands the flat back after an overlay or a memory.
   *
   * Not if the player has paused in the meantime. Escape out of a memory and
   * straight into the pause menu, and the memory's own release would arrive a
   * beat later and take the pointer back, closing the menu under them.
   */
  function release(): void {
    if (menu.isOpen()) return
    hud.setVisible(true)
    goalLine.setVisible(true)
    if (!player.isLocked()) player.lock()
  }

  overlay.onClose(() => {
    // Section 4.3. Object, then thought, then memory: closing the thought is what
    // lets the memory in, and only the first time.
    const owed = pendingFragment
    pendingFragment = null

    if (owed !== null) {
      audio.setDucked(true)
      memories.play(owed, () => {
        audio.setDucked(false)
        release()
      })
      return
    }

    release()
  })

  /**
   * The memory an object owes, if it owes one and this act has reached it.
   *
   * Three of the twelve are not reachable yet: F-08 and F-10 hang off objects
   * that appear in act 2 and F-12 off one that appears in act 3, so they are
   * built and simply never fire in act 1.
   */
  function fragmentFor(object: GameObject): Fragment | null {
    if (object.fragment === undefined) return null

    const fragment = getFragment(object.fragment)
    if (fragment === undefined || fragment.act > state.act) return null

    return fragment
  }

  function verbContext(id: string): { act: ActNumber; examined: boolean; carrying: boolean } {
    return {
      act: state.act,
      examined: state.objects[id]?.examined === true,
      carrying: carry.held() !== null,
    }
  }

  /** Lifts an examined sortable out of the world. Section 4.1. */
  function take(id: string): void {
    const node = placed.byObject.get(id)
    const object = content.objects.find((o) => o.id === id)
    if (node === undefined || object === undefined) return

    if (carry.take(id, object, node)) {
      highlight.set(null)
      hud.setCarrying(object.name)
    }
  }

  function putBack(): void {
    if (carry.putBack() === null) return
    hud.setCarrying(null)
  }

  /**
   * The object goes in the box and does not come out. Section 4.1 has no undo,
   * because the whole point of the mechanic is that the decision costs something.
   */
  function sortHeld(destination: SortDestination): void {
    const held = carry.release()
    if (held === null) return

    hud.setCarrying(null)
    recordSort(state, held.id, destination)
    goalLine.refresh(state)
    acts.check()
  }

  /**
   * Section 4.1. Three destinations, and the game holds no opinion about which.
   *
   * The choice is made here rather than by aiming at one of the three cartons,
   * so that nothing depends on how steady the player's hand is at the moment
   * they decide what to do with his coat.
   */
  function chooseDestination(): void {
    const held = carry.held()
    if (held === null) return

    hud.setVisible(false)
    goalLine.setVisible(false)
    player.unlock()

    overlay.showChoice(
      `${held.object.name}. Where does it go?`,
      sortDestinations().map((destination) => ({
        label: sortLabel(destination),
        onSelect: (): void => sortHeld(destination),
      })),
    )
  }

  function interact(): void {
    if (overlay.isOpen()) return

    const target = targeting.current()

    // Hands full. Only the boxes answer; anything else, and the object goes back
    // exactly where it was standing. Section 4.1 has no wrong answers, so it must
    // not be possible to lose one down the back of the mechanic.
    if (carry.held() !== null) {
      if (target !== null && target.object.sort_target === true) chooseDestination()
      else putBack()
      return
    }

    if (target === null) return

    if (verbFor(target.object, verbContext(target.id)) === 'Take') {
      take(target.id)
      return
    }

    // Read before markExamined, because "first look" is a fact about the state
    // just before this one.
    const firstLook = state.objects[target.id]?.examined !== true

    const reading = resolveExamine(target.object, state)
    markExamined(state, target.id, reading.secondLook)

    // Section 4.3. The memory is owed once, on the first look, and it is paid out
    // when the thought closes rather than on top of it.
    pendingFragment = firstLook ? fragmentFor(target.object) : null

    // Section 4.5. Finding the phone is what sets the goal for the rest of the
    // night, and finding it is just examining it.
    if (target.id === 'phone_dead') state.phone_found = true
    goalLine.refresh(state)

    // Section 5. He wedged a folded towel under the front left corner and it
    // worked. You just never noticed the quiet until you looked at it.
    if (target.id === 'fridge_towel') audio.setFridgeMuffled(true)

    // Section 4.5. Looking at something is the only thing that can open a gate
    // other than sorting, so this is the other place the act is checked.
    acts.check()

    // And the only thing that opens a shoebox or moves a record.
    revealPending()

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
    if (opening.isPlaying()) return

    // Hard Rule 9. Pausing normally hangs off the pointer unlock, which is the
    // right hook while the player is walking around. It is the wrong hook every
    // other time: a document, a chooser, and a memory all release the pointer on
    // purpose, so Escape during one of them produces no unlock event and there is
    // nothing to pause from.
    //
    // This listener is registered after the overlay's and the fragment player's,
    // so whichever of them consumed the key has already said so.
    if (event.key === 'Escape' && !event.defaultPrevented && !menu.isOpen()) {
      showPause()
      return
    }

    if (event.code === 'KeyE' && !overlay.isOpen()) interact()
  }

  function onCanvasClick(): void {
    if (opening.isPlaying()) return
    if (player.isLocked()) interact()
    else player.lock()
  }

  if (config.dev === true) {
    Object.assign(engine.renderer.domElement, {
      __dev: { camera: engine.camera, state, targeting, carry, overlay, memories, audio, acts, placed, weather, lighting, opening, interact },
    })
  }

  window.addEventListener('keydown', onKeyDown)
  engine.renderer.domElement.addEventListener('click', onCanvasClick)

  /**
   * Section 8.1. Only at the start of a night, and never when a dev parameter is
   * in the URL: a headless pass inspecting the flat should not have to sit
   * through the front door, and neither should somebody resuming act 2.
   */
  const titleCard = getScenes().scenes.find((scene) => scene.id === 'opening')?.title_card

  if (config.dev !== true && act === 1 && titleCard !== undefined) {
    hud.setVisible(false)
    goalLine.setVisible(false)
    opening.play(titleCard, () => {
      hud.setVisible(true)
      goalLine.setVisible(true)
    })
  }

  engine.start((delta) => {
    if (player.isLocked()) player.update(delta)
    weather.update(delta)
    audio.update(delta, engine.camera)

    const target = targeting.update()
    highlight.set(target === null ? null : target.owner)

    if (target === null) {
      hud.setPrompt(null)
      return
    }

    const verb = verbFor(target.object, verbContext(target.id))
    hud.setPrompt(verb, target.object.name)
  })

  return {
    dispose(): void {
      window.removeEventListener('keydown', onKeyDown)
      engine.renderer.domElement.removeEventListener('click', onCanvasClick)

      engine.stop()
      player.dispose()
      audio.dispose()

      // Before the props are disposed: a held object is parented to the camera,
      // and putting it back is what returns it to the group that owns it.
      carry.dispose()
      memories.dispose()
      opening.dispose()

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

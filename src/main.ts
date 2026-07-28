/**
 * Bootstrap and the three screens before the front door.
 *
 * Section 11 puts the advisory before the main menu, so the order is advisory,
 * then title, then the flat. Nobody reaches the front door without being told
 * what the game is first.
 *
 * Everything past that point belongs to the session. See src/game/session.ts.
 */

import './styles.css'
import { GAME_TITLE, element, renderAdvisory, renderResourceList } from './advisory.ts'
import { createMenu } from './ui/menu.ts'
import { content, getAdvisory, getFloorPlan } from './content/index.ts'
import { startSession, type Session, type SessionConfig } from './game/session.ts'
import { clearCheckpoint, readCheckpoint } from './game/save.ts'
import type { ActNumber, RoomId } from './content/types.ts'

/** Everything the flat currently contains, for dropping stale saved ids. */
const knownObjects = new Set(content.objects.map((object) => object.id))

/**
 * Dev aids, all documented in the README. `?room=` places the camera in the
 * middle of a room, `?yaw=` and `?pitch=` aim it, and `?act=` spawns the objects
 * belonging to later acts. They exist so the flat can be inspected in a headless
 * browser, which cannot take a pointer lock.
 */
function readConfig(): SessionConfig {
  const search = new URLSearchParams(window.location.search)
  const plan = getFloorPlan()

  const askedAct = Number(search.get('act') ?? '1')
  const act: ActNumber = askedAct === 2 ? 2 : askedAct === 3 ? 3 : 1

  const askedRoom = search.get('room')
  const room = askedRoom !== null && plan.rooms.some((r) => r.id === askedRoom)
    ? (askedRoom as RoomId)
    : undefined

  const yaw = Number(search.get('yaw') ?? '0')
  const pitch = Number(search.get('pitch') ?? '0')

  const dev = ['room', 'yaw', 'pitch', 'act'].some((key) => search.has(key))

  return {
    plan,
    act,
    ...(dev ? { dev } : {}),
    view: {
      ...(room === undefined ? {} : { room }),
      yaw: Number.isFinite(yaw) ? yaw : 0,
      pitch: Number.isFinite(pitch) ? pitch : 0,
    },
  }
}

/**
 * Section 11. Where the night lets go of the player.
 *
 * Not the pause menu's version of the resources, which sits over a flat that is
 * still there and offers a way back into it. This is a page, and the only thing
 * on it besides the support entries is the way back to the title.
 */
function showResources(mount: HTMLElement): void {
  const advisory = getAdvisory()

  mount.replaceChildren()
  mount.append(element('p', 'title', GAME_TITLE))

  const support = element('section', 'support is-ending')
  support.append(element('p', 'support-lead', advisory.lead_in))
  support.append(renderResourceList())
  mount.append(support)

  const onward = document.createElement('button')
  onward.className = 'begin'
  onward.type = 'button'
  onward.textContent = 'Back to the title'
  onward.addEventListener('click', () => showTitle(mount))
  mount.append(onward)
}

function showAdvisory(mount: HTMLElement): void {
  renderAdvisory(mount)

  const onward = document.createElement('button')
  onward.className = 'begin'
  onward.type = 'button'
  onward.textContent = 'Continue'
  onward.addEventListener('click', () => showTitle(mount))
  mount.append(onward)
}

/**
 * Starts a night and makes sure it is taken down when it finishes.
 *
 * The session owns a renderer, an audio context, and a handful of window
 * listeners. The ending replaces the whole page, so without this the flat would
 * carry on rendering into a canvas nobody can see, with the rain still running
 * underneath the support resources.
 */
function begin(mount: HTMLElement, extra: Partial<SessionConfig> = {}): void {
  let session: Session | null = null

  session = startSession(mount, {
    ...readConfig(),
    ...extra,
    onEnd: (): void => {
      session?.dispose()
      showResources(mount)
    },
  })
}

function showTitle(mount: HTMLElement): void {
  mount.replaceChildren()

  const menu = createMenu(mount)
  const saved = readCheckpoint(knownObjects)

  const items = [
    // Section 12. Continue comes first when there is something to continue, and
    // it says which act, because "Continue" alone tells a player nothing about
    // how much of a night they are about to walk back into.
    ...(saved === null
      ? []
      : [
          {
            label: `Continue from act ${saved.state.act}`,
            onSelect: (): void => {
              menu.dispose()
              begin(mount, { resume: saved.state })
            },
          },
        ]),
    {
      label: saved === null ? 'Begin' : 'Start again',
      onSelect: (): void => {
        menu.dispose()
        // Starting again means starting again. Leaving the old checkpoint in
        // place would offer to undo the decision on the next title screen.
        if (saved !== null) clearCheckpoint()
        begin(mount)
      },
    },
    {
      label: 'Read the advisory again',
      onSelect: (): void => {
        menu.dispose()
        showAdvisory(mount)
      },
    },
  ]

  menu.showTitle(items)
}

const app = document.getElementById('app')

if (app === null) {
  throw new Error('#app is missing from index.html')
}

showAdvisory(app)

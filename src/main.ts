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
import { renderAdvisory } from './advisory.ts'
import { createMenu } from './ui/menu.ts'
import { content, getFloorPlan } from './content/index.ts'
import { startSession, type SessionConfig } from './game/session.ts'
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
              startSession(mount, { ...readConfig(), resume: saved.state })
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
        startSession(mount, readConfig())
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

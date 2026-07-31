/**
 * How to drive the game, in one place.
 *
 * The fifty-seven verification scripts this suite came from each re-invented
 * `state()`, `hold()`, `press()` and `pack()`, with small differences between
 * copies. That duplication, not the scripts themselves, is why a harness rots:
 * a change to the HUD means finding every copy, and the one that gets missed
 * fails a week later for a reason nobody can read.
 *
 * ## Two rules this module exists to enforce
 *
 * **Nothing waits for a duration.** Headless Chromium on a software rasteriser
 * renders at about two frames a second, and the engine clamps `delta` to 0.1s so
 * a stalled tab cannot teleport anybody. Wall-clock and game time therefore come
 * apart by roughly five to one, and any number tuned against one machine is a
 * coin flip on another. Every wait below is `waitForFunction` on something the
 * page can be asked about. Where a check needs elapsed *game* time it winds the
 * clock through the dev handle instead of sleeping.
 *
 * **Nothing touches the mouse.** Not because the mouse is untested elsewhere,
 * but because a driver that cannot use one is a driver that proves the keyboard
 * path on every single check rather than only in `access.test.ts`. Section 4.2
 * says aiming is the only verb the game has, and `Tab` is how it is done without
 * a pointer.
 *
 * ## What it leans on
 *
 * `canvas.__dev`, which `src/game/session.ts` exposes when any dev parameter is
 * present. That handle used to be a console convenience. It is now load-bearing
 * for this suite, which is why `opening.test.ts` asserts its shape: losing a
 * field from it should fail with one clear message rather than twelve timeouts.
 *
 * ## One sharp edge in `dev()`
 *
 * The callback is serialised and rebuilt inside the page, which is the only way
 * to hand it the handle. **It therefore cannot close over anything.** Everything
 * it needs comes in through the second argument. A callback that reads an outer
 * variable throws `ReferenceError: x is not defined` from the page rather than
 * failing at compile time, so the error is loud but it points at the browser
 * instead of at the line that wrote it.
 */

import { readFileSync } from 'node:fs'

import type { Browser, Page } from 'playwright-core'

import { newPage } from './browser.ts'

interface Rect {
  id: string
  min: [number, number]
  max: [number, number]
}

const PLAN = JSON.parse(readFileSync(new URL('../data/floorplan.json', import.meta.url), 'utf8')) as {
  eye_height: number
  rooms: Rect[]
}

/** How long any single wait may take before it is called a failure. */
const PATIENCE = 30_000

/** What the screen says, as one round trip rather than eight. */
export interface Snapshot {
  prompt: string
  promptShown: boolean
  carrying: string
  goal: string
  overlay: boolean
  overlayText: string
  chooser: boolean
  menu: boolean
  hudHidden: boolean
  opening: boolean
  /** Every line any beat announcer has spoken, in order. */
  announced: string[]
}

export interface Driver {
  page: Page
  /** Anything the page threw. Asserted empty at the end of every check. */
  errors: string[]
  /** The advisory and the title screen, by keyboard. Leaves you in the flat. */
  begin(): Promise<void>
  state(): Promise<Snapshot>
  /** Runs `fn` in the page with the dev handle as its first argument. */
  dev<T, A = undefined>(fn: (handle: DevHandle, arg: A) => T, arg?: A): Promise<T>
  /**
   * Waits for `fn` to hold in the page. Never waits for a duration.
   *
   * `patience` is a deadline rather than a sleep: it is how long to allow before
   * calling something broken. The default suits anything the player triggers.
   * Section 8.4's ending plays for about half a minute on its own schedule, so
   * that one wait asks for more.
   */
  until(fn: string, what: string, patience?: number): Promise<void>
  /** Stands in the middle of a room. */
  moveTo(room: string): Promise<void>
  /**
   * Points the camera at an object, from up to nine standing positions.
   *
   * The nine rather than the room centre is not caution, it is a bug this
   * project has already been caught by: a centre-only scan reported the kitchen
   * junk drawer unreachable, and a nine-position scan found it from ninety of a
   * hundred spots. A harness that measures from one place measures its own
   * choice of place.
   */
  aimAt(id: string, room?: string): Promise<boolean>
  /** Aims, then presses the context action. Section 4.2. */
  lookAt(id: string, room?: string): Promise<boolean>
  /**
   * Closes whatever is on screen without waiting for anything.
   *
   * Separate from `settle` because the flat does not always come back. Closing
   * the rent receipts is the last thing act 3 needs, so the night ends on that
   * keypress and the HUD never returns: waiting for it would wait forever.
   */
  dismiss(): Promise<void>
  /** Closes whatever beat is on screen and waits for the flat to come back. */
  settle(): Promise<void>
  /** What is in the player's hands, by id. */
  held(): Promise<string | null>
  /** Takes something to the boxes and puts it in one. Section 4.1. */
  pack(id: string, room: string, box?: 1 | 2 | 3): Promise<boolean>
  /** Every flag the session is holding. */
  flags(): Promise<Record<string, unknown>>
  /**
   * Opens the pause menu, and says how many keys it took.
   *
   * Escape backs out one level at a time: from inside a memory or a document the
   * first press ends that and the second pauses. So the count is the thing worth
   * measuring rather than hiding, because Hard Rule 9's promise is that pausing
   * is always available and the ending is built on it being two keys away at
   * every point. A state that needed four would still "work" and would still be
   * a broken promise.
   */
  pause(): Promise<number>
  /** Hard Rule 9. Opens the pause menu and reads the support panel. */
  resources(): Promise<string>
  /** Presses a labelled button by tabbing to it. Returns false if not found. */
  press(label: string): Promise<boolean>
  close(): Promise<void>
}

/** Only the parts of `canvas.__dev` this suite uses. */
export interface DevHandle {
  camera: { position: { set(x: number, y: number, z: number): void }, rotation: { order: string, x: number, y: number }, updateMatrixWorld(force: boolean): void }
  targeting: { update(): { id: string } | null, candidates(): { id: string, at: { x: number, z: number } }[] }
  state: Record<string, unknown>
  carry: { held(): { id: string } | null }
  overlay: { close(): void, isOpen(): boolean }
  memories: { isPlaying(): boolean, skip(): void }
  interact(): void
  [key: string]: unknown
}

function rectOf(room: string): Rect | undefined {
  return PLAN.rooms.find((r) => r.id === room)
}

/** Nine standing positions in a room, inset from the walls. */
function standingSpots(room: string | undefined): ([number, number, number] | null)[] {
  const rect = room === undefined ? undefined : rectOf(room)
  if (rect === undefined) return [null]

  const spots: [number, number, number][] = []
  for (const fx of [0.28, 0.5, 0.72]) {
    for (const fz of [0.28, 0.5, 0.72]) {
      spots.push([
        rect.min[0] + (rect.max[0] - rect.min[0]) * fx,
        PLAN.eye_height,
        rect.min[1] + (rect.max[1] - rect.min[1]) * fz,
      ])
    }
  }
  return spots
}

/** The url for a given start, with the dev parameters this suite needs. */
export function at(base: string, params: Record<string, string | number> = {}): string {
  const url = new URL(base)
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value))
  return url.href
}

interface Aim {
  spot: [number, number, number]
  yaw: number
  pitch: number
}

export async function open(browser: Browser, url: string): Promise<Driver> {
  const { page, errors } = await newPage(browser)
  await page.goto(url, { waitUntil: 'networkidle' })

  /** Where each object was last found from. See `aimAt`. */
  const aimed = new Map<string, Aim>()

  const driver: Driver = {
    page,
    errors,

    async until(fn: string, what: string, patience: number = PATIENCE): Promise<void> {
      try {
        await page.waitForFunction(fn, null, { timeout: patience })
      } catch {
        throw new Error(`timed out after ${patience / 1000}s waiting for ${what}`)
      }
    },

    async press(label: string): Promise<boolean> {
      // Tabbing rather than clicking, so every check exercises the keyboard.
      for (let i = 0; i < 30; i += 1) {
        const on = await page.evaluate(() => document.activeElement?.textContent ?? '')
        if (on.trim() === label) {
          await page.keyboard.press('Enter')
          return true
        }
        await page.keyboard.press('Tab')
      }
      return false
    },

    async begin(): Promise<void> {
      await driver.until(
        '[...document.querySelectorAll("button")].some((b) => b.textContent?.trim() === "Continue")',
        'the advisory',
      )
      if (!await driver.press('Continue')) throw new Error('the advisory has no Continue button')

      await driver.until(
        '[...document.querySelectorAll("button")].some((b) => b.textContent?.trim() === "Begin")',
        'the title screen',
      )
      if (!await driver.press('Begin')) throw new Error('the title screen has no Begin button')

      await driver.until('document.querySelector("canvas") !== null', 'the flat to be built')
    },

    state(): Promise<Snapshot> {
      return page.evaluate(() => {
        const text = (selector: string): string =>
          (document.querySelector(selector)?.textContent ?? '').trim()
        const has = (selector: string, cls: string): boolean =>
          document.querySelector(selector)?.classList.contains(cls) ?? false

        return {
          prompt: text('.prompt'),
          promptShown: has('.prompt', 'is-visible'),
          carrying: text('.carrying-name'),
          goal: text('.goal'),
          overlay: has('.overlay', 'is-open'),
          overlayText: text('.overlay-panel'),
          chooser: has('.overlay', 'is-choose'),
          menu: has('.menu', 'is-open'),
          hudHidden: has('.hud', 'is-hidden'),
          opening: has('.opening', 'is-open'),
          announced: [...document.querySelectorAll('.beat-announcer')]
            .flatMap((region) => [...region.children].map((line) => line.textContent ?? ''))
            .filter((line) => line.trim() !== ''),
        }
      })
    },

    dev<T, A = undefined>(fn: (handle: DevHandle, arg: A) => T, arg?: A): Promise<T> {
      return page.evaluate(
        ({ source, value }) => {
          const handle = (document.querySelector('canvas') as unknown as { __dev?: unknown } | null)?.__dev
          if (handle === undefined || handle === null) {
            throw new Error('no dev handle: the page needs a dev parameter such as ?room=')
          }
          return (new Function(`return (${source})`)() as (h: unknown, a: unknown) => T)(handle, value)
        },
        { source: fn.toString(), value: (arg ?? null) as A },
      )
    },

    moveTo(room: string): Promise<void> {
      const rect = rectOf(room)
      if (rect === undefined) throw new Error(`no room called ${room}`)
      const at: [number, number, number] = [
        (rect.min[0] + rect.max[0]) / 2,
        PLAN.eye_height,
        (rect.min[1] + rect.max[1]) / 2,
      ]
      return driver.dev((dev, spot) => {
        dev.camera.position.set(spot[0], spot[1], spot[2])
        dev.camera.updateMatrixWorld(true)
      }, at)
    },

    async aimAt(id: string, room?: string): Promise<boolean> {
      // An angle that worked once usually works again, and the suite aims at the
      // same handful of objects over and over: `pack` alone aims at its object
      // twice and at the boxes once. Trying the remembered angle first turns a
      // thirty-six-thousand-orientation sweep into a single raycast.
      //
      // It is re-verified rather than trusted, because objects are revealed,
      // packed and taken away underneath it.
      const known = aimed.get(id)
      if (known !== undefined) {
        const still = await driver.dev((dev, arg) => {
          dev.camera.position.set(arg.spot[0], arg.spot[1], arg.spot[2])
          dev.camera.rotation.order = 'YXZ'
          dev.camera.rotation.y = arg.yaw
          dev.camera.rotation.x = arg.pitch
          dev.camera.updateMatrixWorld(true)
          return dev.targeting.update()?.id === arg.id
        }, { ...known, id })
        if (still) return true
        aimed.delete(id)
      }

      for (const spot of standingSpots(room)) {
        // The whole sweep happens in the page. Thirty-six thousand round trips
        // would take longer than the rest of the suite put together.
        const found = await driver.dev((dev, arg) => {
          const { id, spot } = arg
          const here: [number, number, number] = spot ?? [
            dev.camera.position.x, dev.camera.position.y, dev.camera.position.z,
          ]
          dev.camera.position.set(here[0], here[1], here[2])

          for (let yaw = 0; yaw < 360; yaw += 1) {
            for (let pitch = -75; pitch <= 25; pitch += 1) {
              dev.camera.rotation.order = 'YXZ'
              dev.camera.rotation.y = (yaw * Math.PI) / 180
              dev.camera.rotation.x = (pitch * Math.PI) / 180
              dev.camera.updateMatrixWorld(true)
              const target = dev.targeting.update()
              if (target !== null && target.id === id) {
                return { spot: here, yaw: dev.camera.rotation.y, pitch: dev.camera.rotation.x }
              }
            }
          }
          return null
        }, { id, spot })

        if (found !== null) {
          aimed.set(id, found)
          return true
        }
      }
      return false
    },

    async lookAt(id: string, room?: string): Promise<boolean> {
      if (!await driver.aimAt(id, room)) return false
      await driver.dev((dev) => { dev.interact() })
      return true
    },

    async dismiss(): Promise<void> {
      await driver.dev((dev) => {
        dev.overlay.close()
        if (dev.memories.isPlaying()) dev.memories.skip()
      })
    },

    async settle(): Promise<void> {
      await driver.dismiss()
      // Not a duration. The flat is back when nothing is over it and the HUD has
      // returned, and every one of those is a question the page can answer.
      await driver.until(
        'document.querySelector(".overlay")?.classList.contains("is-open") !== true'
        + ' && document.querySelector(".hud")?.classList.contains("is-hidden") !== true'
        + ' && document.querySelector("canvas").__dev.memories.isPlaying() === false',
        'the flat to come back after a beat',
      )
    },

    held(): Promise<string | null> {
      return driver.dev((dev) => dev.carry.held()?.id ?? null)
    },

    async pack(id: string, room: string, box: 1 | 2 | 3 = 1): Promise<boolean> {
      // Twice, because the verb table offers Examine before Take on anything
      // that has not been looked at yet. Section 4.2, and it is the rule rather
      // than an inconvenience.
      if (!await driver.lookAt(id, room)) return false
      await driver.settle()

      // Aim without acting first, so an object that can never be taken says so
      // now instead of thirty seconds from now. The first version of this waited
      // for a hand that was never going to fill and then reported a timeout,
      // which named the symptom and hid the cause: the object was not sortable.
      if (!await driver.aimAt(id, room)) return false
      const ready = await driver.state()
      if (!ready.prompt.startsWith('Take')) {
        throw new Error(
          `${id} cannot be packed: with it under the crosshair the prompt reads `
          + `${JSON.stringify(ready.prompt)} rather than Take. Section 4.1 only lets `
          + 'sortable objects into a box, so check `sortable` in data/objects.json.',
        )
      }

      await driver.dev((dev) => { dev.interact() })
      await driver.until(
        'document.querySelector("canvas").__dev.carry.held() !== null',
        `${id} to be in hand`,
      )

      if (!await driver.lookAt('sorting_boxes', 'living_room')) return false
      await driver.until(
        'document.querySelector(".overlay")?.classList.contains("is-choose") === true',
        'the sorting chooser',
      )

      await driver.page.keyboard.press(String(box))
      await driver.until(
        'document.querySelector("canvas").__dev.carry.held() === null',
        `${id} to leave the player's hands`,
      )
      return true
    },

    flags(): Promise<Record<string, unknown>> {
      return driver.dev((dev) => JSON.parse(JSON.stringify(dev.state)) as Record<string, unknown>)
    },

    async pause(): Promise<number> {
      const isOpen = async (): Promise<boolean> => (await driver.state()).menu

      for (let presses = 0; presses <= 4; presses += 1) {
        if (await isOpen()) return presses
        await page.keyboard.press('Escape')
      }

      throw new Error(
        'the pause menu did not open after four presses of Escape. Hard Rule 9 says a '
        + 'pause affordance is always available.',
      )
    },

    async resources(): Promise<string> {
      await driver.pause()
      if (!await driver.press('Support resources')) {
        throw new Error('the pause menu does not offer Support resources')
      }
      await driver.until(
        '(document.querySelector(".menu-panel")?.textContent ?? "").toLowerCase().includes("helpline")',
        'the support resources',
      )
      return page.evaluate(() => document.querySelector('.menu-panel')?.textContent ?? '')
    },

    async close(): Promise<void> {
      await page.close()
    },
  }

  return driver
}

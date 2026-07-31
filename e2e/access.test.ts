/**
 * What v0.5 promised: the game is playable without a pointer, and readable to
 * something that is not a pair of eyes.
 *
 * ## The mouse counter
 *
 * `e2e/game.ts` never touches the mouse, by design, so every check in this suite
 * already exercises the keyboard path. That makes it cheap to assert the strong
 * version here: `page.mouse` is instrumented and the count must be zero at the
 * end. A driver that quietly clicked something would turn this file into
 * decoration, so the counter is on the raw playwright handle rather than on
 * anything the driver controls.
 *
 * ## Why these particular things
 *
 * Each one is a bug that actually happened, or the fix for one:
 *
 * - the prompt live region re-announced every frame, because `setPrompt` wrote
 *   `textContent` unconditionally
 * - hovering an option set `is-highlighted`, which armed Enter on a choice
 *   nobody had read
 * - the beat announcer had to be a separate element outside the `aria-hidden`
 *   root, because `aria-hidden="true"` on an ancestor is not undone by
 *   `aria-hidden="false"` on a descendant
 * - opening a document had to move focus into it, and closing had to put focus
 *   back where it came from
 */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { after, before, describe, it } from 'node:test'

import type { Browser, Page } from 'playwright-core'

import { launch } from './browser.ts'
import { at, open, type Driver } from './game.ts'
import { base } from './setup.ts'

/**
 * The floor plan, read here rather than asked of the game.
 *
 * The orientation key's claim is that it never names something through a wall,
 * and it makes that claim by asking `flat.roomAt`. A check that asked the same
 * function would agree with itself. So this file works the room out from the
 * data, which is what the walls are built from.
 */
const PLAN = JSON.parse(
  readFileSync(new URL('../data/floorplan.json', import.meta.url), 'utf8'),
) as {
  eye_height: number
  rooms: { id: string, min: [number, number], max: [number, number] }[]
}

function roomAt(x: number, z: number): string | null {
  const found = PLAN.rooms.find((r) => x >= r.min[0] && x <= r.max[0] && z >= r.min[1] && z <= r.max[1])
  return found?.id ?? null
}

/** The same nine positions the driver aims from, inset from the walls. */
function standingSpots(room: string): [number, number, number][] {
  const rect = PLAN.rooms.find((r) => r.id === room)
  if (rect === undefined) throw new Error(`no room ${room} in the floor plan`)

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

/**
 * Presses the orientation key and returns what it said.
 *
 * The region is emptied first so that "it has words in it" is a real signal and
 * the wait is on a state rather than on a duration. Emptying it is a harness
 * action on a region the harness reads: nothing in the game clears it, and the
 * game's own writes replace rather than append.
 */
async function orient(game: Driver): Promise<string> {
  await game.page.evaluate(() =>
    { document.querySelector('.orientation-announcer')?.replaceChildren() })
  await game.page.keyboard.press('KeyR')
  await game.until(
    '(document.querySelector(".orientation-announcer")?.textContent ?? "") !== ""',
    'the orientation key to say something',
  )
  return game.page.evaluate(() =>
    document.querySelector('.orientation-announcer')?.textContent ?? '')
}

/** Every bearing the line can end on, from `data/orientation.json`. */
const BEARINGS = ['ahead of you', 'to your left', 'to your right', 'behind you']

/** Object names, read from the data for the same reason the plan is. */
const NAMES = new Map((JSON.parse(
  readFileSync(new URL('../data/objects.json', import.meta.url), 'utf8'),
) as { id: string, name: string }[]).map((object) => [object.id, object.name]))

/** Counts any use of the pointer. Anything above zero fails the file. */
function watchTheMouse(page: Page): () => number {
  let used = 0
  for (const method of ['click', 'move', 'down', 'up', 'wheel'] as const) {
    const original = page.mouse[method].bind(page.mouse)
    // eslint-disable-next-line
    ;(page.mouse as unknown as Record<string, unknown>)[method] = (...args: unknown[]) => {
      used += 1
      return (original as (...a: unknown[]) => unknown)(...args)
    }
  }
  return () => used
}

describe('without a pointer', () => {
  let browser: Browser

  before(async () => { browser = await launch() })
  after(async () => { await browser?.close() })

  it('gets from the advisory into the flat and picks something up, keys only', async () => {
    const game = await open(browser, at(base(), { room: 'entry_hall' }))
    const mouse = watchTheMouse(game.page)

    await game.begin()

    // Tab is the whole of aiming without a pointer. Section 4.2.
    let prompt = ''
    for (let i = 0; i < 30 && prompt === ''; i += 1) {
      await game.page.keyboard.press('Tab')
      const seen = await game.state()
      if (seen.promptShown && seen.prompt !== '') prompt = seen.prompt
    }
    assert.notEqual(prompt, '', 'Tab finds something within reach and the prompt says what')

    assert.ok(await game.pack('team_bib', 'entry_hall'), 'and something can be carried to a box')

    assert.equal(mouse(), 0, 'the mouse was never touched')
    assert.deepEqual(game.errors, [])
    await game.close()
  })

  it('never offers something the crosshair could not reach', async () => {
    const game = await open(browser, at(base(), { room: 'living_room' }))
    const mouse = watchTheMouse(game.page)
    await game.begin()

    // Section 8.2. Cycling is a way of aiming, not an objective marker, so what
    // Tab steps through has to be what a raycast would have found anyway.
    const offered = new Set<string>()
    for (let i = 0; i < 12; i += 1) {
      await game.page.keyboard.press('Tab')
      const id = await game.dev((dev) => dev.targeting.update()?.id ?? null)
      if (id !== null) offered.add(id)
    }

    assert.ok(offered.size > 1, `Tab moves between things, got ${[...offered].join(', ')}`)

    const reachable = new Set(await game.dev((dev) => dev.targeting.candidates().map((c) => c.id)))
    for (const id of offered) {
      assert.ok(reachable.has(id), `${id} was offered by Tab and is a real candidate`)
    }

    assert.equal(mouse(), 0, 'the mouse was never touched')
    assert.deepEqual(game.errors, [])
    await game.close()
  })

  it('moves focus into a document and puts it back afterwards', async () => {
    const game = await open(browser, at(base(), { room: 'entry_hall' }))
    const mouse = watchTheMouse(game.page)
    await game.begin()

    assert.ok(await game.lookAt('lena_note', 'entry_hall'), "Lena's note opens")
    await game.until(
      'document.querySelector(".overlay")?.classList.contains("is-open") === true',
      'the document to open',
    )

    // Focus goes to the panel rather than to the first thing in it. A screen
    // reader needs somewhere to start reading; landing on a control instead
    // reads the control and skips the letter.
    assert.equal(
      await game.page.evaluate(() => document.activeElement?.className ?? ''),
      'overlay-panel',
      'focus is inside the document so it gets read',
    )

    await game.page.keyboard.press('Escape')
    await game.until(
      'document.querySelector(".overlay")?.classList.contains("is-open") === false',
      'the document to close',
    )
    assert.notEqual(
      await game.page.evaluate(() => document.activeElement?.className ?? ''),
      'overlay-panel',
      'and focus leaves again rather than being stranded in a closed panel',
    )

    assert.equal(mouse(), 0, 'the mouse was never touched')
    assert.deepEqual(game.errors, [])
    await game.close()
  })

  it('says what the crosshair is on, once, rather than every frame', async () => {
    const game = await open(browser, at(base(), { room: 'living_room' }))
    await game.begin()

    assert.ok(await game.aimAt('record_player', 'living_room'), 'something is under the crosshair')
    await game.until(
      '(document.querySelector(".prompt")?.textContent ?? "").trim() !== ""',
      'the prompt to say something',
    )

    // The prompt is a live region. Writing to it re-announces it, so the write
    // has to be guarded: without that, a screen reader repeats the prompt at the
    // frame rate for as long as the player looks at anything.
    //
    // One of the two waits in this suite that is a duration rather than a state,
    // and it has to be: the claim is that nothing is written, and nothing being
    // written has no event to wait on. Three seconds is six frames at the rate a
    // software rasteriser manages, and the unguarded version produced 76 writes
    // in that window, so the margin is not fine.
    const writes = await game.page.evaluate(async () => {
      const node = document.querySelector('.prompt')
      if (node === null) return -1

      let seen = 0
      const watcher = new MutationObserver((records) => { seen += records.length })
      watcher.observe(node, { childList: true, characterData: true, subtree: true })
      await new Promise((resolve) => setTimeout(resolve, 3000))
      watcher.disconnect()
      return seen
    })

    assert.equal(writes, 0, `the prompt is not rewritten while nothing changes, saw ${writes} writes`)
    assert.deepEqual(game.errors, [])
    await game.close()
  })

  it('reads a beat out as it arrives, from outside the hidden root', async () => {
    const game = await open(browser, at(base(), { act: 3, room: 'bedroom' }))
    await game.begin()

    assert.ok(await game.lookAt('phone_dead', 'bedroom'), 'the thread opens')
    await game.settle()
    assert.ok(await game.lookAt('desk', 'living_room'), 'the desk scene starts')

    await game.until(
      '[...document.querySelectorAll(".beat-announcer")]'
      + '.flatMap((r) => [...r.children]).length > 0',
      'the desk scene to announce its first line',
    )

    // `aria-hidden="true"` on an ancestor is not undone by `aria-hidden="false"`
    // on a descendant, so the announcer cannot live inside the beat it speaks
    // for. This is the check that it is still outside.
    const buried = await game.page.evaluate(() =>
      [...document.querySelectorAll('.beat-announcer')]
        .filter((node) => node.closest('[aria-hidden="true"]') !== null).length)

    assert.equal(buried, 0, 'no announcer sits inside an aria-hidden subtree')
    assert.deepEqual(game.errors, [])
    await game.close()
  })

  it('has a volume control that reaches the mix, and silence means silence', async () => {
    const game = await open(browser, at(base(), { room: 'kitchen' }))
    const mouse = watchTheMouse(game.page)
    await game.begin()

    const loud = await game.dev((dev) => (dev['audio'] as { mixLevel(): number }).mixLevel())
    assert.ok(loud > 0, `the flat is making a sound to begin with, got ${loud}`)

    // Through the real control rather than the audio API: the rain and the
    // fridge run for the whole game and section 8.2's chime is a gate signal, so
    // a slider that moves nothing is not a cosmetic problem.
    await game.page.keyboard.press('Escape')
    await game.until(
      'document.querySelector(".menu")?.classList.contains("is-open") === true',
      'the pause menu',
    )
    assert.ok(await game.press('Comfort'), 'Comfort is reachable by keyboard')

    await game.until('document.querySelector(".option-slider") !== null', 'the comfort sliders')

    // By label, not by position. Comfort has three sliders and volume is the
    // second: taking the first one silently tested look sensitivity, which of
    // course changed nothing about the mix and read as a broken volume control.
    const moved = await game.page.evaluate(() => {
      const slider = [...document.querySelectorAll('.option-slider')]
        .find((node) => /volume/i.test(node.closest('label')?.textContent ?? '')) as HTMLInputElement | undefined
      if (slider === undefined) return false
      slider.value = '0'
      slider.dispatchEvent(new Event('input', { bubbles: true }))
      return true
    })
    assert.ok(moved, 'Comfort offers a slider labelled Volume')

    await game.until(
      'document.querySelector("canvas").__dev.audio.mixLevel() < 0.01',
      'the mix to reach silence',
    )

    assert.equal(mouse(), 0, 'the mouse was never touched')
    assert.deepEqual(game.errors, [])
    await game.close()
  })

  it('has a text size that reaches every word, and nothing clips at the largest', async () => {
    const game = await open(browser, at(base(), { room: 'living_room' }))
    const mouse = watchTheMouse(game.page)
    await game.begin()

    // Through the real control, and by label rather than by position: the volume
    // check above once took the first slider, which is look sensitivity, and read
    // a working control as broken.
    await game.pause()
    assert.ok(await game.press('Comfort'), 'Comfort is reachable by keyboard')
    await game.until('document.querySelector(".option-slider") !== null', 'the comfort sliders')

    const sizes = async (): Promise<Record<string, number>> => game.page.evaluate(() => {
      const px = (selector: string): number => {
        const node = document.querySelector(selector)
        return node === null ? 0 : parseFloat(getComputedStyle(node).fontSize)
      }
      return { root: px('html'), body: px('body'), menu: px('.menu-panel') }
    })

    const before = await sizes()
    assert.ok(before.root > 0 && before.body > 0, `something is rendering, got ${JSON.stringify(before)}`)

    const moved = await game.page.evaluate(() => {
      const slider = [...document.querySelectorAll('.option-slider')]
        .find((node) => /text size/i.test(node.closest('label')?.textContent ?? '')) as HTMLInputElement | undefined
      if (slider === undefined) return false
      slider.value = slider.max
      slider.dispatchEvent(new Event('input', { bubbles: true }))
      return true
    })
    assert.ok(moved, 'Comfort offers a slider labelled Text size')

    const after = await sizes()

    // Every one of them, not just the root. The whole point of the rem sweep is
    // that nothing is left behind at a fixed size, and `body` was exactly that
    // until v0.8.1.
    for (const [what, was] of Object.entries(before)) {
      assert.ok(
        (after[what] ?? 0) > was,
        `${what} grew with the setting: was ${was}, now ${after[what]}`,
      )
    }

    // The failure mode that matters for scaling. Text that grows out of its box
    // is worse than text that never grew, because the player who needed it is
    // the one who cannot read what is left.
    assert.equal(
      await game.page.evaluate(() =>
        document.documentElement.scrollWidth > document.documentElement.clientWidth),
      false,
      'the page does not scroll sideways at the largest text size',
    )

    assert.equal(mouse(), 0, 'the mouse was never touched')
    assert.deepEqual(game.errors, [])
    await game.close()
  })

  it('carries the text size to the advisory, which is the screen it matters most on', async () => {
    // Set once, kept, and applied before anything is drawn. v0.8.2 put the
    // custom property in `applySettings`, which only runs when a session starts,
    // so the setting reached every screen except the two a player meets first.
    // The check above passed the whole time, because by the time it measures a
    // font size it is already inside a session.
    const game = await open(browser, at(base(), { room: 'entry_hall' }))
    const mouse = watchTheMouse(game.page)

    const rootSize = async (): Promise<number> => game.page.evaluate(() =>
      parseFloat(getComputedStyle(document.documentElement).fontSize))

    const plain = await rootSize()
    assert.ok(plain > 0, `the advisory is rendering, got ${plain}`)

    await game.page.evaluate(() => {
      const raw = window.localStorage.getItem('sispr.settings')
      const stored = raw === null ? {} : JSON.parse(raw) as Record<string, unknown>
      window.localStorage.setItem('sispr.settings', JSON.stringify({ ...stored, textScale: 2 }))
    })
    await game.page.reload({ waitUntil: 'networkidle' })

    // The advisory, before a single key is pressed. Section 11 puts this screen
    // first and it is the one screen somebody might genuinely need enlarged.
    await game.until(
      'document.body.textContent.includes("Content advisory")',
      'the advisory to come back',
    )
    const advisory = await rootSize()
    assert.ok(advisory > plain, `the advisory is scaled: was ${plain}, now ${advisory}`)

    // And still there on the title, which is the other screen drawn before any
    // session exists.
    assert.ok(await game.press('Continue'), 'Continue is reachable by keyboard')
    await game.until(
      'document.body.textContent.includes("The lease ends Sunday")',
      'the title screen',
    )
    assert.equal(await rootSize(), advisory, 'and the title screen has it too')

    assert.equal(mouse(), 0, 'the mouse was never touched')
    assert.deepEqual(game.errors, [])
    await game.close()
  })

  it('says which room you are in, when asked and not before', async () => {
    const game = await open(browser, at(base(), { room: 'entry_hall' }))
    const mouse = watchTheMouse(game.page)
    await game.begin()

    // Announce-only, and only on the key. A region that spoke on its own would
    // be a second narrator over a game that has one.
    assert.equal(
      await game.page.evaluate(() =>
        document.querySelector('.orientation-announcer')?.textContent ?? null),
      '',
      'nothing is said until the key is pressed',
    )

    assert.match(await orient(game), /^Entry hall\./, 'the key names the room')

    // The same key in a different room, because "Entry hall." is also what a
    // hard-coded string says. Walking there rather than teleporting: this is a
    // navigation aid and it has to survive being used while navigating.
    await game.moveTo('kitchen')
    assert.match(await orient(game), /^Kitchen\./, 'and it follows the player')

    // v0.5 already made this mistake once: `aria-hidden="true"` on an ancestor is
    // not undone by anything on a descendant, so an announcer buried inside a
    // hidden beat is a region no screen reader will ever read.
    const reach = await game.page.evaluate(() => {
      const node = document.querySelector('.orientation-announcer')
      if (node === null) return null
      const box = node.getBoundingClientRect()
      return {
        live: node.getAttribute('aria-live'),
        buried: node.closest('[aria-hidden="true"]') !== null,
        // The measured box rather than the rule that produces it, because the
        // claim is that nothing is drawn and there are several ways to spell
        // that. `hidden` and `display: none` are not among them: a region
        // nothing can see is also a region nothing reads.
        drawn: box.width > 1 || box.height > 1,
      }
    })
    assert.deepEqual(
      reach,
      { live: 'polite', buried: false, drawn: false },
      'the region is polite, outside any hidden subtree, and not drawn',
    )

    assert.equal(mouse(), 0, 'the mouse was never touched')
    assert.deepEqual(game.errors, [])
    await game.close()
  })

  it('points at whatever the game is asking for, and at the boxes once your hands are full', async () => {
    const game = await open(browser, at(base(), { act: 3, room: 'bedroom' }))
    const mouse = watchTheMouse(game.page)
    await game.begin()

    // Reading the thread is what makes the desk the thing the game wants. The
    // key does not invent an objective, it repeats the goal line, so the goal
    // line has to have moved on first.
    assert.ok(await game.lookAt('phone_dead', 'bedroom'), 'the thread opens')
    await game.settle()
    assert.equal((await game.flags())['thread_read'], true, 'and the game now wants the desk')

    await game.moveTo('bedroom')
    const empty = await orient(game)
    assert.match(empty, /The desk, (ahead|behind|to your)[^.]*\.$/, `the line points at the desk, got ${empty}`)
    assert.doesNotMatch(empty, /The three boxes/, 'and not at the boxes, which is not what is being asked for')

    // Section 4.1. Something in your hands has one place to go, whatever the
    // goal line happens to say, so the key follows the hands.
    assert.ok(await game.aimAt('alarm_clock', 'bedroom'), 'the alarm clock is reachable')
    await game.dev((dev) => { dev.interact() })
    await game.settle()
    assert.ok(await game.aimAt('alarm_clock', 'bedroom'), 'and still reachable once examined')
    await game.dev((dev) => { dev.interact() })
    await game.until(
      'document.querySelector("canvas").__dev.carry.held() !== null',
      'the alarm clock to be in hand',
    )

    const carrying = await orient(game)
    assert.match(
      carrying,
      /The three boxes, (ahead|behind|to your)[^.]*\.$/,
      `with something in hand the line points at the boxes, got ${carrying}`,
    )
    assert.doesNotMatch(carrying, /The desk,/, 'and stops pointing at the desk until the hands are empty')

    assert.equal(mouse(), 0, 'the mouse was never touched')
    assert.deepEqual(game.errors, [])
    await game.close()
  })

  it('never names something on the other side of a wall', async () => {
    const game = await open(browser, at(base(), { act: 3, room: 'entry_hall' }))
    const mouse = watchTheMouse(game.page)
    await game.begin()

    // Reach is a radius and a radius is a sphere, so it goes through walls, and
    // the raycast does not save us: `createTargeting` is handed the props and the
    // furniture and never the flat, so a ray has never been stopped by a wall.
    // That is written up in docs/VERIFICATION.md. What the orientation key can do
    // without touching it is refuse to say a wall is not there, and this is the
    // check that it does.
    //
    // Nine positions rather than the middle of the room, because a check that
    // measures from one place measures its own choice of place. The junk drawer
    // was once reported unreachable for exactly that reason.
    let hidden = 0

    for (const spot of standingSpots('entry_hall')) {
      await game.dev((dev, at) => {
        dev.camera.position.set(at[0], at[1], at[2])
        dev.camera.updateMatrixWorld(true)
      }, spot)

      const near = await game.dev((dev, at) => {
        const reach = dev.targeting.reach()
        return dev.targeting.candidates()
          .map((c) => {
            const item = c as { id: string, at: { x: number, y: number, z: number } }
            return {
              id: item.id,
              at: item.at,
              distance: Math.hypot(item.at.x - at[0], item.at.y - at[1], item.at.z - at[2]),
            }
          })
          .filter((c) => c.distance <= reach)
      }, spot)

      const line = await orient(game)

      // The parsing below only holds while the line is one clause, so this is a
      // precondition rather than decoration: a fresh act 3 has no goal satisfied
      // yet, so there is nothing to point at and nothing after the reach list.
      for (const bearing of BEARINGS) {
        assert.ok(!line.includes(bearing), `nothing is being pointed at yet, got ${line}`)
      }

      const standingIn = roomAt(spot[0], spot[2])
      assert.equal(standingIn, 'entry_hall', `the spot ${spot.join(', ')} is in the entry hall`)

      for (const item of near) {
        const name = NAMES.get(item.id)
        if (name === undefined) continue

        if (roomAt(item.at.x, item.at.z) === standingIn) {
          assert.ok(line.includes(name), `${name} is in this room and within reach, so it is named: ${line}`)
        } else {
          assert.ok(!line.includes(name), `${name} is through a wall and is not named: ${line}`)
          hidden += 1
        }
      }
    }

    // If this is zero the check passed without checking anything, which is the
    // failure this project has been caught by six times. It means the entry hall
    // no longer has a neighbour within two and a half metres through a wall, and
    // the check needs a different room rather than a green tick.
    assert.ok(hidden > 0, 'at least one thing was within reach through a wall and was left unsaid')

    assert.equal(mouse(), 0, 'the mouse was never touched')
    assert.deepEqual(game.errors, [])
    await game.close()
  })
})

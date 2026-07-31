/**
 * Hard Rule 9, which is the one with a person on the other end of it.
 *
 * > Title screen carries a content advisory and support resources,
 * > region-configurable. A "pause any time" affordance is always available.
 *
 * "Always" is the whole rule. A pause that works in an empty room and not while
 * a memory is playing is not a pause any time, and the states where it is
 * hardest to reach are exactly the states a player is most likely to want it
 * from. So this checks it from every kind of moment the game has rather than
 * from ordinary standing-in-the-flat, which is the easy case.
 *
 * The advisory screen itself is checked in `opening.test.ts`; this is about
 * everything after it.
 *
 * Each state gets its own page, because some of them end the session and none of
 * them should be able to affect another's result.
 */

import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'

import type { Browser } from 'playwright-core'

import { launch } from './browser.ts'
import { at, open, type Driver } from './game.ts'
import { base } from './setup.ts'

interface Moment {
  what: string
  params: Record<string, string | number>
  /** Puts the game into the state. Leaves it there. */
  reach(game: Driver): Promise<void>
}

const MOMENTS: Moment[] = [
  {
    what: 'standing in the flat',
    params: { room: 'living_room' },
    reach: async () => {},
  },
  {
    what: 'reading a document',
    params: { room: 'entry_hall' },
    reach: async (game) => {
      await game.lookAt('lena_note', 'entry_hall')
      await game.until(
        'document.querySelector(".overlay")?.classList.contains("is-open") === true',
        'the document to open',
      )
    },
  },
  {
    what: 'inside a memory',
    params: { room: 'entry_hall' },
    reach: async (game) => {
      // Object, then thought, then memory. Section 4.3: closing the thought is
      // what lets the memory in, so examining alone leaves the overlay up and
      // no memory playing, which is what the first version of this waited for.
      await game.lookAt('team_bib', 'entry_hall')
      await game.until(
        'document.querySelector(".overlay")?.classList.contains("is-open") === true',
        'the thought about the bib',
      )
      await game.dev((dev) => { dev.overlay.close() })
      await game.until(
        'document.querySelector("canvas").__dev.memories.isPlaying() === true',
        'the memory that follows it',
      )
    },
  },
  {
    what: 'holding something over the sorting chooser',
    params: { room: 'entry_hall' },
    reach: async (game) => {
      await game.lookAt('team_bib', 'entry_hall')
      await game.settle()
      await game.lookAt('team_bib', 'entry_hall')
      await game.until(
        'document.querySelector("canvas").__dev.carry.held() !== null',
        'something to be in hand',
      )
      await game.lookAt('sorting_boxes', 'living_room')
      await game.until(
        'document.querySelector(".overlay")?.classList.contains("is-choose") === true',
        'the sorting chooser',
      )
    },
  },
  {
    what: 'with his demo playing in the next room',
    params: { act: 2, room: 'living_room' },
    reach: async (game) => {
      await game.dev((dev) => { dev.state['record_playing'] = true })
    },
  },
  {
    what: 'in the second after the chime',
    params: { act: 2, room: 'bedroom' },
    reach: async (game) => {
      await game.dev((dev) => { dev.state['charger_found'] = true })
      await game.lookAt('phone_dead', 'bedroom')
      await game.settle()
      await game.dev((dev) => {
        dev.state['phone_charging_started_at'] = (dev.state['phone_charging_started_at'] as number) - 241_000
      })
      await game.until(
        'document.querySelector("canvas").__dev.state.phone_on === true',
        'the chime',
      )
    },
  },
  {
    what: 'at the desk, in the middle of the scene about the note that is not there',
    params: { act: 3, room: 'bedroom' },
    reach: async (game) => {
      await game.lookAt('phone_dead', 'bedroom')
      await game.settle()
      await game.lookAt('desk', 'living_room')
      await game.until(
        '[...document.querySelectorAll(".beat-announcer")].flatMap((r) => [...r.children]).length > 0',
        'the desk scene to be under way',
      )
    },
  },
]

describe('Hard Rule 9: pause any time', () => {
  let browser: Browser

  before(async () => { browser = await launch() })
  after(async () => { await browser?.close() })

  for (const moment of MOMENTS) {
    it(`reaches the support resources while ${moment.what}`, async () => {
      const game = await open(browser, at(base(), moment.params))
      await game.begin()
      await moment.reach(game)

      // Escape backs out one level at a time, so a beat costs one press before
      // the pause. Two is the promise the ending is built on; more than two is
      // a rule that technically holds and practically does not.
      const presses = await game.pause()
      assert.ok(
        presses <= 2,
        `pausing while ${moment.what} took ${presses} presses of Escape, not at most two`,
      )
      // The menu is open now, so `resources` walks on from here rather than
      // starting over.
      const panel = await game.resources()

      assert.match(panel, /helpline/i, `the resources open while ${moment.what}`)

      // A named service with somewhere to go, not a screen that says the word
      // support. The rule is about a person being able to reach help.
      const links = await game.page.evaluate(() =>
        [...document.querySelectorAll('.menu-panel a')]
          .map((a) => (a as HTMLAnchorElement).href)
          .filter((href) => href.startsWith('https://')))

      assert.ok(links.length > 0, `and carry a reachable link while ${moment.what}`)

      assert.deepEqual(game.errors, [])
      await game.close()
    })
  }

  it('reaches them from inside the ending, after the flat is gone', async () => {
    // Section 8.4 into section 11. The hardest one: the session has handed the
    // screen over for good, the flat is not underneath any more, and the pause
    // menu still has to be two keys away.
    const game = await open(browser, at(base(), { act: 3, room: 'living_room' }))
    await game.begin()

    await game.dev((dev) => {
      let packed = 0
      const placed = dev['placed'] as { byObject: Map<string, unknown> }
      for (const id of placed.byObject.keys()) {
        if (packed >= 12) break
        const objects = dev.state['objects'] as Record<string, unknown>
        objects[id] = { examined: true, second_look_seen: false, sorted_to: 'lena' }
        dev.state['sorted_count'] = (dev.state['sorted_count'] as number) + 1
        packed += 1
      }
      dev.state['thread_read'] = true
      dev.state['desk_done'] = true
      dev.state['receipts_found'] = true
    })

    await game.until(
      'document.querySelector("canvas").__dev.ending.hasEnded() === true',
      'the night to end',
    )
    await game.until(
      'document.querySelector(".overlay")?.classList.contains("is-choose") === true',
      'the take-one-thing chooser',
    )

    const presses = await game.pause()
    assert.ok(presses <= 2, `pausing inside the ending took ${presses} presses, not at most two`)

    // The advisory says "You can pause any time. The flat will wait." Until
    // v0.7.11 that was not true here: the beats ran on `setTimeout` with nothing
    // holding them, so the ending kept playing under the menu, got from the
    // voicemail to the support resources in about six seconds, and replaced the
    // menu with them. A player who paused during the hardest part of the game
    // had it played at them anyway.
    const before = await game.page.evaluate(() => (document.body.textContent ?? '').slice(-60))

    // The one place in this suite that waits for a duration rather than for a
    // state, and it has to: the claim is that nothing happens, and nothing
    // happening has no event to wait on. Eight seconds is chosen against the
    // failure it is watching for, which took about six to go from the voicemail
    // all the way to the resources.
    await new Promise((resolve) => setTimeout(resolve, 8000))

    const after = await game.page.evaluate(() => (document.body.textContent ?? '').slice(-60))
    assert.equal(after, before, 'the ending holds where it is while the menu is open')

    const panel = await game.resources()
    assert.match(panel, /helpline/i, 'the resources open from inside the ending')

    assert.deepEqual(game.errors, [])
    await game.close()
  })
})

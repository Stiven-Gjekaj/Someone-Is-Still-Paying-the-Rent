/**
 * The whole game, once, in order, with nothing set by hand.
 *
 * This is the check the fast suite cannot be. Everything in `e2e/*.test.ts`
 * starts somewhere: `?act=2`, `?act=3`, a flag written directly. Each of those
 * is a fair starting line and none of them is a road. This one starts at the
 * front door with no dev parameters beyond the one that attaches the handle
 * used to aim a camera that cannot take a pointer lock headless, and it does not
 * write a single flag. Every flag in this run is set by the flat.
 *
 * It costs about eight minutes, half of it the act 2 charge, which is four real
 * minutes by design because section 4.5 says the waiting is the point. That is
 * why it runs on a schedule and on demand rather than on every push, and why
 * `docs/VERIFICATION.md` says plainly that a green fast suite is not evidence
 * the game can be finished.
 *
 *   npm run verify:full
 */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { after, before, describe, it } from 'node:test'

import type { Browser } from 'playwright-core'

import { launch } from './../browser.ts'
import { at, open, type Driver } from './../game.ts'
import { base } from './../setup.ts'

const rooms = ['entry_hall', 'living_room', 'kitchen', 'bathroom', 'bedroom', 'balcony']

interface Placeable { id: string, room?: string, sortable?: boolean, act_min?: number }

const OBJECTS = JSON.parse(
  readFileSync(new URL('../../data/objects.json', import.meta.url), 'utf8'),
) as Placeable[]

/**
 * Everything reachable right now, examined once each, room by room.
 *
 * Returns how many were actually looked at. Objects hidden behind a discovery
 * are simply not there yet, which is the point of hiding them, so a lower number
 * early in the night is correct rather than a failure.
 */
async function walkTheFlat(game: Driver, act: number): Promise<string[]> {
  const missed: string[] = []

  for (const room of rooms) {
    const here = OBJECTS.filter((o) => o.room === room && (o.act_min ?? 1) <= act)
    for (const object of here) {
      // Anything already in a box is out of the flat and is not missing.
      const present = await game.dev(
        (dev, id) => {
          const objects = dev.state['objects'] as Record<string, { sorted_to?: string | null }>
          if (objects[id]?.sorted_to != null) return false
          return (dev['placed'] as { byObject: Map<string, unknown> }).byObject.has(id)
            || (dev['targeting'] as { candidates(): { id: string }[] }).candidates().some((c) => c.id === id)
        },
        object.id,
      )
      // Not there yet is not a failure: things hidden behind a discovery are
      // supposed to be missing until it happens.
      if (!present) continue

      // Present and unaimable is worth knowing about, though, and silently
      // skipping it is how a run walks the whole flat and never opens the
      // drawer. Reported rather than thrown, because one awkward angle should
      // not end a twenty-minute run.
      // The declared room first, then everywhere else. `room` says where the
      // player is standing when they meet a thing, and for a couple of objects
      // that is not where the thing is: the bible puts the invoice folder on the
      // wardrobe top shelf in the bedroom and indexes it under the living room,
      // because the living room is where it gets sorted. Trusting the field over
      // the flat reported a perfectly reachable object as unreachable.
      let aimed = await game.aimAt(object.id, room)
      for (const elsewhere of rooms) {
        if (aimed) break
        if (elsewhere === room) continue
        aimed = await game.aimAt(object.id, elsewhere)
      }

      if (!aimed) {
        missed.push(`${object.id} (declared in the ${room})`)
        continue
      }

      // Read the verb before pressing anything, which is the whole difference
      // between looking around a flat and emptying it into your arms.
      //
      // Section 4.2 offers Take rather than Examine on anything sortable that
      // has already been looked at, so on the second pass through the flat this
      // loop was picking objects up. One press, and from then on the player is
      // carrying something, every later interact is a no-op, and the run walks
      // the remaining rooms touching nothing. That is how a walk of the middle
      // layer reached the bedroom and left the phone unplugged.
      const prompt = (await game.state()).prompt
      if (!prompt.startsWith('Examine') && !prompt.startsWith('Read')) continue

      await game.dev((dev) => { dev.interact() })
      await game.settle()
    }
  }

  return missed
}

describe('the whole night', () => {
  let browser: Browser

  before(async () => { browser = await launch() })
  after(async () => { await browser?.close() })

  it('can be played from the front door to the support resources', async () => {
    const started = Date.now()
    const mark = (what: string): void =>
      console.log(`  [${((Date.now() - started) / 1000).toFixed(0)}s] ${what}`)

    // The only parameter, and only because a headless page cannot take a
    // pointer lock. No act, no room, no flags.
    const game = await open(browser, at(base(), { room: 'entry_hall' }))
    await game.begin()
    mark('through the front door')

    assert.equal(await game.dev((dev) => dev.state['act']), 1, 'the night starts in act 1')

    // Act 1. Look at everything, then pack until the gate opens. Section 4.5
    // wants ten sorted and the phone found, and neither is written here.
    const missedInAct1 = await walkTheFlat(game, 1)
    mark(`looked at act 1${missedInAct1.length === 0 ? '' : `, could not aim at ${missedInAct1.join(', ')}`}`)

    const sortable = OBJECTS.filter((o) => o.sortable === true && (o.act_min ?? 1) === 1)
    for (const object of sortable) {
      if (await game.dev((dev) => dev.state['act'] as number) >= 2) break
      if (object.room === undefined) continue
      const held = await game.dev((dev) => dev.carry.held() !== null)
      if (held) continue
      try {
        await game.pack(object.id, object.room)
      } catch {
        // Not everything is reachable from where the walk left the camera, and
        // this run has plenty of objects to choose from.
      }
    }

    await game.until(
      'document.querySelector("canvas").__dev.state.act === 2',
      'act 2 to open, having packed and found the phone without being told to',
      180_000,
    )
    mark(`act 2, with ${await game.dev((dev) => dev.state['sorted_count'])} sorted`)

    // Act 2. The middle layer, then the charger, then the wait. Really waited.
    const missedInAct2 = await walkTheFlat(game, 2)
    mark(`walked the middle layer${missedInAct2.length === 0 ? '' : `, could not aim at ${missedInAct2.join(', ')}`}`)

    assert.equal(
      await game.dev((dev) => dev.state['charger_found']),
      true,
      'the junk drawer gave up the charger during an ordinary walk of the flat',
    )

    // The walk should already have plugged it in, since the kitchen comes before
    // the bedroom and the drawer gives up the charger there. Doing it again is
    // harmless and covers the case where the walk could not aim at it.
    assert.ok(
      await game.lookAt('phone_dead', 'bedroom'),
      'the phone can be aimed at in act 2',
    )
    await game.settle()

    const clock = await game.dev((dev) => ({
      charging: dev.state['phone_charging_started_at'],
      charger: dev.state['charger_found'],
      found: dev.state['phone_found'],
      act: dev.state['act'],
    }))
    assert.notEqual(
      clock.charging,
      null,
      `the phone is charging. State: ${JSON.stringify(clock)}`,
    )
    mark('phone plugged in, waiting out the four minutes')

    // Section 4.5, at its real length. The clock is not wound here: this is the
    // one run that pays the four minutes the design asks a player to sit through.
    await game.until(
      'document.querySelector("canvas").__dev.state.act === 3',
      'the chime, after four real minutes',
      420_000,
    )
    mark('act 3')

    // Act 3. The chain, in order, each link opened by the last.
    await game.lookAt('phone_dead', 'bedroom')
    await game.settle()
    assert.equal(await game.dev((dev) => dev.state['thread_read']), true)

    await game.lookAt('desk', 'living_room')
    await game.until(
      '[...document.querySelectorAll(".beat-announcer")]'
      + '.flatMap((r) => [...r.children].map((c) => c.textContent ?? ""))'
      + '.some((line) => line.includes("Most people don\'t leave one"))',
      'the desk scene to reach its last line',
      120_000,
    )
    await game.settle()
    mark('the desk')

    await game.lookAt('pc_bag', 'entry_hall')
    await game.until(
      'document.querySelector("canvas").__dev.state.receipts_found === true',
      'the rent receipts',
    )
    await game.dismiss()
    mark('the bag by the door')

    await game.until(
      'document.querySelector("canvas").__dev.ending.hasEnded() === true',
      'the night to end',
      120_000,
    )

    await game.until(
      'document.querySelector(".overlay")?.classList.contains("is-choose") === true',
      'the take-one-thing chooser',
      120_000,
    )
    await game.page.keyboard.press('ArrowDown')
    await game.page.keyboard.press('Enter')
    mark('took one thing out of the box')

    await game.until(
      '/someone is still paying the rent/i.test(document.body.textContent ?? "")'
      + ' && /struggling/i.test(document.body.textContent ?? "")',
      'the support resources',
      180_000,
    )
    mark('the support resources')

    assert.equal(
      await game.page.evaluate(() => localStorage.getItem('sispr.checkpoint')),
      null,
      'and the checkpoint is cleared, because the night is over',
    )

    assert.deepEqual(game.errors, [])
    await game.close()
  })
})

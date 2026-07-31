/**
 * The three acts, and what opens each one.
 *
 * Section 4.5 makes each act a gate rather than a chapter break, and section 4.1
 * makes sorting the thing you do while the gates fill up. Both are checked here
 * by doing them: act 1's gate is reached by packing ten objects one at a time
 * through the real verb table, not by writing a number into the state.
 *
 * ## What jumping in with `?act=` does and does not prove
 *
 * The act 2 and act 3 checks start with a dev parameter, so they are evidence
 * that each act's chain works once you are in it, and **not** evidence that the
 * game gets you there. `?act=3` deliberately sets no flag an earlier act was
 * supposed to set, which is what makes it a fair starting line rather than a
 * cheat: the flat it produces is the flat act 3 actually begins in.
 *
 * The one check that proves the whole road is `e2e/full/playthrough.test.ts`,
 * and it takes about eight minutes, which is why it does not run on a push.
 *
 * ## Winding the clock instead of waiting on it
 *
 * Act 2's gate is four real minutes of the phone charging, and section 4.5 says
 * the waiting is the point. It is still the point when a machine is doing the
 * waiting, so the check moves `phone_charging_started_at` backwards rather than
 * sleeping: that is the same clock the game reads, so the gate is evaluated
 * exactly as it would be at 03:04, and the suite does not spend four minutes
 * proving arithmetic that `tests/charge.test.ts` already proves.
 */

import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'

import type { Browser } from 'playwright-core'

import { launch } from './browser.ts'
import { at, open, type Driver } from './game.ts'
import { base } from './setup.ts'

/** Ten sortable act-1 objects, spread across the flat so the walk is real. */
const TEN: [string, string][] = [
  ['team_bib', 'entry_hall'],
  ['boots_muddy', 'entry_hall'],
  ['key_bowl', 'entry_hall'],
  ['mug_chipped', 'kitchen'],
  ['team_photo', 'kitchen'],
  ['cuttings_jar', 'kitchen'],
  ['caps_jar', 'balcony'],
  ['empty_pots', 'balcony'],
  ['library_books', 'living_room'],
  ['blanket_sofa', 'living_room'],
]

async function act(game: Driver): Promise<number> {
  return game.dev((dev) => dev.state['act'] as number)
}

describe('the acts', () => {
  let browser: Browser

  before(async () => { browser = await launch() })
  after(async () => { await browser?.close() })

  it('opens act 2 once ten things are packed and the phone has been found', async () => {
    const game = await open(browser, at(base(), { room: 'entry_hall' }))
    await game.begin()

    assert.equal(await act(game), 1, 'the night starts in act 1')

    for (const [id, room] of TEN) {
      assert.ok(await game.pack(id, room), `${id} could be packed from the ${room}`)
    }
    assert.equal((await game.flags())['sorted_count'], 10)

    // Ten is not enough on its own. Section 4.5 wants the phone found too, and
    // this is the half a count-only check would miss.
    assert.equal(await act(game), 1, 'ten alone does not open the act')

    assert.ok(await game.lookAt('phone_dead', 'bedroom'), 'the phone is on the bedside table')
    await game.settle()

    await game.until(
      'document.querySelector("canvas").__dev.state.act === 2',
      'act 2 to open once both halves of the gate hold',
    )

    const seen = await game.state()
    assert.match(seen.goal, /charger/i, 'and the goal line says what is missing')
    assert.deepEqual(game.errors, [])
    await game.close()
  })

  it('gives up the charger, the Mira thread and the demo in act 2', async () => {
    const game = await open(browser, at(base(), { act: 2, room: 'kitchen' }))
    await game.begin()

    // The junk drawer is the smallest target in the flat and a scan from the
    // middle of the kitchen used to miss it, which is why `aimAt` stands in nine
    // places rather than one.
    assert.ok(await game.lookAt('junk_drawer', 'kitchen'), 'the junk drawer can be reached')
    await game.settle()
    assert.equal((await game.flags())['charger_found'], true, 'the drawer gives up the charger')

    // The under-bed box and the vinyl shelf are checked by what they put in the
    // flat rather than by a flag, because the reveal is the feature. A flag that
    // flips while the shoebox stays empty is exactly the failure worth catching.
    assert.equal(
      await game.dev((dev) => (dev['placed'] as { byObject: Map<string, unknown> }).byObject.has('mira_draft')),
      false,
      'the Mira thread is not in the flat before the box is opened',
    )
    assert.ok(await game.lookAt('underbed_box', 'bedroom'), 'the under-bed box is findable')
    await game.settle()
    assert.equal((await game.flags())['underbed_found'], true)
    assert.equal(
      await game.dev((dev) => (dev['placed'] as { byObject: Map<string, unknown> }).byObject.has('mira_draft')),
      true,
      'and opening it puts the Mira thread in the flat',
    )

    // The demo is behind a two-object chain, and walking it is the point. The
    // vinyl shelf's second look wants `examined:bass_case` first, because the
    // bible gated the shelf on the demo it reveals and that is circular. See the
    // recorded deviations in docs/CONTENT_RULES.md. Looking at the shelf twice
    // without the bass case does nothing at all, which is correct and is what
    // the first version of this check mistook for a broken reveal.
    assert.ok(await game.lookAt('vinyl_shelf', 'living_room'), 'the vinyl shelf can be reached')
    await game.settle()
    assert.equal(
      await game.dev((dev) => (dev['placed'] as { byObject: Map<string, unknown> }).byObject.has('demo_cdr')),
      false,
      'and gives up nothing before the bass case has been found',
    )

    assert.ok(await game.lookAt('bass_case', 'bedroom'), 'the bass case is in the bedroom corner')
    await game.settle()

    assert.ok(await game.lookAt('vinyl_shelf', 'living_room'), 'the shelf reads differently afterwards')
    await game.settle()
    assert.equal(
      await game.dev((dev) => (dev['placed'] as { byObject: Map<string, unknown> }).byObject.has('demo_cdr')),
      true,
      'the record out of place is a paper sleeve, and it is now reachable',
    )

    assert.deepEqual(game.errors, [])
    await game.close()
  })

  it('rings the chime and opens act 3 once the phone has charged', async () => {
    const game = await open(browser, at(base(), { act: 2, room: 'bedroom' }))
    await game.begin()

    await game.dev((dev) => { dev.state['charger_found'] = true })
    assert.ok(await game.lookAt('phone_dead', 'bedroom'), 'the phone can be plugged in')
    await game.settle()

    const charging = await game.dev((dev) => dev.state['phone_charging_started_at'])
    assert.notEqual(charging, null, 'the wait has started')
    assert.equal(await act(game), 2, 'and act 2 holds while it runs')

    // Four minutes of game time, in one step. See the header.
    await game.dev((dev) => {
      dev.state['phone_charging_started_at'] = (dev.state['phone_charging_started_at'] as number) - 241_000
    })

    await game.until(
      'document.querySelector("canvas").__dev.state.phone_on === true',
      'the chime',
    )

    // Nothing is touched between the chime and these assertions, and that is the
    // whole check. The act used to be evaluated only when the player sorted or
    // examined something, so the chime rang into a flat that was still act 2:
    // act 3's lighting never arrived, the bag was never placed by the door, and
    // the checkpoint said act 2 until the player happened to interact. Standing
    // still after the chime left the night stuck. See v0.7.5.
    await game.until(
      'document.querySelector("canvas").__dev.state.act === 3',
      'act 3 to open at the chime rather than at the next thing touched',
    )

    assert.equal(
      await game.dev((dev) => (dev['placed'] as { byObject: Map<string, unknown> }).byObject.has('pc_bag')),
      true,
      'your bag is by the door without the player having touched anything',
    )
    assert.equal(
      await game.page.evaluate(() =>
        JSON.parse(localStorage.getItem('sispr.checkpoint') ?? 'null')?.state?.act ?? null),
      3,
      'and the checkpoint records the act the player is actually in',
    )

    assert.deepEqual(game.errors, [])
    await game.close()
  })

  it('runs act 3 as a chain: the thread, then the desk, and the bag beside them', async () => {
    const game = await open(browser, at(base(), { act: 3, room: 'bedroom' }))
    await game.begin()

    // Section 4.5. Each link is what unlocks the next, so the desk has to still
    // be saying "Later" before the thread is read.
    assert.ok(await game.aimAt('desk', 'living_room'), 'the desk is there from the start')
    const before = await game.state()
    assert.equal(before.prompt.startsWith('Examine'), true)
    assert.equal((await game.flags())['thread_read'], false, 'and nothing has been read yet')

    // The ordering has to be enforced, not merely followed. Examining the desk
    // now must give its act 1 line and nothing else: "His desk. Paper
    // everywhere. Later." A version of this check that only walked the chain in
    // the right order passed happily with the gate removed, which is how a
    // sandbox gets shipped as a chain.
    await game.lookAt('desk', 'living_room')
    await game.settle()
    assert.equal(
      (await game.flags())['desk_done'],
      false,
      'the desk does not give up its scene before the thread has been read',
    )

    assert.ok(await game.lookAt('phone_dead', 'bedroom'), 'the thread opens in act 3')
    await game.settle()
    assert.equal((await game.flags())['thread_read'], true)

    assert.ok(await game.lookAt('desk', 'living_room'), 'the desk opens once the thread is read')

    // `desk_done` is set the moment the scene *starts*, not when it ends, so
    // waiting on the flag and then settling skips the scene and proves nothing.
    // The thing worth checking is that it plays all the way to its last line.
    //
    // Hard Rule 3 as a structure: the scene is built around an absence, and the
    // payoff is the sentence after a deliberate long silence on the last empty
    // drawer. It arrives about fifteen seconds in, and most of that is the
    // silence. A scene that reached this line early would be a scene that had
    // lost the pause the whole beat is made of.
    await game.until(
      '[...document.querySelectorAll(".beat-announcer")]'
      + '.flatMap((r) => [...r.children].map((c) => c.textContent ?? ""))'
      + '.some((line) => line.includes("Most people don\'t leave one"))',
      'the desk scene to reach its last line',
    )
    await game.settle()

    assert.ok(await game.lookAt('pc_bag', 'entry_hall'), 'your bag is by the door')
    await game.until(
      'document.querySelector("canvas").__dev.state.receipts_found === true',
      'the rent receipts to be read',
    )

    // And that is the end of the chain, not a step in it. The desk was already
    // done, so putting the receipts down sets the last of the two flags section
    // 8.4 waits on and the night ends by itself.
    //
    // `dismiss` rather than `settle`, and the difference is the whole point: the
    // ending takes the screen and never gives it back, so waiting for the flat
    // to return waits forever. The game will also not end while the receipts are
    // still open, which is right and is why closing them is a step rather than
    // tidying up.
    await game.dismiss()

    await game.until(
      'document.querySelector("canvas").__dev.ending.hasEnded() === true',
      'the night to end once the desk and the bag are both done',
    )

    assert.deepEqual(game.errors, [])
    await game.close()
  })
})

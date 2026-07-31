/**
 * The one checkpoint, and what it refuses to restore.
 *
 * Section 12. Written when an act begins, offered from the title screen as
 * "Continue from act N", cleared when the night is over. There is no manual save
 * and no way to rewind inside an act, because sorting has no undo and a save
 * system that quietly gave it one would take the weight out of the only decision
 * the game asks anybody to make.
 *
 * `tests/save.test.ts` already proves the reader's arithmetic: version
 * mismatches, unknown object ids, a recomputed `sorted_count`. What it cannot
 * prove is that any of it reaches the title screen, which is the only place a
 * player meets it. That is what this is for.
 *
 * The unforgiving direction is the one worth checking. A save that
 * half-restores is worse than no save at all, because it looks like it worked.
 */

import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'

import type { Browser } from 'playwright-core'

import { launch } from './browser.ts'
import { at, open } from './game.ts'
import { base } from './setup.ts'

/** What the title screen is offering, by button label. */
const TITLE_BUTTONS = '[...document.querySelectorAll("button")].map((b) => (b.textContent ?? "").trim())'

describe('the checkpoint', () => {
  let browser: Browser

  before(async () => { browser = await launch() })
  after(async () => { await browser?.close() })

  it('is written when an act begins, and offers that act back', async () => {
    // Reached rather than fabricated: the chime is what carries act 2 into act 3
    // and `onEnter` is what writes the checkpoint, so this is the real path.
    const game = await open(browser, at(base(), { act: 2, room: 'bedroom' }))
    await game.begin()

    await game.dev((dev) => { dev.state['charger_found'] = true })
    await game.lookAt('phone_dead', 'bedroom')
    await game.settle()
    await game.dev((dev) => {
      dev.state['phone_charging_started_at'] = (dev.state['phone_charging_started_at'] as number) - 241_000
    })
    await game.until(
      'document.querySelector("canvas").__dev.state.act === 3',
      'act 3, which is what writes the checkpoint',
    )

    const saved = await game.page.evaluate(() =>
      JSON.parse(localStorage.getItem('sispr.checkpoint') ?? 'null'))
    assert.equal(saved?.state?.act, 3, 'the checkpoint records the act that just began')

    // Now reload and see what a player is actually offered. The checkpoint
    // lives in localStorage, which survives the reload; the session does not.
    //
    // A dev parameter is kept only because the handle is how this reads the
    // restored act back, and the handle exists nowhere else. It changes nothing
    // about the title screen, which is what is being checked.
    await game.page.goto(at(base(), { room: 'living_room' }), { waitUntil: 'networkidle' })
    await game.press('Continue')

    await game.until(
      `${TITLE_BUTTONS}.some((label) => /Continue from act 3/.test(label))`,
      'the title screen to offer act 3 back',
    )

    assert.ok(await game.press('Continue from act 3'), 'and it can be taken')
    await game.until('document.querySelector("canvas") !== null', 'the flat to be rebuilt')
    assert.equal(await game.dev((dev) => dev.state['act']), 3, 'in the act it said')

    assert.deepEqual(game.errors, [])
    await game.close()
  })

  it('drops a save from an older build whole, rather than half restoring it', async () => {
    const game = await open(browser, base())

    // Version 1 is what v0.3 wrote, before the state grew a field for the object
    // taken at the end. Section 12 says a mismatch is dropped rather than
    // migrated, because a save that half restores looks like it worked.
    await game.page.evaluate(() => localStorage.setItem('sispr.checkpoint', JSON.stringify({
      version: 1,
      saved_at: Date.now(),
      state: { act: 3, sorted_count: 20, objects: {} },
    })))

    await game.page.goto(base(), { waitUntil: 'networkidle' })
    await game.press('Continue')

    await game.until(
      `${TITLE_BUTTONS}.some((label) => label === "Begin")`,
      'the title screen',
    )

    const offered = await game.page.evaluate(TITLE_BUTTONS) as string[]
    assert.ok(
      !offered.some((label) => /Continue from act/.test(label)),
      `a stale save is not offered, but the title screen shows: ${offered.join(', ')}`,
    )

    assert.deepEqual(game.errors, [])
    await game.close()
  })

  it('does not believe a sorted_count that the objects do not support', async () => {
    const game = await open(browser, base())

    // The count is recomputed from the objects rather than trusted, so a save
    // claiming twenty sorted things with nothing sorted in it restores as zero.
    // Believing the number instead would open act 2's gate on an empty flat.
    await game.page.evaluate(() => localStorage.setItem('sispr.checkpoint', JSON.stringify({
      version: 2,
      saved_at: Date.now(),
      state: {
        act: 2,
        sorted_count: 20,
        objects: {},
        phone_charging_started_at: null,
        taken: null,
      },
    })))

    await game.page.goto(at(base(), { room: 'living_room' }), { waitUntil: 'networkidle' })
    await game.press('Continue')
    await game.until(
      `${TITLE_BUTTONS}.some((label) => /Continue from act 2/.test(label))`,
      'the title screen to offer act 2 back',
    )
    assert.ok(await game.press('Continue from act 2'))
    await game.until('document.querySelector("canvas") !== null', 'the flat to be rebuilt')

    assert.equal(
      await game.dev((dev) => dev.state['sorted_count']),
      0,
      'the count comes from what is actually in the boxes',
    )

    assert.deepEqual(game.errors, [])
    await game.close()
  })
})

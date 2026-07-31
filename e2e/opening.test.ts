/**
 * The front door.
 *
 * Everything before the flat: the advisory that Hard Rule 9 requires, the title
 * screen, and the section 8.1 opening beat. This is the only part of the game
 * every single player sees, and it is the part with the least logic underneath
 * it, which is exactly the combination unit tests are worst at.
 *
 * It also asserts the shape of the dev handle. That check protects the rest of
 * the suite rather than the game: `canvas.__dev` is now what every other file
 * drives the game through, and losing a field from it should fail here, once,
 * saying which field, rather than as a dozen unrelated timeouts elsewhere.
 */

import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'

import type { Browser } from 'playwright-core'

import { launch } from './browser.ts'
import { at, open } from './game.ts'
import { base } from './setup.ts'

describe('the front door', () => {
  let browser: Browser

  before(async () => { browser = await launch() })
  after(async () => { await browser?.close() })

  it('shows the advisory before anything else, and it can be read with a keyboard', async () => {
    const game = await open(browser, base())

    const advisory = await game.page.evaluate(() => document.body.textContent ?? '')
    assert.match(advisory, /suicide/i, 'Hard Rule 9: the advisory names what the game is about')

    // The resource is a link, so the thing to assert is that it goes somewhere.
    // Checking the visible text would only prove the words "Find A Helpline" are
    // on screen, and a support pointer nobody can follow is decoration.
    const links = await game.page.evaluate(() =>
      [...document.querySelectorAll('a.support-name')].map((a) => ({
        name: a.textContent ?? '',
        href: (a as HTMLAnchorElement).href,
      })))

    assert.ok(links.length > 0, 'the advisory carries at least one support resource')
    for (const link of links) {
      assert.match(link.href, /^https:\/\//, `${link.name} points somewhere reachable`)
      assert.notEqual(link.name.trim(), '', 'and it is named rather than a bare url')
    }

    assert.ok(await game.press('Continue'), 'the advisory is dismissable without a pointer')
    assert.deepEqual(game.errors, [])
    await game.close()
  })

  it('reaches the flat through the title screen', async () => {
    const game = await open(browser, at(base(), { room: 'living_room' }))
    await game.begin()

    const seen = await game.state()
    assert.equal(seen.hudHidden, false, 'the HUD is up once the flat is reachable')
    assert.deepEqual(game.errors, [])
    await game.close()
  })

  it('plays the opening beat and announces the title card', async () => {
    // No dev parameters at all, so the beat is not skipped. Section 8.1: black,
    // the key in the lock, the card, then a fade up.
    const game = await open(browser, base())
    await game.begin()

    await game.until(
      'document.querySelector(".hud")?.classList.contains("is-hidden") === false',
      'the opening beat to hand the flat over',
    )

    const seen = await game.state()
    assert.ok(
      seen.announced.some((line) => line.includes('lease ends Sunday')),
      `the title card is read out, not only drawn. Announced: ${JSON.stringify(seen.announced)}`,
    )
    assert.deepEqual(game.errors, [])
    await game.close()
  })

  it('exposes every part of the dev handle this suite drives the game through', async () => {
    const game = await open(browser, at(base(), { room: 'kitchen' }))
    await game.begin()

    const present = await game.dev((dev) => Object.keys(dev).sort())

    // Named one at a time rather than as a set, so a failure says which.
    for (const field of [
      'acts', 'camera', 'carry', 'charge', 'ending', 'frames', 'interact',
      'memories', 'overlay', 'placed', 'state', 'targeting',
    ]) {
      assert.ok(
        present.includes(field),
        `the dev handle lost \`${field}\`, which e2e/game.ts drives the game through. `
        + `It has: ${present.join(', ')}`,
      )
    }

    assert.deepEqual(game.errors, [])
    await game.close()
  })
})

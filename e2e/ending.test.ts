/**
 * The end of the night, section 8.4.
 *
 * Six steps: the Lena box seals, you take one thing back out of it, the
 * voicemail plays, the key goes down, the door shuts, and the building is there
 * in the morning. Then the card, then the support resources, which is where the
 * game stops talking.
 *
 * ## Why the flags are set rather than played to
 *
 * `acts.test.ts` proves the act 3 chain reaches `desk_done` and
 * `receipts_found` by walking it. Walking it again here would cost a minute to
 * re-prove something already proved, so this file starts from the state that
 * chain produces and asks a different question: given that the night is over,
 * does the ending run correctly. The two files divide the work rather than
 * overlap, and `e2e/full/playthrough.test.ts` joins them back up.
 *
 * ## The one that matters most
 *
 * Hard Rule 9 and section 11: the last thing the game does is hand the player to
 * the support resources. Everything else here is a sequence working. That one is
 * the reason the sequence exists.
 */

import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'

import type { Browser } from 'playwright-core'

import { launch } from './browser.ts'
import { at, open, type Driver } from './game.ts'
import { base } from './setup.ts'

/**
 * Puts a dozen things in the Lena box and finishes act 3's chain.
 *
 * Twelve rather than three so the chooser has to scroll, which is a different
 * layout from a short list and the one a real playthrough produces.
 */
async function endTheNight(game: Driver): Promise<void> {
  await game.dev((dev) => {
    let packed = 0
    const placed = dev['placed'] as { byObject: Map<string, unknown> }
    for (const id of placed.byObject.keys()) {
      if (packed >= 12) break
      const objects = dev.state['objects'] as Record<string, unknown>
      const existing = objects[id] as { second_look_seen?: boolean } | undefined
      objects[id] = {
        examined: true,
        second_look_seen: existing?.second_look_seen === true,
        sorted_to: 'lena',
      }
      dev.state['sorted_count'] = (dev.state['sorted_count'] as number) + 1
      packed += 1
    }

    dev.state['thread_read'] = true
    dev.state['desk_done'] = true
    dev.state['receipts_found'] = true
  })

  await game.until(
    'document.querySelector("canvas").__dev.ending.hasEnded() === true',
    'the night to end once the desk and the bag are both done',
  )
}

describe('the end of the night', () => {
  let browser: Browser

  before(async () => { browser = await launch() })
  after(async () => { await browser?.close() })

  it('offers one thing back out of the sealed box, and preselects nothing', async () => {
    const game = await open(browser, at(base(), { act: 3, room: 'living_room' }))
    await game.begin()
    await endTheNight(game)

    await game.until(
      'document.querySelector(".overlay")?.classList.contains("is-choose") === true',
      'the take-one-thing chooser',
    )

    const chooser = await game.page.evaluate(() => ({
      lead: document.querySelector('.choose-lead')?.textContent ?? '',
      hint: document.querySelector('.choose-hint')?.textContent ?? '',
      options: [...document.querySelectorAll('.choose-option')].map((o) => o.textContent ?? ''),
      highlighted: [...document.querySelectorAll('.choose-option')]
        .filter((o) => o.classList.contains('is-highlighted')).length,
    }))

    assert.match(chooser.lead, /Take one thing/, 'the prompt says what is being asked')
    assert.ok(chooser.options.length >= 12, `everything in the box is listed, got ${chooser.options.length}`)

    // v0.5, and it is a content decision rather than a styling one. Highlighting
    // the first option arms Enter on a choice nobody has read, and this is the
    // one irreversible choice in the game.
    assert.equal(chooser.highlighted, 0, 'and nothing is preselected')

    assert.deepEqual(game.errors, [])
    await game.close()
  })

  it('lets the player take nothing, which is a real answer', async () => {
    const game = await open(browser, at(base(), { act: 3, room: 'living_room' }))
    await game.begin()
    await endTheNight(game)

    await game.until(
      'document.querySelector(".overlay")?.classList.contains("is-choose") === true',
      'the take-one-thing chooser',
    )

    await game.page.keyboard.press('Escape')
    await game.until(
      'document.querySelector(".overlay")?.classList.contains("is-choose") === false',
      'the chooser to close on Escape',
    )

    assert.equal(await game.dev((dev) => dev.state['taken']), null, 'and nothing was taken')
    assert.deepEqual(game.errors, [])
    await game.close()
  })

  it('runs to the support resources, and clears the checkpoint on the way', async () => {
    const game = await open(browser, at(base(), { act: 3, room: 'living_room' }))
    await game.begin()
    await endTheNight(game)

    // A checkpoint has to exist for its removal to mean anything. Starting at
    // `?act=3` means no act ever *began*, so nothing wrote one, and the first
    // version of this check asserted a key was absent that had never been
    // present. It passed with `clearCheckpoint()` commented out.
    await game.page.evaluate(() =>
      localStorage.setItem('sispr.checkpoint', JSON.stringify({ version: 2, state: { act: 3 } })))
    assert.notEqual(
      await game.page.evaluate(() => localStorage.getItem('sispr.checkpoint')),
      null,
      'there is a checkpoint to clear',
    )

    await game.until(
      'document.querySelector(".overlay")?.classList.contains("is-choose") === true',
      'the take-one-thing chooser',
    )
    await game.page.keyboard.press('ArrowDown')
    await game.page.keyboard.press('Enter')

    const taken = await game.dev((dev) => dev.state['taken'])
    assert.notEqual(taken, null, 'something came back out of the box')

    // Section 8.4 into section 11. The whole sequence, at its own pace: the
    // voicemail, the key in the bowl, the door, the street at dawn, the card.
    // About thirty seconds, most of it deliberate, so this wait is given real
    // room rather than the default.
    //
    // Matched case-insensitively on purpose. The title is title case in the
    // markup and upper case on screen, because the capitals are a text-transform
    // rather than the content, and an assertion that reads `textContent` and
    // expects what it sees rendered is an assertion about a stylesheet.
    await game.until(
      '/someone is still paying the rent/i.test(document.body.textContent ?? "")'
      + ' && /struggling/i.test(document.body.textContent ?? "")',
      'the support resources, which is where the game stops talking',
      120_000,
    )

    const resources = await game.page.evaluate(() =>
      [...document.querySelectorAll('a')].map((a) => a.href).filter((h) => h.startsWith('https://')))
    assert.ok(resources.length > 0, 'Hard Rule 9: the last screen carries a reachable resource')

    // The night is over, so a title screen offering "Continue from act 3" would
    // be offering to walk back into an ending that has already happened.
    assert.equal(
      await game.page.evaluate(() => localStorage.getItem('sispr.checkpoint')),
      null,
      'and the checkpoint is gone',
    )

    assert.deepEqual(game.errors, [])
    await game.close()
  })
})

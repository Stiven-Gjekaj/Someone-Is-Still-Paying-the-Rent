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
import { after, before, describe, it } from 'node:test'

import type { Browser, Page } from 'playwright-core'

import { launch } from './browser.ts'
import { at, open } from './game.ts'
import { base } from './setup.ts'

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
})

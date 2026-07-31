// Read the game's words at a given text size, with your own eyes.
//
//   node e2e/tools/read.mjs <url> <out-dir> [scale]
//   node e2e/tools/read.mjs http://localhost:4173/ /tmp/largest 2
//
// A tool, not a test. Like `look.mjs` it asserts nothing and never fails. Where
// `look.mjs` puts a frame of the flat on disk, this one puts every screen that
// has words on it: the advisory, the title, a document, the pause menu, the
// comfort panel, and the support resources.
//
// It exists because v0.8 added a text size and a suite cannot judge the thing
// that setting is for. `e2e/access.test.ts` can prove the type grew and that the
// page does not scroll sideways, and both of those were worth proving, but
// neither notices a line that has crept under the goal text or a card whose last
// sentence is now half off the bottom. A person has to look.
//
// The size is seeded into `localStorage` before the page loads rather than
// poked into the DOM afterwards, so what gets photographed is the real setting
// arriving down the real path.
import { launch } from '../browser.ts'

const [url, out, scale = '1'] = process.argv.slice(2)

if (url === undefined || out === undefined) {
  console.error('usage: node e2e/tools/read.mjs <url> <out-dir> [scale]')
  process.exit(2)
}

const browser = await launch()
// The same 1200x750 as `look.mjs`, for the same reason: a check does not need to
// see anything and a person does. Judging a layout at 320x200 judges the
// harness's viewport rather than the game's.
const page = await browser.newPage({ viewport: { width: 1200, height: 750 } })

const noise = []
page.on('console', (m) => { if (m.type() === 'error') noise.push(m.text()) })
page.on('pageerror', (e) => noise.push(String(e)))

await page.addInitScript((value) => {
  window.localStorage.setItem('sispr.settings', JSON.stringify({
    headBob: true, lookSensitivity: 1, fieldOfView: 70, volume: 0.8, textScale: value,
  }))
}, Number(scale))

const shots = []

async function shoot(name) {
  const path = `${out}/${name}.png`
  await page.screenshot({ path, timeout: 120_000 })
  shots.push(path)
}

/** Tabs to a labelled control and presses it. Nothing here touches the mouse. */
async function press(label) {
  for (let i = 0; i < 40; i += 1) {
    const on = await page.evaluate(() => (document.activeElement?.textContent ?? '').trim())
    if (on === label) { await page.keyboard.press('Enter'); return true }
    await page.keyboard.press('Tab')
  }
  return false
}

// Section 12's dev parameters. `?room=` puts the camera somewhere known and
// hands over `canvas.__dev`, which is how the document below gets opened without
// a pointer lock. It does not skip the advisory or the title.
const target = new URL(url)
target.searchParams.set('room', 'entry_hall')

await page.goto(target.href, { waitUntil: 'networkidle' })
await page.waitForTimeout(1000)

// Section 0. The first words anybody reads, and the ones that most need to fit.
await shoot('1-advisory')

await press('Continue')
await page.waitForTimeout(1000)
await shoot('2-title')

await press('Begin')
await page.waitForFunction('document.querySelector("canvas") !== null', null, { timeout: 60_000 })
await page.waitForTimeout(5000)

/** Puts something under the crosshair by cycling, the way Tab does. */
async function aim(id) {
  return page.evaluate((want) => {
    const dev = document.querySelector('canvas')?.__dev
    if (dev === undefined) return false
    for (let i = 0; i < 40; i += 1) {
      if (dev.targeting.update()?.id === want) return true
      dev.cycle('right')
    }
    return false
  }, id)
}

// A document, which is the longest single block of text in the game, and the
// one the whole night starts from.
if (await aim('lena_note')) {
  await page.evaluate(() => { document.querySelector('canvas')?.__dev.interact() })
  await page.waitForTimeout(1500)
  await shoot('4-document')
  await page.keyboard.press('Escape')
  await page.waitForTimeout(1000)
}

// The prompt and the goal line, which are the only words the flat itself shows,
// and the goal line only exists once the note above has been read.
await aim('team_bib')
await page.waitForTimeout(600)
await shoot('5-flat')

await page.keyboard.press('Escape')
await page.waitForTimeout(800)
await shoot('6-menu')

if (await press('Comfort')) {
  await page.waitForTimeout(800)
  await shoot('7-comfort')
  // Back rather than Escape: Escape here backs out of the pause menu entirely
  // and lands in the flat, and the resources are one level up from that.
  await press('Back')
  await page.waitForTimeout(800)
}

// Hard Rule 9. The one panel in the game that has to be legible no matter what,
// because it is the one somebody might need to read in a hurry.
if (await press('Support resources')) {
  await page.waitForTimeout(800)
  await shoot('8-resources')
}

console.log(`text scale ${scale}`)
console.log(shots.join('\n'))
console.log('console errors:', noise.length === 0 ? '(none)' : noise.join(' | '))

await browser.close()

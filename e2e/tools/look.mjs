// Look at the game, from anywhere, with your own eyes.
//
//   node e2e/tools/look.mjs <url> <out.png> [room] [yaw] [pitch]
//   node e2e/tools/look.mjs http://localhost:4173/ /tmp/kitchen.png kitchen 180 -20
//
// A tool, not a test. It asserts nothing and it never fails: its whole job is to
// put a frame on disk and print what the game thinks it is showing, so a person
// can disagree with it.
//
// That sounds like a luxury next to a suite that checks things automatically. It
// is not. Three of the hardest bugs in this project were found by looking:
// an object placed inside a wardrobe door, a dawn shot that read as a drop, and
// a room that was lit but had nothing in it. None of those is expressible as an
// assertion, because in each case the code did exactly what it was told.
//
// Section 12's dev parameters exist for this. Nothing here needs the pointer.
import { launch } from '../browser.ts'

const [url, out, room, yaw, pitch] = process.argv.slice(2)

if (url === undefined || out === undefined) {
  console.error('usage: node e2e/tools/look.mjs <url> <out.png> [room] [yaw] [pitch]')
  process.exit(2)
}

const target = new URL(url)
if (room !== undefined) target.searchParams.set('room', room)
if (yaw !== undefined) target.searchParams.set('yaw', yaw)
if (pitch !== undefined) target.searchParams.set('pitch', pitch)

const browser = await launch()
// Bigger than the suite runs at, because a check does not need to see anything
// and a person does. Not denser, though: a software rasteriser pays per pixel
// twice over, once to draw the frame and once to capture it, and 2400x1500 takes
// longer to screenshot than the default timeout allows.
const page = await browser.newPage({ viewport: { width: 1200, height: 750 } })

const noise = []
page.on('console', (m) => { if (m.type() === 'error') noise.push(m.text()) })
page.on('pageerror', (e) => noise.push(String(e)))

await page.goto(target.href, { waitUntil: 'networkidle' })

for (const label of ['Continue', 'Begin']) {
  for (let i = 0; i < 30; i += 1) {
    const on = await page.evaluate(() => (document.activeElement?.textContent ?? '').trim())
    if (on === label) { await page.keyboard.press('Enter'); break }
    await page.keyboard.press('Tab')
  }
}

await page.waitForFunction('document.querySelector("canvas") !== null', null, { timeout: 60_000 })
// Long enough for the textures to have been drawn and the first frames to land.
await page.waitForTimeout(4000)

const seen = await page.evaluate(() => {
  const dev = document.querySelector('canvas')?.__dev
  if (dev === undefined) return null
  return {
    at: [dev.camera.position.x, dev.camera.position.y, dev.camera.position.z].map((n) => n.toFixed(2)),
    yaw: ((dev.camera.rotation.y * 180) / Math.PI).toFixed(1),
    act: dev.state.act,
    placed: dev.placed.byObject.size,
    crosshair: dev.targeting.update()?.id ?? '(nothing)',
  }
})

await page.screenshot({ path: out, timeout: 120_000 })
console.log(`wrote ${out}`)
console.log(seen === null ? 'no dev handle: pass a room to get one' : JSON.stringify(seen, null, 1))
console.log('console errors:', noise.length === 0 ? '(none)' : noise.join(' | '))

await browser.close()

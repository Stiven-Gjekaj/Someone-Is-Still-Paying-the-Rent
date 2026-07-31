// Where an object actually is, and how hard it is to aim at from a real spot.
//
//   node e2e/tools/reach.mjs <url> <object-id> [room] [act]
//   node e2e/tools/reach.mjs http://localhost:4173/ junk_drawer kitchen 2
//
// A tool, not a test. It prints and never fails.
//
// It exists because of a measurement mistake worth remembering. A coarse scan
// from the middle of the kitchen reported the junk drawer unreachable, and the
// obvious conclusion was that placement had gone wrong. The drawer is a 30mm
// panel and it is visible from about a third of one percent of the angles from
// that one spot: a scan from nine standing positions finds it from ninety out of
// a hundred. The game was right and the measurement was wrong.
//
// So this reports coverage from a grid rather than a verdict from one place, and
// it says how many of the sampled positions could see the thing at all.
import { launch } from '../browser.ts'
import { readFileSync } from 'node:fs'

// Four objects are furniture rather than props: the desk, the vinyl shelf, the
// junk drawer and the wardrobe are built into the room and never appear in
// `placed.byObject`. Reporting those as missing from the flat is wrong and it is
// a mistake this project has already made once, so the distinction is drawn
// here rather than left to whoever reads the output.
const FURNITURE_BACKED = new Set(
  JSON.parse(readFileSync(new URL('../../data/furniture.json', import.meta.url), 'utf8'))
    .map((piece) => piece.object)
    .filter((id) => typeof id === 'string'),
)

const [url, id, room, act] = process.argv.slice(2)

if (url === undefined || id === undefined) {
  console.error('usage: node e2e/tools/reach.mjs <url> <object-id> [room] [act]')
  process.exit(2)
}

const plan = JSON.parse(readFileSync(new URL('../../data/floorplan.json', import.meta.url), 'utf8'))
const rect = plan.rooms.find((r) => r.id === room)

const target = new URL(url)
target.searchParams.set('room', room ?? 'living_room')
if (act !== undefined) target.searchParams.set('act', act)

const browser = await launch()
const page = await browser.newPage({ viewport: { width: 320, height: 200 } })
await page.goto(target.href, { waitUntil: 'networkidle' })

for (const label of ['Continue', 'Begin']) {
  for (let i = 0; i < 30; i += 1) {
    const on = await page.evaluate(() => (document.activeElement?.textContent ?? '').trim())
    if (on === label) { await page.keyboard.press('Enter'); break }
    await page.keyboard.press('Tab')
  }
}
await page.waitForFunction('document.querySelector("canvas").__dev !== undefined', null, { timeout: 60_000 })

const spots = []
if (rect === undefined) {
  spots.push(null)
} else {
  for (let fx = 0.15; fx <= 0.86; fx += 0.175) {
    for (let fz = 0.15; fz <= 0.86; fz += 0.175) {
      spots.push([
        rect.min[0] + (rect.max[0] - rect.min[0]) * fx,
        plan.eye_height,
        rect.min[1] + (rect.max[1] - rect.min[1]) * fz,
      ])
    }
  }
}

const found = await page.evaluate(({ id, spots }) => {
  const dev = document.querySelector('canvas').__dev
  const placed = dev.placed.byObject.get(id)
  const seen = []

  for (const spot of spots) {
    if (spot !== null) dev.camera.position.set(spot[0], spot[1], spot[2])
    let hits = 0
    for (let yaw = 0; yaw < 360; yaw += 2) {
      for (let pitch = -70; pitch <= 25; pitch += 2) {
        dev.camera.rotation.order = 'YXZ'
        dev.camera.rotation.y = (yaw * Math.PI) / 180
        dev.camera.rotation.x = (pitch * Math.PI) / 180
        dev.camera.updateMatrixWorld(true)
        if (dev.targeting.update()?.id === id) hits += 1
      }
    }
    seen.push({ spot: spot?.map((n) => Number(n.toFixed(2))) ?? null, hits })
  }

  return {
    inTheFlat: dev.placed.byObject.has(id),
    at: placed === undefined ? null : [placed.position.x, placed.position.y, placed.position.z]
      .map((n) => Number(n.toFixed(2))),
    seen,
  }
}, { id, spots })

const reachable = found.seen.filter((s) => s.hits > 0).length
const where = found.inTheFlat
  ? `a placed prop at ${JSON.stringify(found.at)}`
  : FURNITURE_BACKED.has(id)
    ? 'built into the furniture, so it has no prop of its own'
    : 'NOT in the flat: either hidden behind a discovery, or from a later act'
console.log(`${id}: ${where}`)
console.log(`visible from ${reachable} of ${found.seen.length} standing positions`)
for (const s of found.seen) {
  console.log(`  ${JSON.stringify(s.spot)}  ${s.hits === 0 ? 'never' : `${s.hits} angles`}`)
}

await browser.close()

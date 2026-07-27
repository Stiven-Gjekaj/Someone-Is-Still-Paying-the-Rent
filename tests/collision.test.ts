/**
 * The flat has to be walkable.
 *
 * A doorway an inch too narrow, or a wardrobe nudged across a threshold, makes a
 * room unreachable, and nothing else in the pipeline notices. The flood fill here
 * is the check that would otherwise be a person walking into every corner.
 *
 * Also guards Hard Rule 10: the balcony standoff has to keep the player back
 * from the parapet, and that is a number worth asserting rather than trusting.
 */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

import { createCollider } from '../src/player/collision.ts'
import type { FloorPlan, FurniturePiece } from '../src/content/types.ts'

const plan = JSON.parse(
  readFileSync(new URL('../data/floorplan.json', import.meta.url), 'utf8'),
) as FloorPlan

const furniture = JSON.parse(
  readFileSync(new URL('../data/furniture.json', import.meta.url), 'utf8'),
) as FurniturePiece[]

const collider = createCollider(plan, furniture)

const STEP = 0.08
const key = (i: number, j: number): string => `${i},${j}`

function floodFromSpawn(): Set<string> {
  const start: [number, number] = [
    Math.round(plan.spawn.position[0] / STEP),
    Math.round(plan.spawn.position[1] / STEP),
  ]

  const seen = new Set<string>([key(start[0], start[1])])
  const queue: [number, number][] = [start]
  const steps: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]]

  while (queue.length > 0) {
    const cell = queue.shift()
    if (cell === undefined) break

    for (const [di, dj] of steps) {
      const ni = cell[0] + di
      const nj = cell[1] + dj
      const k = key(ni, nj)
      if (seen.has(k)) continue
      if (!collider.standable(ni * STEP, nj * STEP)) continue
      seen.add(k)
      queue.push([ni, nj])
    }
  }

  return seen
}

describe('the flat is walkable', () => {
  const reached = floodFromSpawn()

  it('starts the player somewhere they can stand', () => {
    assert.ok(collider.standable(plan.spawn.position[0], plan.spawn.position[1]))
  })

  it('does not leak outside the building', () => {
    // A missing wall would let the flood run away across the plane.
    assert.ok(reached.size < 20000, `flood reached ${reached.size} cells, which is far too many`)
  })

  for (const room of plan.rooms) {
    it(`can reach ${room.id}`, () => {
      let found = false

      for (let x = room.min[0]; x <= room.max[0] && !found; x += STEP) {
        for (let z = room.min[1]; z <= room.max[1] && !found; z += STEP) {
          const i = Math.round(x / STEP)
          const j = Math.round(z / STEP)
          if (collider.standable(i * STEP, j * STEP) && reached.has(key(i, j))) found = true
        }
      }

      assert.ok(found, `${room.id} cannot be walked to from the front door`)
    })
  }
})

describe('walls and furniture', () => {
  it('keeps the player out of the walls', () => {
    assert.equal(collider.standable(-2, 3), false)
    assert.equal(collider.standable(20, 20), false)
  })

  it('keeps the player out of the bed', () => {
    const bed = furniture.find((piece) => piece.id === 'bed')
    assert.ok(bed !== undefined)
    assert.equal(collider.standable(bed.position[0], bed.position[1]), false)
  })

  it('slides along a wall instead of sticking to it', () => {
    // Walk hard into the kitchen's west wall while also moving north. The wall
    // should take the sideways component and leave the rest.
    const fromX = 1.0
    const fromZ = 2.0
    const settled = collider.resolve(fromX, fromZ, -5, fromZ - 0.1)

    assert.notEqual(settled.z, fromZ, 'the move along the wall was thrown away')
    assert.ok(settled.x > 0, 'the player was allowed through the wall')
  })
})

describe('Hard Rule 10', () => {
  const balcony = plan.rooms.find((room) => room.id === 'balcony')

  it('has a solid parapet at chest height', () => {
    assert.ok(balcony !== undefined)
    assert.ok(balcony.parapet !== undefined, 'the balcony has no parapet')
    assert.ok(balcony.parapet.height >= 1.0, 'the parapet is low enough to look over comfortably')
  })

  it('keeps the player well back from every parapet side', () => {
    assert.ok(balcony !== undefined && balcony.parapet !== undefined)

    // Standing right against the parapet is what would let the drop compose into
    // a shot, so the collider must refuse it on each open side.
    const midX = (balcony.min[0] + balcony.max[0]) / 2
    const midZ = (balcony.min[1] + balcony.max[1]) / 2

    assert.equal(collider.standable(midX, balcony.min[1] + 0.3), false, 'north')
    assert.equal(collider.standable(balcony.min[0] + 0.3, midZ), false, 'west')
    assert.equal(collider.standable(balcony.max[0] - 0.3, midZ), false, 'east')
  })

  it('still lets the player stand on the balcony at all', () => {
    assert.ok(balcony !== undefined)
    const midX = (balcony.min[0] + balcony.max[0]) / 2
    const midZ = (balcony.min[1] + balcony.max[1]) / 2
    assert.equal(collider.standable(midX, midZ), true)
  })
})

/**
 * Builds the flat from `data/floorplan.json`.
 *
 * Walls are single-sided planes facing into their own room rather than solid
 * boxes. Two rooms either side of a shared wall each get their own plane, and
 * because the far one faces away it is culled rather than fighting for the same
 * depth. Openings are cut by splitting the wall into up to four quads around
 * each hole, which is exact and needs no CSG.
 *
 * Doorways get a reveal lining the cut so the wall never reads as paper.
 */

import * as THREE from 'three'

import type {
  FloorMaterial,
  FloorPlan,
  Opening,
  RoomId,
  RoomRect,
  WallSide,
  WindowOpening,
} from '../content/types.ts'
import type { Materials } from './materials.ts'

/**
 * World metres covered by one full cycle of each surface texture. The textures
 * already carry a base repeat, so these are tuned against that rather than being
 * raw tile sizes: floorboards want to land near 14cm wide, wall plaster wants to
 * be invisible, and bathroom tiles want to read as tiles.
 */
const UV_METRES: Record<string, number> = {
  wood: 4.48,
  tile_kitchen: 2.7,
  tile_bathroom: 2.7,
  concrete: 4.8,
  wall: 4.5,
  ceiling: 4.5,
}

/** A gap in a wall, in along-the-wall metres and height above the floor. */
interface Hole {
  low: number
  high: number
  bottom: number
  top: number
}

export interface Flat {
  group: THREE.Group
  plan: FloorPlan
  rooms: RoomRect[]
  /** Which room contains this point on the plan, if any. */
  roomAt(x: number, z: number): RoomId | null
  dispose(): void
}

function scaleUv(geometry: THREE.BufferGeometry, u: number, v: number): void {
  const uv = geometry.getAttribute('uv')
  for (let i = 0; i < uv.count; i += 1) {
    uv.setXY(i, uv.getX(i) * u, uv.getY(i) * v)
  }
  uv.needsUpdate = true
}

function floorMaterialFor(kind: FloorMaterial, materials: Materials): THREE.Material {
  if (kind === 'tile_kitchen') return materials.floorTileKitchen
  if (kind === 'tile_bathroom') return materials.floorTileBathroom
  if (kind === 'concrete') return materials.concrete
  return materials.floorWood
}

/** Rotation about Y that turns a plane's front face into the room. */
function facingRotation(side: WallSide): number {
  if (side === 'north') return 0
  if (side === 'south') return Math.PI
  if (side === 'west') return Math.PI / 2
  return -Math.PI / 2
}

/**
 * Splits a wall into the quads that survive after the holes are cut. Holes are
 * assumed not to overlap, which the validator guarantees for openings and which
 * the plan keeps true for windows.
 */
function wallQuads(spanLow: number, spanHigh: number, height: number, holes: Hole[]): Hole[] {
  const sorted = [...holes].sort((a, b) => a.low - b.low)
  const quads: Hole[] = []
  let cursor = spanLow

  for (const hole of sorted) {
    const low = Math.max(hole.low, spanLow)
    const high = Math.min(hole.high, spanHigh)
    if (high <= low) continue

    if (low > cursor + 1e-6) {
      quads.push({ low: cursor, high: low, bottom: 0, top: height })
    }
    if (hole.bottom > 1e-6) {
      quads.push({ low, high, bottom: 0, top: hole.bottom })
    }
    if (hole.top < height - 1e-6) {
      quads.push({ low, high, bottom: hole.top, top: height })
    }
    cursor = Math.max(cursor, high)
  }

  if (cursor < spanHigh - 1e-6) {
    quads.push({ low: cursor, high: spanHigh, bottom: 0, top: height })
  }

  return quads
}

export function buildFlat(plan: FloorPlan, materials: Materials): Flat {
  const group = new THREE.Group()
  group.name = 'flat'

  const owned: THREE.BufferGeometry[] = []
  const height = plan.wall_height

  function track(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
    owned.push(geometry)
    return geometry
  }

  function box(
    width: number,
    tall: number,
    depth: number,
    material: THREE.Material,
    x: number,
    y: number,
    z: number,
    yaw = 0,
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(track(new THREE.BoxGeometry(width, tall, depth)), material)
    mesh.position.set(x, y, z)
    mesh.rotation.y = yaw
    mesh.castShadow = true
    mesh.receiveShadow = true
    group.add(mesh)
    return mesh
  }

  // Which room does a given wall line belong to on the far side, if any? Used to
  // decide whether an outdoor room needs a wall there at all.
  function hasNeighbour(room: RoomRect, side: WallSide): boolean {
    const at = side === 'north' ? room.min[1] : side === 'south' ? room.max[1] : side === 'west' ? room.min[0] : room.max[0]
    const alongX = side === 'north' || side === 'south'

    return plan.rooms.some((other) => {
      if (other.id === room.id) return false
      const touches = alongX
        ? Math.abs(other.min[1] - at) < 1e-6 || Math.abs(other.max[1] - at) < 1e-6
        : Math.abs(other.min[0] - at) < 1e-6 || Math.abs(other.max[0] - at) < 1e-6
      if (!touches) return false

      const low = alongX ? Math.max(room.min[0], other.min[0]) : Math.max(room.min[1], other.min[1])
      const high = alongX ? Math.min(room.max[0], other.max[0]) : Math.min(room.max[1], other.max[1])
      return high - low > 1e-6
    })
  }

  function openingsOn(room: RoomRect, side: WallSide): Opening[] {
    const at = side === 'north' ? room.min[1] : side === 'south' ? room.max[1] : side === 'west' ? room.min[0] : room.max[0]
    const axis = side === 'north' || side === 'south' ? 'z' : 'x'

    return plan.openings.filter(
      (opening) =>
        opening.wall === axis &&
        Math.abs(opening.at - at) < 1e-6 &&
        opening.between.includes(room.id),
    )
  }

  function windowsOn(room: RoomRect, side: WallSide): WindowOpening[] {
    return plan.windows.filter((w) => w.room === room.id && w.wall === side)
  }

  for (const room of plan.rooms) {
    const width = room.max[0] - room.min[0]
    const depth = room.max[1] - room.min[1]
    const midX = (room.min[0] + room.max[0]) / 2
    const midZ = (room.min[1] + room.max[1]) / 2

    // Floor.
    const floorGeometry = track(new THREE.PlaneGeometry(width, depth))
    scaleUv(floorGeometry, width / (UV_METRES[room.floor] ?? 4), depth / (UV_METRES[room.floor] ?? 4))
    const floor = new THREE.Mesh(floorGeometry, floorMaterialFor(room.floor, materials))
    floor.rotation.x = -Math.PI / 2
    floor.position.set(midX, 0, midZ)
    floor.receiveShadow = true
    floor.name = `floor:${room.id}`
    group.add(floor)

    if (room.ceiling) {
      const ceilingGeometry = track(new THREE.PlaneGeometry(width, depth))
      const uv = UV_METRES['ceiling'] ?? 4.5
      scaleUv(ceilingGeometry, width / uv, depth / uv)
      const ceiling = new THREE.Mesh(ceilingGeometry, materials.ceiling)
      ceiling.rotation.x = Math.PI / 2
      ceiling.position.set(midX, height, midZ)
      ceiling.receiveShadow = true
      group.add(ceiling)
    }

    for (const side of ['north', 'south', 'west', 'east'] as WallSide[]) {
      // An outdoor room only walls the sides it actually shares with the flat.
      // The rest are open air, held by the parapet.
      if (room.outdoor === true && !hasNeighbour(room, side)) continue

      const alongX = side === 'north' || side === 'south'
      const spanLow = alongX ? room.min[0] : room.min[1]
      const spanHigh = alongX ? room.max[0] : room.max[1]

      const holes: Hole[] = []
      for (const opening of openingsOn(room, side)) {
        holes.push({
          low: opening.centre - opening.width / 2,
          high: opening.centre + opening.width / 2,
          bottom: 0,
          top: opening.height,
        })
      }
      for (const w of windowsOn(room, side)) {
        holes.push({
          low: w.centre - w.width / 2,
          high: w.centre + w.width / 2,
          bottom: w.sill,
          top: w.sill + w.height,
        })
      }

      const yaw = facingRotation(side)
      const wallAt = side === 'north' ? room.min[1] : side === 'south' ? room.max[1] : side === 'west' ? room.min[0] : room.max[0]

      for (const quad of wallQuads(spanLow, spanHigh, height, holes)) {
        const quadWidth = quad.high - quad.low
        const quadHeight = quad.top - quad.bottom
        if (quadWidth <= 1e-6 || quadHeight <= 1e-6) continue

        const geometry = track(new THREE.PlaneGeometry(quadWidth, quadHeight))
        const uv = UV_METRES['wall'] ?? 4.5
        scaleUv(geometry, quadWidth / uv, quadHeight / uv)

        const mesh = new THREE.Mesh(geometry, materials.wall)
        const along = (quad.low + quad.high) / 2
        const y = (quad.bottom + quad.top) / 2

        if (alongX) mesh.position.set(along, y, wallAt)
        else mesh.position.set(wallAt, y, along)

        mesh.rotation.y = yaw
        mesh.receiveShadow = true
        mesh.name = `wall:${room.id}:${side}`
        group.add(mesh)
      }
    }

    // Hard Rule 10. Solid, chest height, on every open side.
    //
    // Each end is handled differently depending on what it runs into. Where two
    // parapets meet it runs long by half a thickness so the corner closes up.
    // Where it meets the building it stops just short: walls here are planes with
    // no thickness, so an end face landing exactly on one is coplanar with it and
    // the two fight for the same depth. That reads from inside the living room as
    // a post standing in the middle of the wall.
    if (room.parapet !== undefined) {
      const { height: parapetHeight, thickness, sides } = room.parapet
      const half = thickness / 2
      const clearance = 0.03

      for (const side of sides) {
        const alongX = side === 'north' || side === 'south'
        const at = side === 'north' ? room.min[1] : side === 'south' ? room.max[1] : side === 'west' ? room.min[0] : room.max[0]

        const lowNeighbour: WallSide = alongX ? 'west' : 'north'
        const highNeighbour: WallSide = alongX ? 'east' : 'south'

        const low = (alongX ? room.min[0] : room.min[1]) + (sides.includes(lowNeighbour) ? -half : clearance)
        const high = (alongX ? room.max[0] : room.max[1]) + (sides.includes(highNeighbour) ? half : -clearance)
        const centre = (low + high) / 2

        if (alongX) box(high - low, parapetHeight, thickness, materials.concrete, centre, parapetHeight / 2, at)
        else box(thickness, parapetHeight, high - low, materials.concrete, at, parapetHeight / 2, centre)
      }
    }
  }

  // Reveals, so a cut wall has a lining rather than an edge.
  const reveal = Math.max(plan.wall_thickness, 0.08)

  for (const opening of plan.openings) {
    const alongX = opening.wall === 'z'
    const low = opening.centre - opening.width / 2
    const high = opening.centre + opening.width / 2
    const jamb = 0.05

    const place = (along: number, y: number, w: number, h: number, d: number): void => {
      if (alongX) box(w, h, d, materials.skirting, along, y, opening.at)
      else box(d, h, w, materials.skirting, opening.at, y, along)
    }

    place(low - jamb / 2, opening.height / 2, jamb, opening.height, reveal)
    place(high + jamb / 2, opening.height / 2, jamb, opening.height, reveal)
    place(opening.centre, opening.height + jamb / 2, opening.width + jamb * 2, jamb, reveal)

    // The front door stays shut. Nobody is coming up the stairs tonight.
    if (opening.kind === 'front_door') {
      const slab = 0.045
      if (alongX) box(opening.width, opening.height, slab, materials.woodMid, opening.centre, opening.height / 2, opening.at)
      else box(slab, opening.height, opening.width, materials.woodMid, opening.at, opening.height / 2, opening.centre)
    }
  }

  // Windows: glass in a frame, on a sill.
  for (const w of plan.windows) {
    const room = plan.rooms.find((r) => r.id === w.room)
    if (room === undefined) continue

    const alongX = w.wall === 'north' || w.wall === 'south'
    const at = w.wall === 'north' ? room.min[1] : w.wall === 'south' ? room.max[1] : w.wall === 'west' ? room.min[0] : room.max[0]
    const midY = w.sill + w.height / 2
    const bar = 0.06

    const glassGeometry = track(new THREE.PlaneGeometry(w.width, w.height))
    const glass = new THREE.Mesh(glassGeometry, materials.glass)
    glass.rotation.y = facingRotation(w.wall)
    if (alongX) glass.position.set(w.centre, midY, at)
    else glass.position.set(at, midY, w.centre)
    glass.name = `window:${w.room}:${w.wall}`
    group.add(glass)

    const frame = (along: number, y: number, len: number, thick: number): void => {
      if (alongX) box(len, thick, reveal, materials.skirting, along, y, at)
      else box(reveal, thick, len, materials.skirting, at, y, along)
    }

    frame(w.centre, w.sill - bar / 2, w.width + bar * 2, bar)
    frame(w.centre, w.sill + w.height + bar / 2, w.width + bar * 2, bar)

    const upright = (along: number): void => {
      if (alongX) box(bar, w.height, reveal, materials.skirting, along, midY, at)
      else box(reveal, w.height, bar, materials.skirting, at, midY, along)
    }
    upright(w.centre - w.width / 2 - bar / 2)
    upright(w.centre + w.width / 2 + bar / 2)

    // Sill, jutting into the room. The kitchen one holds the cuttings jar.
    const sillDepth = 0.16
    const inward = w.wall === 'north' ? sillDepth / 2 : w.wall === 'south' ? -sillDepth / 2 : 0
    const inwardX = w.wall === 'west' ? sillDepth / 2 : w.wall === 'east' ? -sillDepth / 2 : 0

    if (alongX) {
      box(w.width + bar * 2, 0.04, sillDepth, materials.skirting, w.centre, w.sill - bar, at + inward)
    } else {
      box(sillDepth, 0.04, w.width + bar * 2, materials.skirting, at + inwardX, w.sill - bar, w.centre)
    }
  }

  return {
    group,
    plan,
    rooms: plan.rooms,

    roomAt(x: number, z: number): RoomId | null {
      for (const room of plan.rooms) {
        if (x >= room.min[0] && x <= room.max[0] && z >= room.min[1] && z <= room.max[1]) {
          return room.id
        }
      }
      return null
    },

    dispose(): void {
      for (const geometry of owned) geometry.dispose()
      owned.length = 0
      group.clear()
    },
  }
}

/**
 * Builds the furniture and registers the surfaces objects come to rest on.
 *
 * A surface is an anchor plus an orientation, not a mesh. Placement data names
 * one and gives an offset from it, which keeps `data/placement.json` readable
 * ("on the bedside table, a little to the left") instead of a list of world
 * coordinates nobody can check by eye.
 *
 * Three surfaces are registered for every room without anyone writing them down:
 * the floor, each of the four walls, and the board under each window. Between
 * them they cover the objects that do not sit on furniture at all, which is most
 * of the corkboard, calendar, and windowsill population.
 */

import * as THREE from 'three'

import type {
  FloorPlan,
  FurniturePiece,
  RoomRect,
  SurfaceOrientation,
  WallSide,
} from '../content/types.ts'
import { materialByKey, type Materials } from './materials.ts'

export interface SurfaceAnchor {
  name: string
  orientation: SurfaceOrientation
  position: THREE.Vector3
  /** Rotation about Y that turns a prop to face out of the surface. */
  yaw: number
  /** Usable size, [along, across] for a horizontal surface. */
  extent: THREE.Vector2
}

export interface Furnishings {
  group: THREE.Group
  surfaces: Map<string, SurfaceAnchor>
  dispose(): void
}

/** Which way a prop turns to face out of a wall on this side of a room. */
function yawForFacing(side: WallSide): number {
  if (side === 'north') return Math.PI
  if (side === 'south') return 0
  if (side === 'west') return -Math.PI / 2
  return Math.PI / 2
}

function centreOf(room: RoomRect): [number, number] {
  return [(room.min[0] + room.max[0]) / 2, (room.min[1] + room.max[1]) / 2]
}

export function buildFurniture(
  plan: FloorPlan,
  pieces: FurniturePiece[],
  materials: Materials,
): Furnishings {
  const group = new THREE.Group()
  group.name = 'furniture'

  const owned: THREE.BufferGeometry[] = []
  const surfaces = new Map<string, SurfaceAnchor>()

  function slab(
    parent: THREE.Group,
    width: number,
    height: number,
    depth: number,
    material: THREE.Material,
    x: number,
    y: number,
    z: number,
  ): THREE.Mesh {
    const geometry = new THREE.BoxGeometry(width, height, depth)
    owned.push(geometry)
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(x, y, z)
    mesh.castShadow = true
    mesh.receiveShadow = true
    parent.add(mesh)
    return mesh
  }

  /**
   * Each shape is built inside a box centred on the origin in X and Z, standing
   * from y = 0 up to its height, so the caller only has to place and turn it.
   */
  function buildShape(piece: FurniturePiece, material: THREE.Material): THREE.Group {
    const shape = new THREE.Group()
    const [w, h, d] = piece.size
    const legs = materials.woodDark

    if (piece.shape === 'table' || piece.shape === 'desk') {
      const top = 0.04
      slab(shape, w, top, d, material, 0, h - top / 2, 0)

      if (piece.shape === 'desk') {
        slab(shape, 0.04, h - top, d * 0.9, material, -w / 2 + 0.03, (h - top) / 2, 0)
        slab(shape, 0.04, h - top, d * 0.9, material, w / 2 - 0.03, (h - top) / 2, 0)
      } else {
        const inset = 0.06
        for (const sx of [-1, 1]) {
          for (const sz of [-1, 1]) {
            slab(shape, 0.05, h - top, 0.05, legs, sx * (w / 2 - inset), (h - top) / 2, sz * (d / 2 - inset))
          }
        }
      }
      return shape
    }

    if (piece.shape === 'counter') {
      // Toe kick, so it reads as fitted rather than free-standing.
      slab(shape, w, h - 0.12, d - 0.06, material, 0, (h - 0.12) / 2 + 0.12, 0.03)
      slab(shape, w, 0.12, d - 0.16, materials.woodDark, 0, 0.06, 0.08)
      slab(shape, w, 0.04, d, materials.woodPale, 0, h - 0.02, 0)
      return shape
    }

    if (piece.shape === 'shelf') {
      const board = 0.03
      slab(shape, board, h, d, material, -w / 2 + board / 2, h / 2, 0)
      slab(shape, board, h, d, material, w / 2 - board / 2, h / 2, 0)
      const shelves = Math.max(2, Math.round(h / 0.34))
      for (let i = 0; i <= shelves; i += 1) {
        slab(shape, w - board * 2, board, d, material, 0, (h / shelves) * i, 0)
      }
      slab(shape, w, board, d, material, 0, h - board / 2, 0)
      return shape
    }

    if (piece.shape === 'sofa') {
      const seat = 0.46
      slab(shape, w, seat - 0.1, d, material, 0, (seat - 0.1) / 2 + 0.1, 0)
      slab(shape, w, h - seat, 0.2, material, 0, seat + (h - seat) / 2, -d / 2 + 0.1)
      for (const sx of [-1, 1]) {
        slab(shape, 0.18, h - seat + 0.12, d, material, sx * (w / 2 - 0.09), seat + (h - seat) / 2 - 0.06, 0)
      }
      return shape
    }

    if (piece.shape === 'bed') {
      // A frame on legs rather than a divan. The `under_bed` surface is a real
      // place in section 5 and things get put on it, so there has to be an actual
      // gap: a solid base from the floor up would swallow the whole Mira thread.
      const clearance = 0.19
      const frame = 0.1

      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          slab(
            shape,
            0.07,
            clearance,
            0.07,
            materials.woodDark,
            sx * (w / 2 - 0.07),
            clearance / 2,
            sz * (d / 2 - 0.07),
          )
        }
      }

      slab(shape, w, frame, d, materials.woodDark, 0, clearance + frame / 2, 0)
      slab(shape, w - 0.06, h - clearance - frame, d - 0.06, material, 0, clearance + frame + (h - clearance - frame) / 2, 0)
      slab(shape, w * 0.8, 0.1, 0.3, materials.fabricGrey, 0, h + 0.05, -d / 2 + 0.22)
      slab(shape, w, 0.5, 0.05, materials.woodDark, 0, 0.5, -d / 2 - 0.02)
      return shape
    }

    if (piece.shape === 'cabinet') {
      slab(shape, w, h, d, material, 0, h / 2, 0)
      // Door split and two handles, so it does not read as a solid block.
      slab(shape, 0.012, h - 0.1, 0.01, materials.plasticDark, 0, h / 2, d / 2 + 0.005)
      for (const sx of [-1, 1]) {
        slab(shape, 0.02, 0.16, 0.03, materials.metalDull, sx * 0.06, h * 0.52, d / 2 + 0.02)
      }
      return shape
    }

    if (piece.shape === 'wardrobe') {
      // Standing open. It has to be: the shelf inside it is a named surface with
      // an object on it, and a shut wardrobe is a box you cannot see into. It is
      // also true to the night. You do not pack a flat with the doors closed.
      const panel = 0.03

      slab(shape, panel, h, d, material, -w / 2 + panel / 2, h / 2, 0)
      slab(shape, panel, h, d, material, w / 2 - panel / 2, h / 2, 0)
      slab(shape, w, panel, d, material, 0, h - panel / 2, 0)
      slab(shape, w, panel, d, material, 0, panel / 2, 0)
      slab(shape, w, h, panel, materials.woodDark, 0, h / 2, -d / 2 + panel / 2)

      // The shelf the invoice folder sits on, drawn where the surface says it is.
      for (const spec of piece.surfaces ?? []) {
        if (spec.orientation === 'vertical') continue
        slab(shape, w - panel * 2, 0.024, d - panel, material, 0, spec.height - 0.012, 0)
      }

      // The rail, and what is still hanging off it.
      const rail = h * 0.62
      slab(shape, w - panel * 2, 0.02, 0.02, materials.metalDull, 0, rail, 0.02)
      for (const at of [-0.3, -0.1, 0.16]) {
        slab(shape, 0.11, 0.66, 0.14, materials.fabricGrey, at, rail - 0.35, 0.02)
      }

      // The left door, swung wide. The right one is off its hinges against the
      // wall, which is where it has been since a flatmate took it off years ago.
      const door = new THREE.Group()
      slab(door, w / 2, h - 0.06, 0.026, material, w / 4, (h - 0.06) / 2, 0)
      slab(door, 0.02, 0.16, 0.03, materials.metalDull, 0.06, h * 0.52, 0.03)
      door.position.set(-w / 2, 0, d / 2)
      door.rotation.y = 1.9
      shape.add(door)

      return shape
    }

    if (piece.shape === 'appliance') {
      slab(shape, w, h, d, material, 0, h / 2, 0)
      slab(shape, w - 0.06, 0.01, 0.01, materials.metalDull, 0, h * 0.42, d / 2 + 0.006)
      slab(shape, 0.03, 0.5, 0.04, materials.metalDull, w / 2 - 0.09, h * 0.7, d / 2 + 0.03)
      return shape
    }

    if (piece.shape === 'sink') {
      slab(shape, w, h - 0.12, d, material, 0, (h - 0.12) / 2, 0)
      slab(shape, w, 0.12, d, material, 0, h - 0.06, 0)
      slab(shape, w - 0.16, 0.06, d - 0.14, materials.ceramicWhite, 0, h - 0.03, 0)
      slab(shape, 0.03, 0.16, 0.03, materials.metalDull, 0, h + 0.08, -d / 2 + 0.07)
      return shape
    }

    if (piece.shape === 'seat') {
      const seat = h * 0.5
      slab(shape, w, 0.04, d, material, 0, seat, 0)
      slab(shape, w, h - seat, 0.04, material, 0, seat + (h - seat) / 2, -d / 2 + 0.02)
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          slab(shape, 0.04, seat, 0.04, legs, sx * (w / 2 - 0.04), seat / 2, sz * (d / 2 - 0.04))
        }
      }
      return shape
    }

    // plinth and panel: an honest box.
    slab(shape, w, h, d, material, 0, h / 2, 0)
    return shape
  }

  for (const piece of pieces) {
    const material = materialByKey(materials, piece.material ?? 'woodMid')
    const built = buildShape(piece, material)
    const elevation = piece.elevation ?? 0
    const rotation = piece.rotation ?? 0

    built.position.set(piece.position[0], elevation, piece.position[1])
    built.rotation.y = rotation
    built.name = `furniture:${piece.id}`

    // Furniture that is itself examinable carries the object id on every mesh,
    // so the raycast finds it whichever part of the desk you happen to hit.
    if (piece.object !== undefined) {
      built.traverse((node) => {
        node.userData['objectId'] = piece.object
      })
    }

    group.add(built)

    for (const spec of piece.surfaces ?? []) {
      const orientation: SurfaceOrientation = spec.orientation ?? 'horizontal'
      const [w, , d] = piece.size
      const inset = spec.inset

      if (orientation === 'horizontal') {
        surfaces.set(spec.name, {
          name: spec.name,
          orientation,
          position: new THREE.Vector3(piece.position[0], elevation + spec.height, piece.position[1]),
          yaw: rotation,
          extent: new THREE.Vector2(Math.max(w - inset * 2, 0.05), Math.max(d - inset * 2, 0.05)),
        })
        continue
      }

      // A vertical surface sits on the face of the piece that looks the way
      // `facing` says, pushed just clear of it so props do not sink in.
      const facing: WallSide = spec.facing ?? 'south'
      const out = new THREE.Vector3(
        facing === 'east' ? 1 : facing === 'west' ? -1 : 0,
        0,
        facing === 'south' ? 1 : facing === 'north' ? -1 : 0,
      )
      const reach = (facing === 'east' || facing === 'west' ? w : d) / 2 + inset

      surfaces.set(spec.name, {
        name: spec.name,
        orientation,
        position: new THREE.Vector3(
          piece.position[0] + out.x * reach,
          elevation + spec.height,
          piece.position[1] + out.z * reach,
        ),
        yaw: yawForFacing(facing),
        extent: new THREE.Vector2(Math.max(w - inset * 2, 0.05), 0.6),
      })
    }
  }

  // Surfaces every room gets for free.
  const WALL_STANDOFF = 0.03
  const WALL_DEFAULT_HEIGHT = 1.5

  for (const room of plan.rooms) {
    const [cx, cz] = centreOf(room)
    const width = room.max[0] - room.min[0]
    const depth = room.max[1] - room.min[1]

    surfaces.set(`${room.id}_floor`, {
      name: `${room.id}_floor`,
      orientation: 'horizontal',
      position: new THREE.Vector3(cx, 0, cz),
      yaw: 0,
      extent: new THREE.Vector2(Math.max(width - 0.6, 0.2), Math.max(depth - 0.6, 0.2)),
    })

    const walls: [WallSide, number, number][] = [
      ['north', cx, room.min[1] + WALL_STANDOFF],
      ['south', cx, room.max[1] - WALL_STANDOFF],
      ['west', room.min[0] + WALL_STANDOFF, cz],
      ['east', room.max[0] - WALL_STANDOFF, cz],
    ]

    for (const [side, x, z] of walls) {
      const name = `${room.id}_wall_${side}`
      const along = side === 'north' || side === 'south' ? width : depth
      surfaces.set(name, {
        name,
        orientation: 'vertical',
        position: new THREE.Vector3(x, WALL_DEFAULT_HEIGHT, z),
        // A wall on the north side of a room faces south, into the room.
        yaw: yawForFacing(side === 'north' ? 'south' : side === 'south' ? 'north' : side === 'west' ? 'east' : 'west'),
        extent: new THREE.Vector2(Math.max(along - 0.4, 0.2), plan.wall_height - 0.4),
      })
    }
  }

  // The board under each window. The kitchen one holds the cuttings jar.
  for (const w of plan.windows) {
    const room = plan.rooms.find((r) => r.id === w.room)
    if (room === undefined) continue

    const alongX = w.wall === 'north' || w.wall === 'south'
    const at = w.wall === 'north' ? room.min[1] : w.wall === 'south' ? room.max[1] : w.wall === 'west' ? room.min[0] : room.max[0]
    const inward = w.wall === 'north' ? 0.08 : w.wall === 'south' ? -0.08 : 0
    const inwardX = w.wall === 'west' ? 0.08 : w.wall === 'east' ? -0.08 : 0
    const name = `${w.room}_${w.wall}_sill`

    surfaces.set(name, {
      name,
      orientation: 'horizontal',
      position: new THREE.Vector3(
        alongX ? w.centre : at + inwardX,
        // flat.ts sets the sill board 0.06 below the glass and 0.04 thick.
        w.sill - 0.04,
        alongX ? at + inward : w.centre,
      ),
      yaw: alongX ? 0 : Math.PI / 2,
      extent: new THREE.Vector2(Math.max(w.width - 0.1, 0.1), 0.12),
    })
  }

  return {
    group,
    surfaces,
    dispose(): void {
      for (const geometry of owned) geometry.dispose()
      owned.length = 0
      group.clear()
    },
  }
}

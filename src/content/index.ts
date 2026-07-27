/**
 * Loads everything under `data/` and indexes it.
 *
 * The JSON is asserted rather than parsed defensively here. `npm run validate`
 * proves the shape, the cross-references, and the content rules before anything
 * ships, and it runs in CI. TypeScript on its own can only see the literal types
 * these files happen to have today, which is a much weaker guarantee than the
 * validator gives, so the assertion is the honest way to write it.
 *
 * If you are reaching for a runtime shape check in this file, add it to the
 * validator instead. That is the one place that already knows every rule.
 */

import roomsRaw from '../../data/rooms.json'
import floorPlanRaw from '../../data/floorplan.json'
import furnitureRaw from '../../data/furniture.json'
import placementRaw from '../../data/placement.json'
import objectsRaw from '../../data/objects.json'
import fragmentsRaw from '../../data/fragments.json'
import textsRaw from '../../data/texts.json'
import scenesRaw from '../../data/scenes.json'
import resourcesRaw from '../../data/resources.json'

import type {
  ActNumber,
  Advisory,
  ContentBundle,
  FloorPlan,
  Fragment,
  FurniturePiece,
  GameObject,
  KeystoneText,
  Placement,
  ResourceData,
  ResourceRegion,
  RoomData,
  RoomId,
  SceneData,
} from './types.ts'

const roomData = roomsRaw as unknown as RoomData
const floorPlan = floorPlanRaw as unknown as FloorPlan
const furniture = furnitureRaw as unknown as FurniturePiece[]
const placements = placementRaw as unknown as Placement[]
const objects = objectsRaw as unknown as GameObject[]
const fragments = fragmentsRaw as unknown as Fragment[]
const texts = textsRaw as unknown as KeystoneText[]
const sceneData = scenesRaw as unknown as SceneData
const resources = resourcesRaw as unknown as ResourceData

export const content: ContentBundle = {
  rooms: roomData.rooms,
  plan: floorPlan,
  lighting: roomData.lighting_progression,
  objects,
  fragments,
  texts,
  acts: sceneData.acts,
  scenes: sceneData.scenes,
  resources,
}

const objectsById = new Map(objects.map((o) => [o.id, o]))
const fragmentsById = new Map(fragments.map((f) => [f.id, f]))
const textsById = new Map(texts.map((t) => [t.id, t]))

export function getObject(id: string): GameObject | undefined {
  return objectsById.get(id)
}

export function getFragment(id: string): Fragment | undefined {
  return fragmentsById.get(id)
}

export function getText(id: string): KeystoneText | undefined {
  return textsById.get(id)
}

export function objectsInRoom(room: RoomId): GameObject[] {
  return objects.filter((o) => o.room === room)
}

export function getFloorPlan(): FloorPlan {
  return floorPlan
}

export function getScenes(): SceneData {
  return sceneData
}

export function getFurniture(): FurniturePiece[] {
  return furniture
}

export function getPlacements(): Placement[] {
  return placements
}

/** Everything the player could interact with by this act. Section 4.5. */
export function objectsAvailableInAct(act: ActNumber): GameObject[] {
  return objects.filter((o) => o.act_min <= act)
}

/** Section 11. The only place in the game where the word appears. */
export function getAdvisory(): Advisory {
  return resources.advisory
}

/**
 * Falls back to the default region when the requested one is not configured,
 * because a player in an unlisted country still needs to be shown something.
 */
export function getResources(region?: string): ResourceRegion {
  const requested = region === undefined ? undefined : resources.regions[region]
  if (requested !== undefined) return requested

  const fallback = resources.regions[resources.default_region]
  if (fallback === undefined) {
    throw new Error(
      `default_region "${resources.default_region}" is missing from data/resources.json`,
    )
  }

  return fallback
}

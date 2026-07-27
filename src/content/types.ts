/**
 * Shapes for everything under `data/`.
 *
 * Nothing here may use syntax that Node cannot erase. No `enum`, no `namespace`,
 * no constructor parameter properties. Unions come from `as const` arrays so the
 * same values are available at runtime for the validator to check against.
 * `erasableSyntaxOnly` in tsconfig.json enforces this.
 */

export const ROOM_IDS = [
  'entry_hall',
  'living_room',
  'kitchen',
  'bathroom',
  'bedroom',
  'balcony',
] as const

export type RoomId = (typeof ROOM_IDS)[number]

/**
 * Section 5 of the bible types objects with single letters. They expand here:
 * A becomes ambient, R becomes readable, M becomes memory, K becomes keystone.
 * `system` drives a mechanic, `scripted` owns a scene.
 */
export const OBJECT_TYPES = [
  'ambient',
  'readable',
  'memory',
  'keystone',
  'system',
  'scripted',
] as const

export type ObjectType = (typeof OBJECT_TYPES)[number]

/** Section 4.1. SHIP TO LENA, DONATE, LET GO. No scoring, no wrong answers. */
export const SORT_DESTINATIONS = ['lena', 'donate', 'let_go'] as const

export type SortDestination = (typeof SORT_DESTINATIONS)[number]

export type ActNumber = 1 | 2 | 3

/**
 * Section 4.4. Reframes an already-examined object once a condition is met.
 *
 * `requires_flag` holds a bare state flag, or a derived flag in the
 * `examined:<object_id>` or `secondlook:<object_id>` form. See flags.ts.
 *
 * The text may reframe but must never confirm. Grief sees patterns; the game
 * refuses to verify them.
 */
export interface SecondLook {
  requires_flag: string
  text: string
}

export interface GameObject {
  id: string
  name: string
  room: RoomId
  type: ObjectType[]
  act_min: ActNumber
  sortable: boolean
  examine: string
  /** Fragment id, for objects typed `memory`. */
  fragment?: string
  /** Keystone text id, for objects typed `keystone`. */
  text?: string
  second_look?: SecondLook
  /** Present when the strings are verbatim from the bible. Absent means authored. */
  section?: string
  /** Never shown to the player. */
  design_note?: string
}

export interface Room {
  id: RoomId
  name: string
  /** Section 3, the mood and lighting column. */
  mood: string
  /** Section 3, the function column. */
  purpose: string
}

/** Section 3. Act 1 warm and dim, through to grey-gold dawn. */
export interface LightingStage {
  stage: string
  description: string
}

export interface RoomData {
  rooms: Room[]
  lighting_progression: LightingStage[]
}

/**
 * Section 6. Twelve of them. An overlay of player-character interior monologue,
 * with the ambient audio dipping under it.
 */
export interface Fragment {
  id: string
  /** Object id that triggers it. */
  trigger: string
  act: ActNumber
  /** The one-line beat, verbatim from the section 6 table. */
  beat: string
  /** Three to six lines, per section 4.3. */
  lines: string[]
}

/**
 * A run of text inside a keystone document. Documents are not flat strings: the
 * notebook is timestamped entries, the cover letter carries margin notes, and the
 * phone thread is messages with senders.
 */
export type TextBlock =
  | { kind: 'line'; text: string }
  | { kind: 'entry'; time: string; text: string }
  | { kind: 'annotation'; where: string; text: string }
  | { kind: 'message'; sender: string; timestamp: string; text: string }
  | { kind: 'caption'; label: string; text: string }
  | { kind: 'signature'; text: string }
  /** A parenthetical the player sees, such as "(unsigned, unfinished)". */
  | { kind: 'stage'; text: string }

export const TEXT_BLOCK_KINDS = [
  'line',
  'entry',
  'annotation',
  'message',
  'caption',
  'signature',
  'stage',
] as const

/** Section 7. Verbatim in-game documents. */
export interface KeystoneText {
  id: string
  /** Section number in the bible, for example "7.1". */
  section: string
  /** Object that opens this document. */
  object: string
  title: string
  /** How it looks in the overlay: a handwritten note, a printout, a phone screen. */
  form: string
  blocks: TextBlock[]
  /** Never shown to the player. */
  design_note?: string
}

/** Section 4.5. What has to be true before the next act begins. */
export interface ActGate {
  description: string
  sorted_count_min?: number
  requires_flags?: string[]
  charge_seconds?: number
}

export interface Act {
  act: ActNumber
  id: string
  title: string
  layer: string
  lighting: string
  gate_to_next?: ActGate
}

/** Section 8. Scripted beats that are not attached to a single examinable object. */
export interface Scene {
  id: string
  section: string
  act: ActNumber
  title: string
  summary: string
  blocks?: TextBlock[]
  steps?: string[]
  /** Interior title card, for the opening. */
  title_card?: string
  design_note?: string
}

export interface SceneData {
  acts: Act[]
  scenes: Scene[]
}

/** Section 11. The advisory is the only place the word "suicide" appears. */
export interface Advisory {
  section: string
  title: string
  lines: string[]
  lead_in: string
}

export interface ResourceEntry {
  id: string
  name: string
  detail: string
  url: string
  phone?: string
  /** Where this was checked, and when. Required. An entry without it fails validation. */
  source: string
}

export interface ResourceRegion {
  label: string
  entries: ResourceEntry[]
}

export interface ResourceData {
  advisory: Advisory
  default_region: string
  regions: Record<string, ResourceRegion>
}

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

export type Vec2 = [number, number]
export type Vec3 = [number, number, number]

export const FLOOR_MATERIALS = ['wood', 'tile_kitchen', 'tile_bathroom', 'concrete'] as const

export type FloorMaterial = (typeof FLOOR_MATERIALS)[number]

export const WALL_SIDES = ['north', 'south', 'east', 'west'] as const

export type WallSide = (typeof WALL_SIDES)[number]

export const OPENING_KINDS = ['doorway', 'balcony_door', 'front_door'] as const

export type OpeningKind = (typeof OPENING_KINDS)[number]

/**
 * Hard Rule 10. A solid parapet, not a railing: the balcony is a place of warm
 * memory and the drop is never part of the composition.
 */
export interface Parapet {
  height: number
  thickness: number
  sides: WallSide[]
}

/** Rooms are axis-aligned rectangles. `min` and `max` are [x, z] on the plan. */
export interface RoomRect {
  id: RoomId
  min: Vec2
  max: Vec2
  floor: FloorMaterial
  ceiling: boolean
  outdoor?: boolean
  parapet?: Parapet
}

/**
 * A gap in a shared wall. `wall` names the axis the wall runs perpendicular to,
 * `at` is that axis's coordinate, and `centre` is the position along the wall.
 * The second entry in `between` may be "outside" for the front door.
 */
export interface Opening {
  between: [string, string]
  wall: 'x' | 'z'
  at: number
  centre: number
  width: number
  height: number
  kind: OpeningKind
}

export interface WindowOpening {
  room: RoomId
  wall: WallSide
  centre: number
  width: number
  height: number
  sill: number
}

export interface Spawn {
  room: RoomId
  position: Vec2
  /** Radians about Y. Zero looks along negative Z, which is north on the plan. */
  facing: number
}

export interface FloorPlan {
  units: string
  wall_height: number
  wall_thickness: number
  eye_height: number
  spawn: Spawn
  rooms: RoomRect[]
  openings: Opening[]
  windows: WindowOpening[]
}

// ---------------------------------------------------------------------------
// Furniture and placement
// ---------------------------------------------------------------------------

export const FURNITURE_SHAPES = [
  'table',
  'counter',
  'cabinet',
  'shelf',
  'sofa',
  'bed',
  'wardrobe',
  'appliance',
  'sink',
  'desk',
  'seat',
  'plinth',
  'panel',
] as const

export type FurnitureShape = (typeof FURNITURE_SHAPES)[number]

export const SURFACE_ORIENTATIONS = ['horizontal', 'vertical'] as const

export type SurfaceOrientation = (typeof SURFACE_ORIENTATIONS)[number]

/**
 * Where objects come to rest. Horizontal surfaces are table tops and floors and
 * `height` is the resting height. Vertical surfaces are walls, fridge doors, and
 * mirror frames, where `height` is the centre and `facing` is the way objects
 * turn to meet the room.
 */
export interface SurfaceSpec {
  name: string
  height: number
  inset: number
  orientation?: SurfaceOrientation
  facing?: WallSide
}

export interface FurniturePiece {
  id: string
  room: RoomId
  shape: FurnitureShape
  /** Centre of the footprint, [x, z]. */
  position: Vec2
  /** Width, height, depth. */
  size: Vec3
  /** Radians about Y. */
  rotation?: number
  material?: string
  surface?: SurfaceSpec
}

export const PROP_SHAPES = [
  'paper',
  'book',
  'mug',
  'bowl',
  'jar',
  'bottle',
  'phone',
  'frame',
  'carton',
  'plant',
  'cloth',
  'footwear',
  'folding_seat',
  'case',
  'disc',
] as const

export type PropShape = (typeof PROP_SHAPES)[number]

export const PROP_POSES = ['flat', 'face_down', 'upright', 'leaning'] as const

export type PropPose = (typeof PROP_POSES)[number]

/** One entry per object that appears in the flat. */
export interface Placement {
  id: string
  surface: string
  shape: PropShape
  /** Displacement from the surface anchor, in surface-local metres. */
  offset?: Vec3
  pose?: PropPose
  /** Radians about Y, on top of the pose. */
  yaw?: number
  /** Separates objects that share a shape, such as the two mugs. */
  tint?: string
  scale?: number
}

/** Everything under `data/`, loaded and cross-referenced. */
export interface ContentBundle {
  rooms: Room[]
  lighting: LightingStage[]
  objects: GameObject[]
  fragments: Fragment[]
  texts: KeystoneText[]
  acts: Act[]
  scenes: Scene[]
  resources: ResourceData
}

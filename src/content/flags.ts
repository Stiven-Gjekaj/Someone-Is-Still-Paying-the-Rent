/**
 * The state flags named in section 12 of the bible, plus the namespace that lets
 * second-look conditions refer to things the flag list does not cover.
 *
 * Section 12 documents `second_look.requires_flag` as a single string naming a
 * flag, but most of the pairs in section 5 gate on having examined some other
 * object instead, and one gates on another object's second look. Rather than
 * change the documented schema, the namespace widened:
 *
 *   referral_read              a boolean state flag
 *   examined:team_photo        that object has been examined at least once
 *   secondlook:zlatan_plant    that object's second-look text has been seen
 *
 * The validator resolves all three forms and fails on anything else.
 */

import type { ActNumber, SortDestination } from './types.ts'

/** Flags a second-look condition may name directly. */
export const BOOLEAN_FLAGS = [
  'phone_found',
  'charger_found',
  'phone_on',
  'underbed_found',
  'referral_read',
  'mira_read',
  'thread_read',
  'desk_done',
  'receipts_found',
  'lights_on',
  'record_playing',
] as const

export type BooleanFlag = (typeof BOOLEAN_FLAGS)[number]

/** Tracked, but not usable as a second-look condition: these are not booleans. */
export const NUMERIC_FLAGS = ['act', 'sorted_count', 'phone_charging_started_at'] as const

export type NumericFlag = (typeof NUMERIC_FLAGS)[number]

export const DERIVED_FLAG_PREFIXES = ['examined', 'secondlook'] as const

export type DerivedFlagPrefix = (typeof DERIVED_FLAG_PREFIXES)[number]

export interface ObjectState {
  examined: boolean
  second_look_seen: boolean
  sorted_to: SortDestination | null
}

export interface GameState {
  act: ActNumber
  sorted_count: number
  /** Epoch milliseconds, or null while the phone is not charging. Section 4.5. */
  phone_charging_started_at: number | null

  phone_found: boolean
  charger_found: boolean
  phone_on: boolean
  underbed_found: boolean
  referral_read: boolean
  mira_read: boolean
  thread_read: boolean
  desk_done: boolean
  receipts_found: boolean
  lights_on: boolean
  record_playing: boolean

  objects: Record<string, ObjectState>
}

export type FlagReference =
  | { kind: 'state'; flag: BooleanFlag }
  | { kind: 'derived'; prefix: DerivedFlagPrefix; object: string }

const BOOLEAN_FLAG_SET: ReadonlySet<string> = new Set(BOOLEAN_FLAGS)
const DERIVED_PREFIX_SET: ReadonlySet<string> = new Set(DERIVED_FLAG_PREFIXES)

/**
 * Parse a `requires_flag` string. Returns null when it names nothing real, which
 * is what the validator reports as an error.
 *
 * This does not check that the referenced object exists. The validator does that,
 * because only it has the object index.
 */
export function parseFlagReference(raw: string): FlagReference | null {
  const colon = raw.indexOf(':')

  if (colon === -1) {
    return BOOLEAN_FLAG_SET.has(raw) ? { kind: 'state', flag: raw as BooleanFlag } : null
  }

  const prefix = raw.slice(0, colon)
  const object = raw.slice(colon + 1)

  if (!DERIVED_PREFIX_SET.has(prefix) || object.length === 0) return null

  return { kind: 'derived', prefix: prefix as DerivedFlagPrefix, object }
}

export function isSatisfied(state: GameState, ref: FlagReference): boolean {
  if (ref.kind === 'state') return state[ref.flag]

  const object = state.objects[ref.object]
  if (object === undefined) return false

  return ref.prefix === 'examined' ? object.examined : object.second_look_seen
}

/** Section 8.1. The night starts here: act 1, nothing sorted, nothing found. */
export function createInitialState(): GameState {
  return {
    act: 1,
    sorted_count: 0,
    phone_charging_started_at: null,

    phone_found: false,
    charger_found: false,
    phone_on: false,
    underbed_found: false,
    referral_read: false,
    mira_read: false,
    thread_read: false,
    desk_done: false,
    receipts_found: false,
    lights_on: false,
    record_playing: false,

    objects: {},
  }
}

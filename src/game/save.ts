/**
 * Section 12: a save system is optional for a single-sitting game, but an
 * auto-checkpoint per act is kind.
 *
 * So that is exactly what this is. One slot, written when an act begins, and
 * offered from the title screen. There is no manual save, no slot list, and no
 * way to rewind inside an act: sorting has no undo, and a save system that
 * quietly gave it one would take the weight out of the only decision the game
 * asks you to make.
 *
 * Reading is defensive to the point of rudeness. A save is worth less than a
 * correct game, so anything that does not look exactly right is dropped whole
 * rather than half-restored.
 */

import { createInitialState, type GameState } from '../content/flags.ts'
import { SORT_DESTINATIONS, type ActNumber, type SortDestination } from '../content/types.ts'

const STORAGE_KEY = 'sispr.checkpoint'

/**
 * Bump this whenever the shape of `GameState` changes. An old save restored into
 * a new shape is the one failure mode that makes a save system worse than having
 * none, because it looks like it worked.
 */
const SAVE_VERSION = 2

export interface Checkpoint {
  version: number
  /** Milliseconds since the epoch, for the title screen to describe. */
  saved_at: number
  state: GameState
}

const DESTINATIONS: ReadonlySet<string> = new Set(SORT_DESTINATIONS)

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Rebuilds a state from stored data, keeping only what is both well formed and
 * still real.
 *
 * `knownObjects` is the set of ids in the content as it stands now. An id that
 * has since been deleted or renamed is discarded rather than restored, so a save
 * cannot resurrect an object that no longer exists or hold a `sorted_count` that
 * counts things which are not in the flat.
 */
export function restoreState(stored: unknown, knownObjects: ReadonlySet<string>): GameState | null {
  if (!isRecord(stored)) return null

  const act = stored['act']
  if (act !== 1 && act !== 2 && act !== 3) return null

  const state = createInitialState()
  state.act = act as ActNumber

  for (const flag of [
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
  ] as const) {
    if (stored[flag] === true) state[flag] = true
  }

  const charging = stored['phone_charging_started_at']
  if (typeof charging === 'number' && Number.isFinite(charging)) {
    state.phone_charging_started_at = charging
  }

  // Section 8.4. Only if it is still an object the flat has, for the same reason
  // the sorted ids are filtered: a save that names something deleted since would
  // put a thing that does not exist into the player's bag.
  const taken = stored['taken']
  if (typeof taken === 'string' && knownObjects.has(taken)) state.taken = taken

  const objects = stored['objects']
  if (isRecord(objects)) {
    for (const [id, value] of Object.entries(objects)) {
      if (!knownObjects.has(id) || !isRecord(value)) continue

      const sortedTo = value['sorted_to']
      state.objects[id] = {
        examined: value['examined'] === true,
        second_look_seen: value['second_look_seen'] === true,
        sorted_to: typeof sortedTo === 'string' && DESTINATIONS.has(sortedTo)
          ? (sortedTo as SortDestination)
          : null,
      }
    }
  }

  // Recomputed, never trusted. A stored count that disagreed with the objects it
  // is supposed to be counting would put the act gate somewhere the flat cannot
  // reach.
  state.sorted_count = Object.values(state.objects).filter((o) => o.sorted_to !== null).length

  return state
}

export function writeCheckpoint(state: GameState, now = Date.now()): void {
  const checkpoint: Checkpoint = { version: SAVE_VERSION, saved_at: now, state }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(checkpoint))
  } catch {
    // Private browsing or a full quota. The night continues; it just will not be
    // there tomorrow. Not worth interrupting anyone over.
  }
}

export interface LoadedCheckpoint {
  saved_at: number
  state: GameState
}

export function readCheckpoint(knownObjects: ReadonlySet<string>): LoadedCheckpoint | null {
  let raw: string | null = null

  try {
    raw = window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }

  if (raw === null) return null

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    clearCheckpoint()
    return null
  }

  if (!isRecord(parsed) || parsed['version'] !== SAVE_VERSION) {
    // A save from a build whose state meant something else. Drop it, and say so
    // by having nothing to continue rather than by continuing into nonsense.
    clearCheckpoint()
    return null
  }

  const state = restoreState(parsed['state'], knownObjects)
  if (state === null) {
    clearCheckpoint()
    return null
  }

  const savedAt = parsed['saved_at']

  return { saved_at: typeof savedAt === 'number' ? savedAt : 0, state }
}

export function clearCheckpoint(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nothing to be done, and nothing that depends on it.
  }
}

/**
 * Section 4.1. The three destinations, and what they are called.
 *
 * The labels live here rather than in `data/` because they are not writing, they
 * are the marker on the side of a box. The prop paints them on, the chooser
 * lists them, and both have to say exactly the same three words or the player is
 * picking from a menu that does not match the boxes in front of them.
 *
 * There is no fourth destination and no undo. What the game refuses to do is
 * score the choice, so nothing in this file ranks them.
 */

import { SORT_DESTINATIONS, type GameObject, type SortDestination } from '../content/types.ts'
import type { GameState } from '../content/flags.ts'

const LABELS: Record<SortDestination, string> = {
  lena: 'SHIP TO LENA',
  donate: 'DONATE',
  let_go: 'LET GO',
}

export function sortLabel(destination: SortDestination): string {
  return LABELS[destination]
}

/** In the order they stand against the wall, left to right. */
export function sortDestinations(): readonly SortDestination[] {
  return SORT_DESTINATIONS
}

/** Whether this object has already gone in a box. */
export function isSorted(state: GameState, id: string): boolean {
  return state.objects[id]?.sorted_to != null
}

/**
 * Writes a sort into the state and returns whether it counted.
 *
 * It refuses a second sort of the same object, so `sorted_count` can only ever
 * be the number of distinct things put away. The act 1 gate is a threshold on
 * that number, and a gate you can open by putting one mug in a box eleven times
 * is not a gate.
 */
export function recordSort(state: GameState, id: string, destination: SortDestination): boolean {
  if (isSorted(state, id)) return false

  const existing = state.objects[id]
  if (existing === undefined) {
    state.objects[id] = { examined: true, second_look_seen: false, sorted_to: destination }
  } else {
    existing.sorted_to = destination
  }

  state.sorted_count += 1
  return true
}

/**
 * How many of the objects in front of the player could still be sorted.
 *
 * The act 1 gate asks for ten. This is what proves ten are actually there, and
 * the validator uses it against the act gates in `data/scenes.json`.
 */
export function sortableInAct(objects: GameObject[], act: number): GameObject[] {
  return objects.filter((object) => object.sortable && object.act_min <= act)
}

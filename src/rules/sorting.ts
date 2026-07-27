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

import { SORT_DESTINATIONS, type SortDestination } from '../content/types.ts'

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

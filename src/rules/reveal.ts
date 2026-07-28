/**
 * Which objects belong in the flat right now.
 *
 * Two conditions, and an object needs both. `act_min` is the act it belongs to,
 * and `hidden_until` is what has to have happened inside that act before it is
 * there to be found. A hoodie in a shoebox under the bed is in act 2 and is also
 * not in the room until somebody pulls the box out.
 *
 * Pure, so the whole table can be checked against the real content under
 * `node --test` without a renderer.
 */

import type { GameObject } from '../content/types.ts'
import { isSatisfied, parseFlagReference, type GameState } from '../content/flags.ts'

export function isRevealed(object: GameObject, state: GameState): boolean {
  if (object.act_min > state.act) return false
  if (object.hidden_until === undefined) return true

  const reference = parseFlagReference(object.hidden_until)

  // The validator rejects an unresolvable reference, so reaching here means the
  // data moved underneath us. Staying hidden is the safe direction: an object
  // nobody can find is a bug somebody reports, and an object that appears early
  // because its condition evaporated spoils the beat it was hidden for.
  if (reference === null) return false

  return isSatisfied(state, reference)
}

/**
 * Everything that should be in the flat, out of a set that is not.
 *
 * Callers pass the ids placement is still holding back, so this returns only the
 * ones that have just become due. Running it on every state change is cheap and
 * means no caller has to remember what it has already revealed.
 */
export function newlyRevealed(
  objects: GameObject[],
  state: GameState,
  held: readonly string[],
): string[] {
  if (held.length === 0) return []

  const waiting = new Set(held)

  return objects
    .filter((object) => waiting.has(object.id) && isRevealed(object, state))
    .map((object) => object.id)
}

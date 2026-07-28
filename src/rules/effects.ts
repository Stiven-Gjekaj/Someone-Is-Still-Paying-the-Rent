/**
 * What looking at something changes.
 *
 * Most objects change nothing. A handful are the load-bearing ones: finding the
 * phone is what sets the goal for the rest of the night, opening the drawer is
 * what makes the charger real, and pulling the shoebox out is what opens the
 * Mira thread. Section 4.5 is built out of exactly these.
 *
 * This is a table rather than a data field on the object because the conditions
 * are not uniform. The phone sets a flag on the first look and starts charging on
 * a later one; the drawer sets nothing at all until the second act has arrived.
 * A single `sets_flag` column could express neither without lying about one of
 * them.
 *
 * Pure, and it takes the state rather than the session, so the whole table can be
 * checked against the real content under `node --test`.
 */

import type { GameObject } from '../content/types.ts'
import type { BooleanFlag, GameState } from '../content/flags.ts'

export type ExamineEffect =
  | { kind: 'flag'; flag: BooleanFlag }
  /** Section 4.5. The wait starts here and is measured in real time. */
  | { kind: 'start_charging' }
  /** Section 5. The towel wins, posthumously. */
  | { kind: 'muffle_fridge' }

export function examineEffects(
  object: GameObject,
  state: GameState,
  showedSecondLook: boolean,
): ExamineEffect[] {
  const effects: ExamineEffect[] = []

  switch (object.id) {
    case 'phone_dead':
      // Two beats on one object, two acts apart. Finding it is act 1's whole
      // gate; plugging it in is act 2's.
      if (!state.phone_found) effects.push({ kind: 'flag', flag: 'phone_found' })
      if (state.charger_found && state.phone_charging_started_at === null) {
        effects.push({ kind: 'start_charging' })
      }
      break

    case 'junk_drawer':
      // Jammed until the second act. The second look is the drawer opening, so
      // nothing happens until the player is actually seeing that text.
      if (showedSecondLook) effects.push({ kind: 'flag', flag: 'charger_found' })
      break

    case 'underbed_box':
      effects.push({ kind: 'flag', flag: 'underbed_found' })
      break

    case 'referral_letter':
      effects.push({ kind: 'flag', flag: 'referral_read' })
      break

    case 'mira_draft':
      effects.push({ kind: 'flag', flag: 'mira_read' })
      break

    case 'fridge_towel':
      effects.push({ kind: 'muffle_fridge' })
      break

    default:
      break
  }

  return effects
}

/** Applies the flag effects. The rest need the session and are applied there. */
export function applyFlagEffects(state: GameState, effects: ExamineEffect[]): void {
  for (const effect of effects) {
    if (effect.kind === 'flag') state[effect.flag] = true
  }
}

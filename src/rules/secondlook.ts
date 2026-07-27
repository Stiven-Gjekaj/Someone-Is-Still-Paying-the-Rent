/**
 * Section 4.4. Which text an object shows when you look at it again.
 *
 * Pure, and takes its data as arguments, so it runs under `node --test` without
 * a renderer or a browser. All the flag logic it needs already exists in
 * flags.ts; this only decides which of the two strings applies.
 *
 * The rule this enforces is presentational, not narrative: it picks the second
 * text once the condition is met. Whether that text reframes without confirming
 * is a human judgement, and no function can make it. See docs/CONTENT_RULES.md.
 */

import type { GameObject } from '../content/types.ts'
import { isSatisfied, parseFlagReference, type GameState } from '../content/flags.ts'

export interface ExamineText {
  text: string
  /** True when the player is getting the reframed version. */
  secondLook: boolean
}

export function resolveExamine(object: GameObject, state: GameState): ExamineText {
  const second = object.second_look
  if (second === undefined) return { text: object.examine, secondLook: false }

  const reference = parseFlagReference(second.requires_flag)
  // The validator rejects unresolvable flags, so this only fires if the data has
  // changed underneath us. Falling back to the base text is the safe direction:
  // showing the first reading too often is a much smaller failure than showing
  // hindsight the player has not earned.
  if (reference === null) return { text: object.examine, secondLook: false }

  return isSatisfied(state, reference)
    ? { text: second.text, secondLook: true }
    : { text: object.examine, secondLook: false }
}

/** Records that the player has looked at something. */
export function markExamined(state: GameState, id: string, sawSecondLook: boolean): void {
  const existing = state.objects[id]

  if (existing === undefined) {
    state.objects[id] = { examined: true, second_look_seen: sawSecondLook, sorted_to: null }
    return
  }

  existing.examined = true
  if (sawSecondLook) existing.second_look_seen = true
}

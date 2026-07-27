/**
 * The one line of objective text.
 *
 * Section 4.6 says there is no timer and no fail state, and this is the only
 * place the game tells the player what it wants. So it is one line, small, in the
 * corner, and it changes rarely. A quest log would be a different game.
 *
 * The line is chosen by walking the goals in `data/scenes.json` and taking the
 * last one whose condition holds, so later goals supersede earlier ones without
 * anything having to clear them.
 */

import { isSatisfied, parseFlagReference, type GameState } from '../content/flags.ts'
import type { Goal } from '../content/types.ts'

export interface GoalLine {
  /** Recomputes from state and updates the line if it changed. */
  refresh(state: GameState): void
  setVisible(visible: boolean): void
  dispose(): void
}

export function currentGoal(goals: Goal[], state: GameState): Goal | null {
  let chosen: Goal | null = null

  for (const goal of goals) {
    const reference = parseFlagReference(goal.when)
    if (reference === null) continue
    if (isSatisfied(state, reference)) chosen = goal
  }

  return chosen
}

export function createGoalLine(mount: HTMLElement, goals: Goal[]): GoalLine {
  const element = document.createElement('p')
  element.className = 'goal'
  mount.append(element)

  let showing: string | null = null

  return {
    refresh(state: GameState): void {
      const goal = currentGoal(goals, state)
      const next = goal?.id ?? null
      if (next === showing) return

      showing = next
      element.textContent = goal?.text ?? ''
      element.classList.toggle('is-visible', goal !== null)
    },

    setVisible(visible: boolean): void {
      element.classList.toggle('is-hidden', !visible)
    },

    dispose(): void {
      element.remove()
    },
  }
}

/**
 * Section 8.4. What is watching for the end of the night.
 *
 * Act 3 has no `gate_to_next`, because there is no act 4. What it has is
 * `ends_when`, which is the same shape and is evaluated by the same function,
 * and this is the thing that notices when it opens.
 *
 * Written as a watcher rather than as something the last object does, for the
 * same reason the charge is a watcher: two separate objects can each be the last
 * one, depending on the order the player finds them in, and neither of them
 * should have to know it was the last.
 *
 * It fires once. The ending is not a state the player can walk back out of and
 * into again, and a second firing over the top of the first would be the game
 * talking over itself.
 */

import type { Act } from '../content/types.ts'
import type { GameState } from '../content/flags.ts'
import { evaluateGate } from '../rules/gates.ts'

export interface EndingConfig {
  acts: Act[]
  state: GameState
  /** Called once, the moment the last of the conditions is met. */
  onEnd(): void
}

export interface Ending {
  /** Called every frame, and after anything that writes a flag. */
  check(): void
  /** Whether the night has ended. For the session, the tests, and the console. */
  hasEnded(): boolean
}

export function createEnding(config: EndingConfig): Ending {
  const { acts, state } = config
  let ended = false

  return {
    check(): void {
      if (ended) return

      // The act the player is actually in, not act 3 unconditionally. Leaving it
      // general means an earlier act carrying an ending condition would work,
      // which is the honest reading of the data even though the validator
      // forbids one anywhere but the last act.
      const condition = acts.find((act) => act.act === state.act)?.ends_when
      if (condition === undefined) return

      if (!evaluateGate(condition, state).open) return

      ended = true
      config.onEnd()
    },

    hasEnded(): boolean {
      return ended
    },
  }
}

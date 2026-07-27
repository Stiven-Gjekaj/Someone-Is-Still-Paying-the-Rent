/**
 * Section 4.5. Moving from one act to the next.
 *
 * The rule for whether a gate is open lives in `src/rules/gates.ts` and is pure.
 * This is the part that has side effects: it holds the state, notices when the
 * gate has opened, and tells the caller once.
 *
 * What it deliberately does not do is rebuild the flat. Act 2's objects are
 * placed on the `under_bed` surface, and spawning them at the boundary would lay
 * out the whole Mira thread with the box still shut. The world the player is
 * standing in stays exactly as they left it, and act 2's contents arrive with
 * act 2's systems.
 */

import type { Act, ActNumber } from '../content/types.ts'
import type { GameState } from '../content/flags.ts'
import { evaluateGate, nextAct, type GateReason } from '../rules/gates.ts'

export interface ActsConfig {
  acts: Act[]
  state: GameState
  /** Called once, after the state has moved, with the act now being played. */
  onEnter(act: ActNumber): void
}

export interface Acts {
  /**
   * Evaluates the current gate and steps the act if it has opened. Safe to call
   * as often as you like; it only ever moves forward, and only once per gate.
   */
  check(now?: number): void
  /** What the current act is still waiting for. For tests and the dev console. */
  outstanding(now?: number): GateReason[]
}

export function createActs(config: ActsConfig): Acts {
  const { acts, state } = config

  function gateOf(act: ActNumber): Act | undefined {
    return acts.find((entry) => entry.act === act)
  }

  return {
    check(now = Date.now()): void {
      const next = nextAct(acts, state, now)
      if (next === null || next <= state.act) return

      state.act = next
      config.onEnter(next)
    },

    outstanding(now = Date.now()): GateReason[] {
      const gate = gateOf(state.act)?.gate_to_next
      if (gate === undefined) return []

      return evaluateGate(gate, state, now).outstanding
    },
  }
}

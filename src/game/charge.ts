/**
 * Section 4.5 and 8.2. The four minutes.
 *
 * "The phone charges in real time while the player keeps sorting, then the
 * chime. The waiting is the point: it builds dread out of an ordinary household
 * delay."
 *
 * So this is a watcher rather than anything the player does. There is no timer
 * on the screen, no countdown, and no marker pointing at the bedroom. It ticks
 * from the frame callback, and the only thing that ever happens is that at some
 * point a phone in another room makes a noise.
 *
 * `acts.check()` is deliberately not the hook. That advances acts, and the act
 * this ends is the last one the build has.
 */

import type { Act } from '../content/types.ts'
import type { GameState } from '../content/flags.ts'
import { evaluateGate } from '../rules/gates.ts'

export interface ChargeConfig {
  acts: Act[]
  state: GameState
  /** Called once, the moment the wait is over. */
  onDone(): void
}

export interface Charge {
  /** Called every frame. Cheap, and does nothing at all until the phone is on. */
  update(now?: number): void
  /** Seconds left, or null when nothing is charging. For tests and the console. */
  remaining(now?: number): number | null
}

export function createCharge(config: ChargeConfig): Charge {
  const { acts, state } = config
  let rung = false

  /**
   * How the gate sees the wait, rather than a second copy of the arithmetic.
   * `evaluateGate` already knows what `charge_seconds` means and is already
   * tested; asking it keeps the threshold in `data/scenes.json` and nowhere else.
   */
  function secondsLeft(now: number): number | null {
    if (state.phone_charging_started_at === null) return null

    const gate = acts.find((act) => act.act === state.act)?.gate_to_next
    if (gate?.charge_seconds === undefined) return null

    const charging = evaluateGate(gate, state, now).outstanding.find((r) => r.kind === 'charging')
    return charging === undefined ? 0 : charging.secondsRemaining
  }

  return {
    update(now = Date.now()): void {
      if (rung) return

      const left = secondsLeft(now)
      if (left === null || left > 0) return

      rung = true
      config.onDone()
    },

    remaining(now = Date.now()): number | null {
      return secondsLeft(now)
    },
  }
}

/**
 * Section 4.5. Whether an act is finished.
 *
 * Pure, and takes its data as arguments, so it runs under `node --test` with no
 * renderer. The thresholds live in `data/scenes.json` and are read from the act
 * being evaluated: nothing here knows that act 1 wants ten objects sorted, only
 * that a gate may ask for some number.
 *
 * `outstanding` is deliberately structured rather than prose. The goal line the
 * player reads is authored text from the bible, not a generated checklist, and
 * the two should not be the same string. This is for tests and for the console.
 */

import type { Act, ActGate, ActNumber } from '../content/types.ts'
import { isSatisfied, parseFlagReference, type GameState } from '../content/flags.ts'

export type GateReason =
  | { kind: 'sorted_count'; need: number; have: number }
  | { kind: 'flag'; flag: string }
  | { kind: 'charging'; secondsRemaining: number }
  | { kind: 'not_started' }
  | { kind: 'unresolvable'; flag: string }

export interface GateStatus {
  open: boolean
  outstanding: GateReason[]
}

/**
 * `now` is passed in rather than read, because the charge gate in act 2 is a
 * real-time wait and a function that reads the clock cannot be tested.
 */
export function evaluateGate(gate: ActGate, state: GameState, now = 0): GateStatus {
  const outstanding: GateReason[] = []

  const need = gate.sorted_count_min
  if (need !== undefined && state.sorted_count < need) {
    outstanding.push({ kind: 'sorted_count', need, have: state.sorted_count })
  }

  for (const flag of gate.requires_flags ?? []) {
    const reference = parseFlagReference(flag)

    // The validator rejects a gate naming an unknown flag, so reaching here means
    // the data moved underneath us. Holding the gate shut is the safe direction:
    // an act that will not open is a bug somebody reports, and an act that opens
    // because a condition silently evaporated is a bug nobody notices.
    if (reference === null) {
      outstanding.push({ kind: 'unresolvable', flag })
      continue
    }

    if (!isSatisfied(state, reference)) outstanding.push({ kind: 'flag', flag })
  }

  const charge = gate.charge_seconds
  if (charge !== undefined) {
    const started = state.phone_charging_started_at

    if (started === null) {
      outstanding.push({ kind: 'not_started' })
    } else {
      const elapsed = (now - started) / 1000
      if (elapsed < charge) {
        outstanding.push({ kind: 'charging', secondsRemaining: Math.max(0, charge - elapsed) })
      }
    }
  }

  return { open: outstanding.length === 0, outstanding }
}

/** The act the player should move to, or null if they are staying put. */
export function nextAct(acts: Act[], state: GameState, now = 0): ActNumber | null {
  const current = acts.find((act) => act.act === state.act)
  if (current?.gate_to_next === undefined) return null

  if (!evaluateGate(current.gate_to_next, state, now).open) return null

  const following = state.act + 1
  return acts.some((act) => act.act === following) ? (following as ActNumber) : null
}

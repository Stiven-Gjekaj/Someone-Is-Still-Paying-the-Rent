/**
 * Section 8.1. The forty seconds before you can move.
 *
 * Black, the rain already running, the key in the lock, the card, and a fade up
 * on the hallway. It is a cold open with no logo and no menu music, which is the
 * only tone this game can start on.
 *
 * The screen is black rather than absent so the flat has time to load and light
 * itself behind it. Nobody should watch the first frame resolve.
 *
 * Skippable from the first frame, on any key. Somebody replaying, or somebody who
 * needs to stop and start again, should not have to sit through it a second time.
 *
 * The timing, the skip, and the release all come from `src/ui/sequence.ts`, which
 * four beats share. What is here is the schedule.
 */

import { createSequence } from './sequence.ts'

const KEY_AT_MS = 1400
const CARD_IN_MS = 900
const CARD_HOLD_MS = 2600
const FADE_UP_MS = 2200

export interface Opening {
  /** Runs the beat and calls back when the player has the flat. */
  play(card: string, onDone: () => void): void
  isPlaying(): boolean
  skip(): void
  /**
   * Hard Rule 9. Holds every pending step so the pause menu actually pauses.
   * See `pause` in `src/ui/sequence.ts` for why the beats need this at all.
   */
  pause(): void
  resume(): void
  dispose(): void
}

export function createOpening(mount: HTMLElement, onKey: () => void): Opening {
  const sequence = createSequence(mount, {
    className: 'opening',
    fadeMs: FADE_UP_MS,
    skipOn: 'any',
    skipOnClick: true,
  })

  const line = document.createElement('p')
  line.className = 'opening-card'
  sequence.element.append(line)

  const hint = document.createElement('p')
  hint.className = 'opening-hint'
  hint.textContent = 'Any key to skip'
  sequence.element.append(hint)

  // Before the fade, so the card fades out with the black rather than after it.
  // The text itself is left alone and replaced on the next play, for the same
  // reason: clearing it here would pop it off mid-fade.
  sequence.onEnd(() => sequence.element.classList.remove('is-card', 'is-hinting'))

  return {
    play(card, onDone): void {
      if (sequence.isPlaying()) return

      line.textContent = card
      sequence.begin(onDone)

      sequence.after(600, () => sequence.element.classList.add('is-hinting'))
      sequence.after(KEY_AT_MS, onKey)
      sequence.after(KEY_AT_MS + 900, () => {
        sequence.element.classList.add('is-card')
        sequence.announce(card)
      })
      sequence.after(KEY_AT_MS + 900 + CARD_IN_MS + CARD_HOLD_MS, sequence.end)
    },

    isPlaying: sequence.isPlaying,
    skip: sequence.end,
    pause: sequence.pause,
    resume: sequence.resume,
    dispose: sequence.dispose,
  }
}

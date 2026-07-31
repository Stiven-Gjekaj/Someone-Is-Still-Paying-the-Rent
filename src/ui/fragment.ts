/**
 * Section 4.3. The memory that arrives after the thought.
 *
 * Object, then thought, then memory. The examine overlay is the thought, and it
 * leaves the flat visible behind it because you are still standing in the room.
 * This is the memory, and it takes the screen, because for a moment you are not.
 *
 * A vignette closes in rather than a cut to black. The flat stays faintly there
 * at the edges the whole time, which is the honest shape of remembering something
 * while holding it in your hands.
 *
 * The timing, the Escape handling, and the release all come from
 * `src/ui/sequence.ts`, which four beats share. What is here is the vignette and
 * the order the lines arrive in.
 */

import type { Fragment } from '../content/types.ts'
import { lineSchedule, sequenceDuration } from '../rules/pacing.ts'
import { createSequence } from './sequence.ts'

export interface FragmentPlayer {
  /** Runs the fragment and calls back once it has released. */
  play(fragment: Fragment, onDone: () => void): void
  isPlaying(): boolean
  /** Ends it early. Escape does this, and so does disposal. */
  skip(): void
  /**
   * Hard Rule 9. Holds every pending step so the pause menu actually pauses.
   * See `pause` in `src/ui/sequence.ts` for why the beats need this at all.
   */
  pause(): void
  resume(): void
  dispose(): void
}

/** How long the vignette takes to close and to open again. */
const FADE_MS = 900

/** How long the last line is left alone on screen before it releases. */
const HOLD_MS = 1600

export function createFragmentPlayer(mount: HTMLElement): FragmentPlayer {
  const sequence = createSequence(mount, {
    className: 'fragment',
    fadeMs: FADE_MS,
    skipOn: 'escape',
  })

  const vignette = document.createElement('div')
  vignette.className = 'fragment-vignette'
  sequence.element.append(vignette)

  const lines = document.createElement('div')
  lines.className = 'fragment-lines'
  sequence.element.append(lines)

  return {
    play(fragment, onDone): void {
      if (sequence.isPlaying()) return

      // Every line is in the document from the start, invisible, so the block
      // does not jump around underneath the player as each one arrives. They are
      // replaced here rather than cleared on the way out, so the last one fades
      // with the vignette instead of vanishing out from under it.
      const nodes = fragment.lines.map((text) => {
        const line = document.createElement('p')
        line.className = 'fragment-line'
        line.textContent = text
        return line
      })

      lines.replaceChildren(...nodes)
      sequence.begin(onDone)

      // Section 4.3. One at a time, each held long enough to be read, and the
      // ones before it settling back so the newest is where the eye goes.
      lineSchedule(fragment.lines).forEach((at, index) => {
        sequence.after(FADE_MS + at, () => {
          for (let i = 0; i < index; i += 1) nodes[i]?.classList.add('is-past')
          nodes[index]?.classList.add('is-shown')
          sequence.announce(fragment.lines[index] ?? '')
        })
      })

      sequence.after(FADE_MS + sequenceDuration(fragment.lines) + HOLD_MS, sequence.end)
    },

    isPlaying: sequence.isPlaying,
    skip: sequence.end,
    pause: sequence.pause,
    resume: sequence.resume,
    dispose: sequence.dispose,
  }
}

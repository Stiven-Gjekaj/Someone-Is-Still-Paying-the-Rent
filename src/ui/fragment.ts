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
 */

import type { Fragment } from '../content/types.ts'
import { lineSchedule, sequenceDuration } from '../rules/pacing.ts'

export interface FragmentPlayer {
  /** Runs the fragment and calls back once it has released. */
  play(fragment: Fragment, onDone: () => void): void
  isPlaying(): boolean
  /** Ends it early. Escape does this, and so does disposal. */
  skip(): void
  dispose(): void
}

/** How long the vignette takes to close and to open again. */
const FADE_MS = 900

/** How long the last line is left alone on screen before it releases. */
const HOLD_MS = 1600

export function createFragmentPlayer(mount: HTMLElement): FragmentPlayer {
  const element = document.createElement('div')
  element.className = 'fragment'
  element.setAttribute('aria-hidden', 'true')

  const vignette = document.createElement('div')
  vignette.className = 'fragment-vignette'
  element.append(vignette)

  const lines = document.createElement('div')
  lines.className = 'fragment-lines'
  element.append(lines)

  mount.append(element)

  const timers: number[] = []
  // Escape is the way out of everything else in this game, so it is the way out
  // of a memory too. Hard Rule 9: nothing here may trap the player in a beat.
  function onKeyDown(event: KeyboardEvent): void {
    if (!playing) return
    if (event.key === 'Escape' || event.key === 'e' || event.key === 'E') {
      event.preventDefault()
      end()
    }
  }

  window.addEventListener('keydown', onKeyDown)

  let playing = false
  let finish: (() => void) | null = null

  function clearTimers(): void {
    for (const timer of timers) window.clearTimeout(timer)
    timers.length = 0
  }

  function after(ms: number, run: () => void): void {
    timers.push(window.setTimeout(run, ms))
  }

  function end(): void {
    if (!playing) return
    playing = false
    clearTimers()

    element.classList.remove('is-open')

    const done = finish
    finish = null

    // Let the vignette open again before the flat gets the input back. Cutting
    // straight out of a memory reads as an interruption.
    window.setTimeout(() => {
      lines.replaceChildren()
      done?.()
    }, FADE_MS)
  }

  return {
    play(fragment, onDone): void {
      if (playing) return

      playing = true
      finish = onDone
      clearTimers()

      // Every line is in the document from the start, invisible, so the block
      // does not jump around underneath the player as each one arrives.
      const nodes = fragment.lines.map((text) => {
        const line = document.createElement('p')
        line.className = 'fragment-line'
        line.textContent = text
        return line
      })

      lines.replaceChildren(...nodes)
      element.classList.add('is-open')

      // Section 4.3. One at a time, each held long enough to be read, and the
      // ones before it settling back so the newest is where the eye goes.
      lineSchedule(fragment.lines).forEach((at, index) => {
        after(FADE_MS + at, () => {
          for (let i = 0; i < index; i += 1) nodes[i]?.classList.add('is-past')
          nodes[index]?.classList.add('is-shown')
        })
      })

      after(FADE_MS + sequenceDuration(fragment.lines) + HOLD_MS, end)
    },

    isPlaying(): boolean {
      return playing
    },

    skip: end,

    dispose(): void {
      clearTimers()
      playing = false
      finish = null
      window.removeEventListener('keydown', onKeyDown)
      element.remove()
    },
  }
}

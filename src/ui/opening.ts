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
 * Skippable from the first frame. Somebody replaying, or somebody who needs to
 * stop and start again, should not have to sit through it a second time.
 */

const KEY_AT_MS = 1400
const CARD_IN_MS = 900
const CARD_HOLD_MS = 2600
const FADE_UP_MS = 2200

export interface Opening {
  /** Runs the beat and calls back when the player has the flat. */
  play(card: string, onDone: () => void): void
  isPlaying(): boolean
  skip(): void
  dispose(): void
}

export function createOpening(mount: HTMLElement, onKey: () => void): Opening {
  const element = document.createElement('div')
  element.className = 'opening'
  element.setAttribute('aria-hidden', 'true')

  const line = document.createElement('p')
  line.className = 'opening-card'
  element.append(line)

  const hint = document.createElement('p')
  hint.className = 'opening-hint'
  hint.textContent = 'Any key to skip'
  element.append(hint)

  mount.append(element)

  const timers: number[] = []
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

    element.classList.remove('is-open', 'is-card', 'is-hinting')

    const done = finish
    finish = null

    // The fade is on the element, so the flat is already there underneath by the
    // time this resolves and the player takes the pointer.
    window.setTimeout(() => {
      line.textContent = ''
      done?.()
    }, FADE_UP_MS)
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (!playing) return
    event.preventDefault()
    end()
  }

  window.addEventListener('keydown', onKeyDown)
  element.addEventListener('click', () => end())

  return {
    play(card, onDone): void {
      if (playing) return

      playing = true
      finish = onDone
      clearTimers()

      line.textContent = card
      element.classList.add('is-open')
      after(600, () => element.classList.add('is-hinting'))

      after(KEY_AT_MS, onKey)
      after(KEY_AT_MS + 900, () => element.classList.add('is-card'))
      after(KEY_AT_MS + 900 + CARD_IN_MS + CARD_HOLD_MS, end)
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

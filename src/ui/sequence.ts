/**
 * The machinery under every beat that takes the screen.
 *
 * A memory, the opening, the desk scene, and the ending are four different
 * things to look at and one identical mechanism: an element that fades in, a
 * list of timers, a key that ends it early, and a callback when the flat is the
 * player's again. That mechanism was written twice and was about to be written
 * four times.
 *
 * Two rules it enforces on all of them. Escape always works, because Hard Rule 9
 * says nothing may trap the player in a beat. And the release is a tracked timer
 * rather than a loose one, so disposing mid-fade cannot call back into a session
 * that has already been taken down.
 */

export interface SequenceConfig {
  /** Class on the root element. Its CSS owns the look and the fade. */
  className: string
  /** How long the fade out runs, so the release waits for it. */
  fadeMs: number
  /**
   * Which keys end it early. `escape` is Escape only; `any` is any key at all,
   * which is what an unskippable-looking title card wants so nobody has to guess.
   */
  skipOn: 'escape' | 'any'
  /** Also end it on a click anywhere. The opening does; a memory does not. */
  skipOnClick?: boolean
}

export interface Sequence {
  /** The root. Callers fill it and style it; this never touches its contents. */
  element: HTMLElement
  /** Schedules work, tracked, so `end` and `dispose` can cancel it. */
  after(ms: number, run: () => void): void
  /** Opens it and takes the screen. `onDone` fires once the fade has finished. */
  begin(onDone: () => void): void
  /** Runs when the sequence ends, before the fade. For clearing what was shown. */
  onEnd(listener: () => void): void
  end(): void
  isPlaying(): boolean
  dispose(): void
}

export function createSequence(mount: HTMLElement, config: SequenceConfig): Sequence {
  const element = document.createElement('div')
  element.className = config.className
  element.setAttribute('aria-hidden', 'true')
  mount.append(element)

  const timers: number[] = []
  const listeners: (() => void)[] = []

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

    for (const listener of listeners) listener()

    // Tracked, not loose. Cutting straight out of a beat reads as an
    // interruption, so the flat comes back only once the fade has run, and if the
    // session is disposed during that fade the callback must not arrive after it.
    after(config.fadeMs, () => done?.())
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (!playing) return
    if (config.skipOn === 'any' || event.key === 'Escape') {
      event.preventDefault()
      end()
      return
    }

    // A memory also ends on the key that opened the thought before it, so the
    // player is not asked to learn a second one halfway through.
    if (event.key === 'e' || event.key === 'E') {
      event.preventDefault()
      end()
    }
  }

  window.addEventListener('keydown', onKeyDown)
  if (config.skipOnClick === true) element.addEventListener('click', () => end())

  return {
    element,
    after,

    begin(onDone: () => void): void {
      playing = true
      finish = onDone
      clearTimers()
      element.classList.add('is-open')
    },

    onEnd(listener: () => void): void {
      listeners.push(listener)
    },

    end,

    isPlaying(): boolean {
      return playing
    },

    dispose(): void {
      clearTimers()
      playing = false
      finish = null
      listeners.length = 0
      window.removeEventListener('keydown', onKeyDown)
      element.remove()
    },
  }
}

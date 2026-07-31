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
  /**
   * Reads one line out, now.
   *
   * Called by whichever timer reveals that line, so what is heard and what is on
   * screen arrive together. Nothing announces itself: a beat that filled the
   * document up front and left this alone would be silent.
   */
  announce(text: string): void
  /** Runs when the sequence ends, before the fade. For clearing what was shown. */
  onEnd(listener: () => void): void
  end(): void
  /**
   * Hard Rule 9, and the advisory's promise that the flat will wait.
   *
   * Holds every pending step where it is. Without this a beat carries on under
   * the pause menu: the ending gets about six seconds from the voicemail to the
   * support resources, so a player who paused during the hardest part of the
   * game had it played at them anyway and lost the menu when the sequence
   * replaced the screen.
   *
   * Safe to call twice, and safe to call when nothing is playing.
   */
  pause(): void
  /** Puts back exactly as much time as was left. */
  resume(): void
  isPlaying(): boolean
  dispose(): void
}

export function createSequence(mount: HTMLElement, config: SequenceConfig): Sequence {
  const element = document.createElement('div')
  element.className = config.className

  // The visual copy stays hidden from assistive technology, and a separate
  // announcer carries the words. See `announce` below for why it is done this
  // way round rather than by making this element a live region.
  element.setAttribute('aria-hidden', 'true')
  mount.append(element)

  /**
   * What a screen reader actually hears, a line at a time.
   *
   * Every beat puts all of its lines in the document up front and reveals them
   * with CSS, which is what stops the block jumping about under the player as
   * each one arrives. That is fatal to the obvious approach: make the beat a
   * live region and it announces the whole scene the moment it is filled,
   * including the desk scene's last line, minutes before the pacing gets there.
   * Hard Rule 3 is that nothing arrives after that sentence, and having it
   * arrive before everything else is no better.
   *
   * Flipping `aria-hidden` off each line as it shows would be tidier and is not
   * reliably announced across screen readers. So the text is appended here, into
   * a region that has nothing in it but the words that have actually landed, by
   * the same timers that reveal them.
   */
  const announcer = document.createElement('div')
  announcer.className = 'beat-announcer'
  announcer.setAttribute('aria-live', 'polite')
  mount.append(announcer)

  /**
   * A step that has not run yet, and when it is due.
   *
   * `dueAt` rather than a bare handle, because pausing has to know how much of
   * each wait is left. A cleared timeout cannot be asked.
   */
  interface Step {
    run: () => void
    dueAt: number
    handle: number
  }

  const steps: Step[] = []
  const listeners: (() => void)[] = []

  let playing = false
  let finish: (() => void) | null = null
  /** When the pause started, or null while running. */
  let held: number | null = null

  function clearTimers(): void {
    for (const step of steps) window.clearTimeout(step.handle)
    steps.length = 0
  }

  function fire(step: Step): void {
    const at = steps.indexOf(step)
    if (at >= 0) steps.splice(at, 1)
    step.run()
  }

  function after(ms: number, run: () => void): void {
    const step: Step = { run, dueAt: Date.now() + ms, handle: 0 }
    steps.push(step)
    // Scheduled now unless the beat is already held, in which case `resume` will
    // schedule it along with everything else that is waiting.
    if (held === null) step.handle = window.setTimeout(() => fire(step), ms)
  }

  function pause(): void {
    if (held !== null) return
    held = Date.now()
    for (const step of steps) window.clearTimeout(step.handle)
  }

  function resume(): void {
    if (held === null) return

    const waited = Date.now() - held
    held = null

    for (const step of steps) {
      step.dueAt += waited
      step.handle = window.setTimeout(() => fire(step), Math.max(0, step.dueAt - Date.now()))
    }
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
      // A beat that begins while the previous one was held would inherit the
      // hold and never run a step.
      held = null
      announcer.replaceChildren()
      element.classList.add('is-open')
    },

    announce(text: string): void {
      if (text.trim().length === 0) return

      const line = document.createElement('p')
      line.textContent = text
      announcer.append(line)
    },

    onEnd(listener: () => void): void {
      listeners.push(listener)
    },

    end,
    pause,
    resume,

    isPlaying(): boolean {
      return playing
    },

    dispose(): void {
      clearTimers()
      playing = false
      held = null
      finish = null
      listeners.length = 0
      window.removeEventListener('keydown', onKeyDown)
      element.remove()
      announcer.remove()
    },
  }
}

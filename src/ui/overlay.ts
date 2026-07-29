/**
 * What comes up when you look at something.
 *
 * Two states from one element. Examining puts a short passage low on the screen
 * and leaves the flat visible behind it, because an examine is a thought you have
 * while standing there. Reading takes the screen, because a document is something
 * you hold.
 *
 * Both close on Escape, and Escape is also what releases the pointer, so the way
 * out is the same key everywhere. Hard Rule 9 wants pausing to always work, and
 * that is easier to honour when there is only one way out to remember.
 */

export type OverlayMode = 'examine' | 'document' | 'choose'

export interface Choice {
  label: string
  onSelect(): void
}

export interface Overlay {
  showExamine(text: string, secondLook: boolean): void
  /** `body` is filled in by the caller, which owns how a document looks. */
  showDocument(title: string, body: HTMLElement): void
  /**
   * Section 4.1 and 8.4. A question with a list of answers, and no default:
   * nothing is pre-selected, because the game does not have an opinion about
   * which one. It is asked twice, at two very different lengths.
   *
   * Three destinations take a number key each. The Lena box at the end can hold
   * anything up to everything the player packed, so the list scrolls and the
   * arrow keys walk it. Both are the same widget, because they are the same
   * question, and the player should not have to learn a second one at the end.
   */
  showChoice(lead: string, choices: Choice[], hint?: string): void
  close(): void
  isOpen(): boolean
  mode(): OverlayMode | null
  onClose(listener: () => void): void
  dispose(): void
}

export function createOverlay(mount: HTMLElement): Overlay {
  const element = document.createElement('div')
  element.className = 'overlay'

  const panel = document.createElement('div')
  panel.className = 'overlay-panel'
  // Focusable without being in the tab order, so focus can be put here when a
  // document opens and a screen reader starts reading from the right place.
  // Without it the text is in the accessible tree and nothing ever visits it.
  panel.tabIndex = -1
  panel.setAttribute('role', 'dialog')
  panel.setAttribute('aria-modal', 'true')
  element.append(panel)

  const listeners: (() => void)[] = []

  /** Where focus was before this took the screen, so it can go back. */
  let camefrom: HTMLElement | null = null

  let open = false
  let current: OverlayMode | null = null
  let choices: Choice[] = []
  let optionNodes: HTMLElement[] = []

  /** Which option the arrow keys are on, or -1 for none. Starts at none. */
  let highlighted = -1

  /** Number keys only where there are numbers to press. */
  const NUMBERED_UP_TO = 9

  function close(): void {
    if (!open) return
    open = false
    current = null
    choices = []
    optionNodes = []
    highlighted = -1
    element.classList.remove('is-open', 'is-examine', 'is-document', 'is-choose')
    panel.replaceChildren()

    // Back where it came from, if that is still somewhere. Leaving focus on a
    // panel that has just been emptied strands a keyboard at the top of the
    // document, and the flat is the thing the player is going back to.
    const returning = camefrom
    camefrom = null
    if (returning !== null && returning.isConnected) returning.focus()

    for (const listener of listeners) listener()
  }

  function highlight(index: number): void {
    highlighted = index
    optionNodes.forEach((node, i) => node.classList.toggle('is-highlighted', i === index))
    optionNodes[index]?.scrollIntoView({ block: 'nearest' })
  }

  /**
   * Walks the list, and starts from whichever end the player came in from.
   *
   * Down from nothing lands on the first, up from nothing on the last. That is
   * what lets the list have no default and still be usable from the keyboard,
   * which matters because the default would be the game suggesting an answer.
   */
  function move(delta: number): void {
    if (choices.length === 0) return

    if (highlighted === -1) {
      highlight(delta > 0 ? 0 : choices.length - 1)
      return
    }

    highlight((highlighted + delta + choices.length) % choices.length)
  }

  function pick(index: number): void {
    const choice = choices[index]
    if (choice === undefined) return

    close()
    choice.onSelect()
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (!open) return

    // A chooser is a question, so a number answers it, and so do the arrow keys
    // and Enter once the list is longer than the fingers. Escape backs out
    // without choosing, which leaves the object in your hands rather than in a
    // box: there is no undo in section 4.1, so there has to be a way not to
    // decide yet.
    if (current === 'choose') {
      if (event.key === 'Escape') {
        event.preventDefault()
        close()
        return
      }

      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault()
        move(event.key === 'ArrowDown' ? 1 : -1)
        return
      }

      if (event.key === 'Home' || event.key === 'End') {
        event.preventDefault()
        if (choices.length > 0) highlight(event.key === 'Home' ? 0 : choices.length - 1)
        return
      }

      if (event.key === 'Enter' || event.key === ' ') {
        // Only if the player has actually put the highlight somewhere. Enter on
        // an empty selection must not fall through to the first option.
        if (highlighted === -1) return
        event.preventDefault()
        pick(highlighted)
        return
      }

      if (choices.length <= NUMBERED_UP_TO) {
        const index = Number(event.key) - 1
        if (Number.isInteger(index) && index >= 0 && index < choices.length) {
          event.preventDefault()
          pick(index)
        }
      }
      return
    }

    if (event.key === 'Escape' || event.key === 'e' || event.key === 'E') {
      event.preventDefault()
      close()
    }
  }

  window.addEventListener('keydown', onKeyDown)
  // Clicking the backdrop dismisses, but not while choosing: a stray click at the
  // moment the chooser appears would look like it had eaten the object.
  element.addEventListener('click', (event) => {
    if (current === 'choose' && event.target !== element) return
    if (current === 'choose') return
    close()
  })
  mount.append(element)

  function openWith(mode: OverlayMode): void {
    const active = document.activeElement
    camefrom = active instanceof HTMLElement && active !== panel ? active : null

    open = true
    current = mode
    element.classList.add('is-open')
    element.classList.toggle('is-examine', mode === 'examine')
    element.classList.toggle('is-document', mode === 'document')
    element.classList.toggle('is-choose', mode === 'choose')

    // The panel, never the first option, even on a chooser. Focus on a button
    // is not a neutral place to start: Enter on a focused button activates it,
    // natively, straight past the guard that keeps `is-highlighted` at nowhere.
    // The player would have taken Lena's note by pressing the key that means
    // "yes" to a question they had not answered. Section 4.1 and 8.4 both say
    // the game holds no opinion about which one, and a default is an opinion.
    //
    // From here Tab reaches the options, or the arrow keys walk them. Either
    // way the player put the cursor somewhere before Enter meant anything.
    panel.focus()
  }

  return {
    showExamine(text: string, secondLook: boolean): void {
      panel.replaceChildren()

      const passage = document.createElement('p')
      passage.className = secondLook ? 'examine-text is-second-look' : 'examine-text'
      passage.textContent = text
      panel.append(passage)

      openWith('examine')
    },

    showDocument(title: string, body: HTMLElement): void {
      panel.replaceChildren()

      const heading = document.createElement('p')
      heading.className = 'document-title'
      heading.textContent = title
      panel.append(heading)
      panel.append(body)

      const hint = document.createElement('p')
      hint.className = 'document-hint'
      hint.textContent = 'Escape to put it down'
      panel.append(hint)

      openWith('document')
    },

    showChoice(lead: string, options: Choice[], hintText = 'Escape to keep holding it'): void {
      panel.replaceChildren()
      choices = options
      highlighted = -1

      const heading = document.createElement('p')
      heading.className = 'choose-lead'
      heading.textContent = lead
      panel.append(heading)

      const list = document.createElement('div')
      list.className = 'choose-options'
      if (options.length > NUMBERED_UP_TO) list.classList.add('is-long')

      optionNodes = options.map((choice, index) => {
        const node = document.createElement('button')
        node.type = 'button'
        node.className = 'choose-option'

        const key = document.createElement('span')
        key.className = 'choose-key'
        // Blank rather than absent past nine, so the labels stay in one column
        // whether the list is three long or thirty.
        key.textContent = options.length <= NUMBERED_UP_TO ? String(index + 1) : ''
        node.append(key)

        const label = document.createElement('span')
        label.className = 'choose-label'
        label.textContent = choice.label
        node.append(label)

        // Deliberately no hover handler. `is-highlighted` is where the keyboard
        // is and nothing else: a chooser opens under wherever the pointer
        // happens to be sitting, Chromium fires a boundary event at whatever
        // lands under it, and Enter would then answer a question the player had
        // not read yet. The mouse gets `:hover` in the stylesheet and a click,
        // which is all it has ever needed.
        node.addEventListener('click', () => pick(index))

        list.append(node)
        return node
      })

      panel.append(list)

      const hint = document.createElement('p')
      hint.className = 'choose-hint'
      hint.textContent = hintText
      panel.append(hint)

      openWith('choose')
    },

    close,

    isOpen(): boolean {
      return open
    },

    mode(): OverlayMode | null {
      return current
    },

    onClose(listener: () => void): void {
      listeners.push(listener)
    },

    dispose(): void {
      window.removeEventListener('keydown', onKeyDown)
      element.remove()
      listeners.length = 0
    },
  }
}

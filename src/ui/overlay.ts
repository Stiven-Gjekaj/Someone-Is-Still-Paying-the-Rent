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
   * Section 4.1. Three destinations, no scoring, and no default: nothing is
   * pre-selected, because the game does not have an opinion about which box.
   */
  showChoice(lead: string, choices: Choice[]): void
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
  element.append(panel)

  const listeners: (() => void)[] = []
  let open = false
  let current: OverlayMode | null = null
  let choices: Choice[] = []

  function close(): void {
    if (!open) return
    open = false
    current = null
    choices = []
    element.classList.remove('is-open', 'is-examine', 'is-document', 'is-choose')
    panel.replaceChildren()
    for (const listener of listeners) listener()
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (!open) return

    // A chooser is a question, so a number answers it. Escape backs out without
    // choosing, which leaves the object in your hands rather than in a box: there
    // is no undo in section 4.1, so there has to be a way not to decide yet.
    if (current === 'choose') {
      if (event.key === 'Escape') {
        event.preventDefault()
        close()
        return
      }

      const picked = choices[Number(event.key) - 1]
      if (picked !== undefined) {
        event.preventDefault()
        close()
        picked.onSelect()
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
    open = true
    current = mode
    element.classList.add('is-open')
    element.classList.toggle('is-examine', mode === 'examine')
    element.classList.toggle('is-document', mode === 'document')
    element.classList.toggle('is-choose', mode === 'choose')
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

    showChoice(lead: string, options: Choice[]): void {
      panel.replaceChildren()
      choices = options

      const heading = document.createElement('p')
      heading.className = 'choose-lead'
      heading.textContent = lead
      panel.append(heading)

      const list = document.createElement('div')
      list.className = 'choose-options'

      options.forEach((choice, index) => {
        const node = document.createElement('button')
        node.type = 'button'
        node.className = 'choose-option'

        const key = document.createElement('span')
        key.className = 'choose-key'
        key.textContent = String(index + 1)
        node.append(key)

        const label = document.createElement('span')
        label.className = 'choose-label'
        label.textContent = choice.label
        node.append(label)

        node.addEventListener('click', () => {
          close()
          choice.onSelect()
        })

        list.append(node)
      })

      panel.append(list)

      const hint = document.createElement('p')
      hint.className = 'choose-hint'
      hint.textContent = 'Escape to keep holding it'
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

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

export type OverlayMode = 'examine' | 'document'

export interface Overlay {
  showExamine(text: string, secondLook: boolean): void
  /** `body` is filled in by the caller, which owns how a document looks. */
  showDocument(title: string, body: HTMLElement): void
  close(): void
  isOpen(): boolean
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

  function close(): void {
    if (!open) return
    open = false
    element.classList.remove('is-open', 'is-examine', 'is-document')
    panel.replaceChildren()
    for (const listener of listeners) listener()
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (!open) return
    if (event.key === 'Escape' || event.key === 'e' || event.key === 'E') {
      event.preventDefault()
      close()
    }
  }

  window.addEventListener('keydown', onKeyDown)
  element.addEventListener('click', close)
  mount.append(element)

  function openWith(mode: OverlayMode): void {
    open = true
    element.classList.add('is-open')
    element.classList.toggle('is-examine', mode === 'examine')
    element.classList.toggle('is-document', mode === 'document')
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

    close,

    isOpen(): boolean {
      return open
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

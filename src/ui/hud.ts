/**
 * The reticle and the interaction prompt.
 *
 * Section 4.2 asks for one context action, so the prompt is one verb and one
 * name and never a list. The reticle is a dot rather than a crosshair: this is a
 * game about looking at things, and a crosshair means something else entirely.
 */

export interface Hud {
  element: HTMLElement
  /** Pass null for the verb to clear the prompt. */
  setPrompt(verb: string | null, name?: string): void
  setVisible(visible: boolean): void
  dispose(): void
}

export function createHud(mount: HTMLElement): Hud {
  const element = document.createElement('div')
  element.className = 'hud'
  element.setAttribute('aria-hidden', 'true')

  const reticle = document.createElement('div')
  reticle.className = 'reticle'
  element.append(reticle)

  const prompt = document.createElement('div')
  prompt.className = 'prompt'
  element.append(prompt)

  const verbLabel = document.createElement('span')
  verbLabel.className = 'prompt-verb'
  prompt.append(verbLabel)

  const nameLabel = document.createElement('span')
  nameLabel.className = 'prompt-name'
  prompt.append(nameLabel)

  mount.append(element)

  return {
    element,

    setPrompt(verb: string | null, name = ''): void {
      const showing = verb !== null
      prompt.classList.toggle('is-visible', showing)
      reticle.classList.toggle('is-active', showing)
      verbLabel.textContent = verb ?? ''
      nameLabel.textContent = showing ? name : ''
    },

    setVisible(visible: boolean): void {
      element.classList.toggle('is-hidden', !visible)
    },

    dispose(): void {
      element.remove()
    },
  }
}

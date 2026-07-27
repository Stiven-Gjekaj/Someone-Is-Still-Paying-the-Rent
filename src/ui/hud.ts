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
  /** What is in the player's hands, or null when their hands are empty. */
  setCarrying(name: string | null): void
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

  // Sits under the reticle rather than in a corner. It is not an inventory, it is
  // a reminder that your hands are full, and it should be in the way.
  const carrying = document.createElement('div')
  carrying.className = 'carrying'
  element.append(carrying)

  const carryName = document.createElement('span')
  carryName.className = 'carrying-name'
  carrying.append(carryName)

  const carryHint = document.createElement('span')
  carryHint.className = 'carrying-hint'
  carryHint.textContent = 'Put it back'
  carrying.append(carryHint)

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

    setCarrying(name: string | null): void {
      carrying.classList.toggle('is-visible', name !== null)
      carryName.textContent = name === null ? '' : `Carrying ${name.toLowerCase()}`
    },

    setVisible(visible: boolean): void {
      element.classList.toggle('is-hidden', !visible)
    },

    dispose(): void {
      element.remove()
    },
  }
}

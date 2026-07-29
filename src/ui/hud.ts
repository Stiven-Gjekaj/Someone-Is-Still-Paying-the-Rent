/**
 * The reticle and the interaction prompt.
 *
 * Section 4.2 asks for one context action, so the prompt is one verb and one
 * name and never a list. The reticle is a dot rather than a crosshair: this is a
 * game about looking at things, and a crosshair means something else entirely.
 *
 * Only the dot is hidden from assistive technology. The root used to be, which
 * hid the two things in here that are not decoration: the prompt is the only
 * thing that says what the crosshair is on, and the carry line is the only thing
 * that says what is in your hands. A player who cannot see the outline has no
 * other way to learn either, and since v0.5 gave the keyboard a way to step round
 * the room, the prompt is also the only feedback that a press of Tab did anything.
 *
 * Note that `aria-hidden="false"` on a descendant does not undo an ancestor's
 * `aria-hidden="true"`. The subtree is hidden and stays hidden, so the fix is to
 * stop hiding the root rather than to argue with it from the inside.
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

  const reticle = document.createElement('div')
  reticle.className = 'reticle'
  // A dot. There is nothing to say about it.
  reticle.setAttribute('aria-hidden', 'true')
  element.append(reticle)

  // Announced as one thing, so it arrives as "Examine, the three boxes" rather
  // than as a verb and a name a moment apart.
  const prompt = document.createElement('div')
  prompt.className = 'prompt'
  prompt.setAttribute('aria-live', 'polite')
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

  // The name is the live part and the hint is not. The hint never changes, and a
  // player told to put it back every time they pick something up would learn to
  // stop listening.
  const carryName = document.createElement('span')
  carryName.className = 'carrying-name'
  carryName.setAttribute('aria-live', 'polite')
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

      // Only when it has actually changed. This runs every frame, and writing
      // `textContent` replaces the text node whether or not the string differs,
      // which a live region reads as news. Unguarded, a screen reader says
      // "Examine, the desk" sixty times a second for as long as the player
      // stands there, which is worse than saying nothing at all.
      const nextVerb = verb ?? ''
      const nextName = showing ? name : ''

      if (verbLabel.textContent !== nextVerb) verbLabel.textContent = nextVerb
      if (nameLabel.textContent !== nextName) nameLabel.textContent = nextName
    },

    setCarrying(name: string | null): void {
      carrying.classList.toggle('is-visible', name !== null)

      // As above. This one is called far less often, and the rule is the same.
      const next = name === null ? '' : `Carrying ${name.toLowerCase()}`
      if (carryName.textContent !== next) carryName.textContent = next
    },

    setVisible(visible: boolean): void {
      element.classList.toggle('is-hidden', !visible)
    },

    dispose(): void {
      element.remove()
    },
  }
}

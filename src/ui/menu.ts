/**
 * The screens that are not the flat: the title, and later the pause menu.
 *
 * Kept separate from the advisory because they have different jobs. The advisory
 * is something you read once before you decide to play. The title is where you
 * decide.
 */

import { element, GAME_TITLE } from '../advisory.ts'

export interface MenuItem {
  label: string
  onSelect(): void
}

export interface Menu {
  showTitle(items: MenuItem[]): void
  close(): void
  isOpen(): boolean
  dispose(): void
}

export function createMenu(mount: HTMLElement): Menu {
  const element_ = document.createElement('div')
  element_.className = 'menu'

  const panel = document.createElement('div')
  panel.className = 'menu-panel'
  element_.append(panel)

  mount.append(element_)

  let open = false

  function present(nodes: HTMLElement[]): void {
    panel.replaceChildren(...nodes)
    open = true
    element_.classList.add('is-open')
  }

  function button(item: MenuItem, primary: boolean): HTMLButtonElement {
    const node = document.createElement('button')
    node.type = 'button'
    node.className = primary ? 'menu-action is-primary' : 'menu-action'
    node.textContent = item.label
    node.addEventListener('click', item.onSelect)
    return node
  }

  return {
    showTitle(items: MenuItem[]): void {
      const nodes: HTMLElement[] = [
        element('h1', 'menu-title', GAME_TITLE),
        element('p', 'menu-subtitle', 'November. The lease ends Sunday.'),
      ]

      const actions = element('div', 'menu-actions')
      items.forEach((item, index) => actions.append(button(item, index === 0)))
      nodes.push(actions)

      present(nodes)
    },

    close(): void {
      open = false
      element_.classList.remove('is-open')
      panel.replaceChildren()
    },

    isOpen(): boolean {
      return open
    },

    dispose(): void {
      element_.remove()
    },
  }
}

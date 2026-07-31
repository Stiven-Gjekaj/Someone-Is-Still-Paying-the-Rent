/**
 * The screens that are not the flat: the title, and later the pause menu.
 *
 * Kept separate from the advisory because they have different jobs. The advisory
 * is something you read once before you decide to play. The title is where you
 * decide.
 */

import { element, GAME_TITLE, renderResourceList } from '../advisory.ts'
import { getAdvisory } from '../content/index.ts'
import {
  FIELD_OF_VIEW_RANGE,
  SENSITIVITY_RANGE,
  TEXT_SCALE_RANGE,
  VOLUME_RANGE,
  type Settings,
} from '../settings.ts'

export interface MenuItem {
  label: string
  onSelect(): void
}

export interface Menu {
  showTitle(items: MenuItem[]): void
  showPause(items: MenuItem[]): void
  /** Hard Rule 9. Reachable from the pause menu at all times. */
  showResources(onBack: () => void): void
  showComfort(settings: Settings, onChange: (next: Settings) => void, onBack: () => void): void
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

    showPause(items: MenuItem[]): void {
      const nodes: HTMLElement[] = [
        element('p', 'menu-heading', 'Paused'),
        // Lena's note says it, the pause screen says it, and it is true either
        // way. The flat is not going anywhere.
        element('p', 'menu-subtitle', 'The flat will wait.'),
      ]

      const actions = element('div', 'menu-actions')
      items.forEach((item, index) => actions.append(button(item, index === 0)))
      nodes.push(actions)

      present(nodes)
    },

    showResources(onBack: () => void): void {
      const advisory = getAdvisory()
      const nodes: HTMLElement[] = [
        element('p', 'menu-heading', 'Support'),
        element('p', 'support-lead', advisory.lead_in),
        renderResourceList(),
      ]

      const actions = element('div', 'menu-actions')
      actions.append(button({ label: 'Back', onSelect: onBack }, false))
      nodes.push(actions)

      present(nodes)
    },

    showComfort(settings: Settings, onChange: (next: Settings) => void, onBack: () => void): void {
      const current: Settings = { ...settings }
      const nodes: HTMLElement[] = [element('p', 'menu-heading', 'Comfort')]

      const bobRow = element('label', 'option-row')
      const bobInput = document.createElement('input')
      bobInput.type = 'checkbox'
      bobInput.className = 'option-toggle'
      bobInput.checked = current.headBob
      bobInput.addEventListener('change', () => {
        current.headBob = bobInput.checked
        onChange({ ...current })
      })
      bobRow.append(bobInput)
      bobRow.append(element('span', 'option-label', 'Head movement while walking'))
      nodes.push(bobRow)

      const slider = (
        label: string,
        value: number,
        range: { min: number; max: number; step: number },
        format: (v: number) => string,
        apply: (v: number) => void,
      ): HTMLElement => {
        const row = element('label', 'option-row')
        row.append(element('span', 'option-label', label))

        const readout = element('span', 'option-value', format(value))

        const input = document.createElement('input')
        input.type = 'range'
        input.className = 'option-slider'
        input.min = String(range.min)
        input.max = String(range.max)
        input.step = String(range.step)
        input.value = String(value)
        input.addEventListener('input', () => {
          const next = Number(input.value)
          readout.textContent = format(next)
          apply(next)
          onChange({ ...current })
        })

        row.append(input)
        row.append(readout)
        return row
      }

      nodes.push(
        slider('Look sensitivity', current.sensitivity, SENSITIVITY_RANGE, (v) => v.toFixed(2), (v) => {
          current.sensitivity = v
        }),
      )
      nodes.push(
        slider('Volume', current.volume, VOLUME_RANGE, (v) => `${Math.round(v * 100)}`, (v) => {
          current.volume = v
        }),
      )
      nodes.push(
        slider('Field of view', current.fieldOfView, FIELD_OF_VIEW_RANGE, (v) => `${Math.round(v)}`, (v) => {
          current.fieldOfView = v
        }),
      )
      // Read as a percentage rather than a multiplier, because "125" is a thing
      // people have seen on an operating system's display settings and "1.25" is
      // not. The menu itself grows as this moves, which is the point: the setting
      // demonstrates itself while it is being chosen.
      nodes.push(
        slider('Text size', current.textScale, TEXT_SCALE_RANGE, (v) => `${Math.round(v * 100)}`, (v) => {
          current.textScale = v
        }),
      )

      const actions = element('div', 'menu-actions')
      actions.append(button({ label: 'Back', onSelect: onBack }, false))
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

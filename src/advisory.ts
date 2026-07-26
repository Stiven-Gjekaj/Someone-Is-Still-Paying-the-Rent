/**
 * Section 11. The content advisory and the support resources.
 *
 * Hard Rule 9 requires this before the main menu and reachable from the pause
 * menu at all times, which is why it is the first screen built and the only one
 * in this foundation build.
 *
 * Every string comes from `data/resources.json`. Nothing here is hardcoded, so
 * adding a region is a data change and never a code change. The nodes are built
 * with the DOM API rather than a template string: the resource list is the last
 * thing in this project that should ever be assembled by string concatenation.
 */

import { getAdvisory, getResources } from './content/index.ts'
import type { ResourceEntry } from './content/types.ts'

const GAME_TITLE = 'Someone Is Still Paying the Rent'

function element(tag: string, className: string, text?: string): HTMLElement {
  const node = document.createElement(tag)
  node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

function resourceItem(entry: ResourceEntry): HTMLLIElement {
  const item = document.createElement('li')
  item.className = 'support-item'

  const link = document.createElement('a')
  link.className = 'support-name'
  link.href = entry.url
  link.textContent = entry.name
  link.target = '_blank'
  link.rel = 'noreferrer'
  item.append(link)

  item.append(element('p', 'support-detail', entry.detail))

  // Optional, and deliberately shown last: the page is the thing to trust, and
  // a number that has moved is worse than no number at all.
  if (entry.phone !== undefined && entry.phone.trim().length > 0) {
    item.append(element('p', 'support-phone', entry.phone))
  }

  return item
}

export function renderAdvisory(mount: HTMLElement, region?: string): void {
  const advisory = getAdvisory()
  const resources = getResources(region)

  mount.replaceChildren()
  mount.append(element('p', 'title', GAME_TITLE))

  const heading = element('h1', 'advisory-heading', advisory.title)
  mount.append(heading)

  for (const line of advisory.lines) {
    mount.append(element('p', 'advisory-line', line))
  }

  const support = element('section', 'support')
  support.append(element('p', 'support-lead', advisory.lead_in))

  const list = document.createElement('ul')
  list.className = 'support-list'
  for (const entry of resources.entries) {
    list.append(resourceItem(entry))
  }
  support.append(list)
  mount.append(support)

  mount.append(
    element(
      'p',
      'footnote',
      'Foundation build. The flat is not built yet, so there is nothing past this screen.',
    ),
  )
}

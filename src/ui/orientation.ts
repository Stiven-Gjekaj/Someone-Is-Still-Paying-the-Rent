/**
 * Where you are, what is beside you, and which way the game is asking you to go.
 *
 * v0.5 made the game playable with a keyboard and readable to a screen reader,
 * and left a hole it named in the README: `Tab` solves aiming, not navigation.
 * The raycast's reach is 2.4 metres, so `Tab` finds what is already beside you.
 * A player who cannot see the room has no way to learn that the boxes are behind
 * them.
 *
 * This is the DOM half. The sentence itself is composed in
 * `src/rules/orientation.ts`, which is pure and tested, and the words come from
 * `data/orientation.json`, because player-facing strings live where the
 * validator and the v0.6 content review can read them.
 *
 * ## Announce-only
 *
 * Nothing is drawn. The screen is deliberately spare and a sighted player can
 * already see which room they are in. The words go to a visually hidden polite
 * region, built the way `src/ui/sequence.ts` builds `.beat-announcer` and for
 * the same reason: `aria-hidden` on an ancestor is not undone by anything on a
 * descendant, so an announcer has to live outside whatever it speaks for.
 */

import orientationRaw from '../../data/orientation.json'

import {
  orientationLine,
  type OrientationInput,
  type OrientationWords,
} from '../rules/orientation.ts'

const words = orientationRaw as unknown as OrientationWords

export interface Orientation {
  /** Says where the player is. Safe to call as often as the key is pressed. */
  announce(input: OrientationInput): string
  dispose(): void
}

export function createOrientation(mount: HTMLElement): Orientation {
  const region = document.createElement('div')

  // Two classes doing two jobs. `beat-announcer` carries the visually hidden
  // styling, which is the whole reason to reuse it. `orientation-announcer` says
  // which of the several announcers on the page this one is: the beats each
  // build their own, so anything selecting `.beat-announcer` gets whichever one
  // happens to be first in the document. The volume check in
  // `e2e/access.test.ts` once took the first slider on the page for the same
  // reason and read a working control as broken.
  region.className = 'beat-announcer orientation-announcer'
  region.setAttribute('aria-live', 'polite')
  mount.append(region)

  return {
    announce(input: OrientationInput): string {
      const line = orientationLine(input, words)

      // Replaced rather than appended. Pressing the key twice should say the
      // same thing twice, and a region that only ever grew would leave a screen
      // reader holding a transcript of every press.
      const node = document.createElement('p')
      node.textContent = line
      region.replaceChildren(node)

      return line
    },

    dispose(): void {
      region.remove()
    },
  }
}

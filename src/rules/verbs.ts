/**
 * Section 4.2. One context action, and which one it is.
 *
 * The order of the rules is the argument of the game. You cannot Take something
 * you have not looked at, so a sortable object offers Examine or Read first and
 * Take only afterwards. Putting a thing in a box without having looked at it is
 * exactly the thing the flat is asking you not to do, so the interface does not
 * offer it.
 *
 * Take beats Read once the thing has been read, and that is a design decision
 * rather than a reading of the bible: section 4.2 lists the three verbs without
 * saying which wins. Nine of the eleven keystone objects are sortable, so with
 * Read winning outright they could be read all night and never packed, and the
 * ending seals a box you were never able to put anything meaningful into.
 *
 * The cost is that a packable document is read once. That is the right cost for
 * this game. You can stand there and look at it for as long as you like, and once
 * you have, you have to decide what happens to it.
 *
 * Pure, and it takes a plain context rather than the session, so the table below
 * can be tested without a browser.
 */

import type { ActNumber, GameObject } from '../content/types.ts'

export interface VerbContext {
  act: ActNumber
  /** Has this particular object been examined at least once. */
  examined: boolean
  /** Is the player already holding something. */
  carrying: boolean
}

/**
 * Whether this object's document can be opened yet.
 *
 * Section 5 lists the phone as found in act 1 and read in act 3. It is on the
 * bedside table from the first minute, and its document is the thread that ends
 * the game. Opening it early does not spoil a detail, it spoils the whole thing.
 */
export function documentReadable(object: GameObject, act: ActNumber): boolean {
  if (object.text === undefined) return false
  return act >= (object.text_from_act ?? object.act_min)
}

/**
 * The verb, or null when the object offers nothing right now.
 *
 * Null happens while carrying: with something in your hands the only thing in
 * the flat that answers is the boxes, and a prompt on everything else would read
 * as an offer the game will not honour.
 */
export function verbFor(object: GameObject, context: VerbContext): string | null {
  if (context.carrying) {
    return object.sort_target === true ? 'Sort' : null
  }

  if (object.sortable && context.examined) return 'Take'
  if (documentReadable(object, context.act)) return 'Read'
  return 'Examine'
}

/**
 * The sentence the orientation key says, composed rather than rendered.
 *
 * Pure, and takes its words as an argument the way `src/interaction/reach.ts`
 * takes its points, so it runs under `node --test` with no renderer and no JSON
 * loader. `src/ui/orientation.ts` reads `data/orientation.json` and hands the
 * words in; everything with logic in it lives somewhere the tests can reach.
 *
 * ## What this is allowed to say
 *
 * Section 8.2 forbids an objective marker, and `src/interaction/reach.ts` says
 * in its own header not to widen Tab to "everything in the room". This stays
 * inside the same line:
 *
 * - the room, which is a fact about where the player is standing
 * - what is within reach, which is exactly what Tab would step through
 * - one bearing, to the single thing the goal line has already named out loud
 *
 * It does not enumerate the room, it does not rank anything, and it never points
 * at something the player has not been told about. The caller decides what
 * `toward` is; this only puts it into words.
 */

import { bearingFrom, type Point3 } from '../interaction/reach.ts'

export interface OrientationWords {
  nothing_in_reach: string
  in_reach_lead: string
  toward: string
  one_metre: string
  bearings: Record<string, string>
}

export interface Nearby {
  id: string
  name: string
  at: Point3
}

export interface OrientationInput {
  /** The room the player is standing in, by its player-facing name. */
  room: string
  from: Point3
  facing: number
  /** Everything within the raycast's reach, in the order Tab walks it. */
  inReach: Nearby[]
  /** The one thing the goal line is about, or null when there is nowhere to go. */
  toward: Nearby | null
}

function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => values[key] ?? whole)
}

export function orientationLine(input: OrientationInput, words: OrientationWords): string {
  const parts: string[] = [input.room.endsWith('.') ? input.room : `${input.room}.`]

  parts.push(
    input.inReach.length === 0
      ? words.nothing_in_reach
      : `${words.in_reach_lead} ${input.inReach.map((item) => item.name).join(', ')}.`,
  )

  // Only when it is somewhere else. Something already within reach has just been
  // named, Tab will step onto it, and "the three boxes, to your right, one metre"
  // straight after "within reach: the three boxes" is the same fact twice.
  const elsewhere = input.toward !== null
    && !input.inReach.some((item) => item.id === input.toward?.id)

  if (input.toward !== null && elsewhere) {
    // Flat distance and flat bearing. A thing on a high shelf is not further
    // away to somebody crossing a room toward it, and up is not a direction
    // anybody can walk in.
    const dx = input.toward.at.x - input.from.x
    const dz = input.toward.at.z - input.from.z
    const metres = Math.hypot(dx, dz)
    const key = bearingFrom(input.facing, Math.atan2(-dx, -dz))

    parts.push(fill(metres < 1.5 ? words.one_metre : words.toward, {
      name: input.toward.name,
      // Whole metres, and never fewer than two, because the template below 1.5
      // says "one metre" in words and rounding into it from above would give
      // two different sentences for the same distance.
      metres: String(Math.max(2, Math.round(metres))),
      bearing: words.bearings[key] ?? '',
    }))
  }

  return parts.join(' ')
}

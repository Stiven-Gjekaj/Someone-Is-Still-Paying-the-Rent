/**
 * How long a line stays alone on screen. Sections 4.3 and 8.3.
 *
 * Reading speed, not drama. A short line and a long one held for the same time
 * makes the short one feel like a pause and the long one feel like a race, and
 * both read as the game hurrying you through something it told you to sit with.
 *
 * One exception, and it is the whole of section 8.3: a line can ask to be held.
 * "Long silence on the last empty drawer" is not a reading-speed problem, it is
 * the point of the scene, and reading speed cannot express it.
 *
 * Pure and unit-tested, because the one thing that must never happen is a line
 * being replaced before it can be read.
 */

/** Long enough to notice a new line has arrived, before any reading happens. */
const SETTLE_MS = 900

/** Roughly a comfortable reading pace, slowed for a game nobody is racing. */
const MS_PER_CHARACTER = 26

/** Nothing is held longer than this, however long the sentence. */
const LONGEST_MS = 4200

/**
 * How long the silence is, when a beat asks for one.
 *
 * Long enough to be uncomfortable, which is what section 8.3 is doing. Anything
 * shorter reads as a loading pause rather than as somebody standing still in
 * front of an empty drawer.
 */
const HELD_MS = 4600

/** A line, and whether the beat after it is a silence rather than a sentence. */
export interface Paced {
  text: string
  hold?: boolean
}

function textOf(line: string | Paced): string {
  return typeof line === 'string' ? line : line.text
}

export function dwellFor(line: string | Paced): number {
  if (typeof line !== 'string' && line.hold === true) {
    return Math.min(LONGEST_MS, SETTLE_MS + line.text.length * MS_PER_CHARACTER) + HELD_MS
  }

  return Math.min(LONGEST_MS, SETTLE_MS + textOf(line).length * MS_PER_CHARACTER)
}

/**
 * When each line appears, in milliseconds from the start of the sequence.
 *
 * Line n arrives once line n-1 has had its dwell. The first is at zero: the
 * vignette has already closed by then, so there is nothing to wait for.
 */
export function lineSchedule(lines: (string | Paced)[]): number[] {
  const at: number[] = []
  let elapsed = 0

  for (const line of lines) {
    at.push(elapsed)
    elapsed += dwellFor(line)
  }

  return at
}

/** How long the whole sequence runs, from the first line to the last release. */
export function sequenceDuration(lines: (string | Paced)[]): number {
  return lines.reduce((total, line) => total + dwellFor(line), 0)
}

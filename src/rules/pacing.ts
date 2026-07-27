/**
 * How long a line of a memory stays alone on screen. Section 4.3.
 *
 * Reading speed, not drama. A short line and a long one held for the same time
 * makes the short one feel like a pause and the long one feel like a race, and
 * both read as the game hurrying you through something it told you to sit with.
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

export function dwellFor(line: string): number {
  return Math.min(LONGEST_MS, SETTLE_MS + line.length * MS_PER_CHARACTER)
}

/**
 * When each line appears, in milliseconds from the start of the sequence.
 *
 * Line n arrives once line n-1 has had its dwell. The first is at zero: the
 * vignette has already closed by then, so there is nothing to wait for.
 */
export function lineSchedule(lines: string[]): number[] {
  const at: number[] = []
  let elapsed = 0

  for (const line of lines) {
    at.push(elapsed)
    elapsed += dwellFor(line)
  }

  return at
}

/** How long the whole sequence runs, from the first line to the last release. */
export function sequenceDuration(lines: string[]): number {
  return lines.reduce((total, line) => total + dwellFor(line), 0)
}

/**
 * Section 8.3. The desk scene, and the no-note beat.
 *
 * Five blocks, authored in `data/scenes.json` and never to be added to. Stage
 * directions and two lines: the drawers going faster, the monologue shortening to
 * fragments, the sounds stopping, and then one sentence.
 *
 * **Hard Rule 3 is this scene.** There is no note in this game and none may ever
 * be added, not as content and not as cut content. The absence is the payoff, and
 * nothing follows the last line: no reveal, no sting, and the rain does not stop.
 * If you are here to add something after "You looked anyway", the answer is no.
 *
 * The blocks render through the same `renderBlock` every keystone document uses,
 * so a stage direction reads the way stage directions read everywhere else.
 */

import type { Scene, TextBlock } from '../content/types.ts'
import { dwellFor, lineSchedule, sequenceDuration, type Paced } from '../rules/pacing.ts'
import { renderBlock } from './document.ts'
import { createSequence } from './sequence.ts'

export interface DeskScene {
  /** Runs the scene and calls back once the flat is the player's again. */
  play(scene: Scene, onDone: () => void): void
  isPlaying(): boolean
  skip(): void
  dispose(): void
}

const FADE_MS = 1100

/** After the last line. Long, because there is nothing to hurry toward. */
const HOLD_MS = 3200

/**
 * How the drawers accelerate. Section 8.3: "the sounds get faster, then stop."
 *
 * Nine of them over the first block's dwell, each gap shorter than the last, and
 * then nothing at all for the rest of the scene. The stopping is the sound.
 */
const DRAWERS = 9
const FIRST_GAP_MS = 620
const LAST_GAP_MS = 130

/**
 * The pacing for the five blocks.
 *
 * Only the stage direction that says "long silence" holds, and it holds because
 * the scene is about standing still in front of an empty drawer rather than about
 * reading speed. Everything else is ordinary.
 */
function paced(blocks: TextBlock[]): Paced[] {
  return blocks.map((block) => {
    const text = 'text' in block ? block.text : ''
    return text.toLowerCase().includes('silence') ? { text, hold: true } : { text }
  })
}

export function createDeskScene(mount: HTMLElement, onDrawer: () => void): DeskScene {
  const sequence = createSequence(mount, {
    className: 'desk-scene',
    fadeMs: FADE_MS,
    skipOn: 'escape',
  })

  const body = document.createElement('div')
  body.className = 'desk-scene-body'
  sequence.element.append(body)

  return {
    play(scene, onDone): void {
      if (sequence.isPlaying()) return

      const blocks = scene.blocks ?? []
      const nodes = blocks.map((block) => {
        const node = renderBlock(block)
        node.classList.add('desk-line')
        return node
      })

      body.replaceChildren(...nodes)
      sequence.begin(onDone)

      const timing = paced(blocks)

      lineSchedule(timing).forEach((at, index) => {
        sequence.after(FADE_MS + at, () => {
          for (let i = 0; i < index; i += 1) nodes[i]?.classList.add('is-past')
          nodes[index]?.classList.add('is-shown')
        })
      })

      // The drawers, under the opening stage direction only, the gap between them
      // shrinking each time. They stop before the line about the sounds stopping,
      // so the silence lands on the sentence rather than under it.
      const under = dwellFor(timing[0] ?? { text: '' })
      let at = 0

      for (let i = 0; i < DRAWERS && at < under; i += 1) {
        sequence.after(FADE_MS + at, onDrawer)
        at += FIRST_GAP_MS + (LAST_GAP_MS - FIRST_GAP_MS) * (i / (DRAWERS - 1))
      }

      sequence.after(FADE_MS + sequenceDuration(timing) + HOLD_MS, sequence.end)
    },

    isPlaying: sequence.isPlaying,
    skip: sequence.end,
    dispose: sequence.dispose,
  }
}

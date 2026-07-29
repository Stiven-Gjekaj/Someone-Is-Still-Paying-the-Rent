/**
 * Section 8.4. The last twenty minutes of the night, in six steps.
 *
 * The steps are authored in `data/scenes.json` under the `ending` scene and are
 * followed here in order: the box seals, the player takes one thing, the
 * voicemail plays, the key goes down, the door shuts, and the morning is
 * outside it. Then the final card, then the support resources.
 *
 * Two rules run through all of it.
 *
 * **No commentary on the choice, ever.** The data says so twice and it is the
 * single most load-bearing sentence in the section. The player picks one object
 * out of the Lena box, the game records which, and nothing anywhere says a word
 * about it. Not a line, not a reaction, not a different ending. The exterior is
 * the only thing that knows, and all it knows is that something was taken.
 *
 * **Hard Rule 9 all the way through.** Escape ends whatever is on screen, and
 * the resources are two keys away at every point, exactly as they are during a
 * memory or the desk scene. Nothing here traps anybody in an ending.
 *
 * There is almost no new prose in this file, which is deliberate. The steps in
 * the data are directions to a builder, not lines to a player, and the only
 * words the player reads at the end are the ones somebody wrote for them: the
 * voicemail, the prompt, and the card.
 */

import type { GameObject, Scene } from '../content/types.ts'
import type { GameState } from '../content/flags.ts'
import type { Audio } from '../audio/audio.ts'
import type { PropFactory } from '../world/props.ts'
import type { View } from '../core/engine.ts'
import { createExterior, type Exterior } from '../world/exterior.ts'
import { lineSchedule, sequenceDuration, type Paced } from '../rules/pacing.ts'
import { renderBlock } from './document.ts'
import { createSequence } from './sequence.ts'
import type { Overlay } from './overlay.ts'

export interface EndingConfig {
  overlay: Overlay
  /**
   * Read lazily. The sound comes up after the screens do, so the session builds
   * this before it has an `Audio` to hand it, the same way the opening beat gets
   * the key in the lock.
   */
  audio(): Audio
  props: PropFactory
  state: GameState
  /** Everything the player put in the Lena box, already in content order. */
  keeping(): GameObject[]
  /** Section 8.4. Swaps the flat for the morning outside it. */
  setView(view: View | null): void
  /** Section 11. Where the night lets go of the player. */
  onResources(): void
}

export interface EndingPlayer {
  /** Runs the whole sequence. `onDone` fires when the resources are reached. */
  play(voicemail: Scene, card: Scene): void
  isPlaying(): boolean
  skip(): void
  dispose(): void
}

const FADE_MS = 1400

/** The tape, and the box being a different box afterwards. */
const SEAL_MS = 2600

/** Between the buzz and the first line of the voicemail. */
const BUZZ_MS = 1500

/** The key, then the door, then the stairs, then outside. */
const KEY_MS = 1400
const DOOR_MS = 2200

/** How long the morning is held before the card arrives, and after it. */
const EXTERIOR_MS = 4200
const CARD_MS = 6000

/** The prompt, authored in the ending scene's second step. */
const PROMPT = 'Take one thing.'

/** Neutral, and it has to be: not taking anything is an answer. */
const PROMPT_HINT = 'Escape to take nothing'

/**
 * How long each voicemail block runs, and whether it ends on a rise.
 *
 * The stage directions are not spoken, so they get no voice under them. The two
 * lines do, and the first of them trails off rather than finishing, which is
 * what the ellipsis in the authored text is doing.
 */
function spoken(block: { kind: string; text: string }): { seconds: number; lift: boolean } | null {
  if (block.kind === 'stage') return null

  const seconds = Math.min(6, 1.1 + block.text.length * 0.045)
  return { seconds, lift: block.text.trimEnd().endsWith('...') }
}

export function createEndingPlayer(mount: HTMLElement, config: EndingConfig): EndingPlayer {
  const { overlay, props, state } = config

  const sequence = createSequence(mount, {
    className: 'ending',
    fadeMs: FADE_MS,
    skipOn: 'escape',
  })

  const body = document.createElement('div')
  body.className = 'ending-body'
  sequence.element.append(body)

  let exterior: Exterior | null = null
  let running = false

  function clearView(): void {
    config.setView(null)
    exterior?.dispose()
    exterior = null
  }

  /**
   * Ends the whole thing and hands the player to section 11.
   *
   * The morning stays on screen through the fade rather than being cleared with
   * everything else. Putting the flat back underneath a fading ending would show
   * the player a room they have already left, for a second and a half, which is
   * the worst possible last frame. The view is dropped in `dispose`, once the
   * session that owns it is going away too.
   */
  function finish(): void {
    running = false
    sequence.end()
  }

  sequence.onEnd(() => {
    running = false
  })

  return {
    play(voicemail: Scene, card: Scene): void {
      if (running || sequence.isPlaying()) return

      running = true
      body.replaceChildren()

      // The screen is taken now, faintly, so the flat is still there behind the
      // first two steps: the box is sealed in the room and the choice is made
      // in it. It goes to black for the voicemail.
      sequence.element.classList.remove('is-dark', 'is-revealing', 'is-card')
      sequence.begin(() => config.onResources())

      // Step 1. The box seals. No words: the sound and the tape are the beat,
      // and the data's step text is a direction rather than a line.
      sequence.after(400, () => {
        config.audio().playTape()
        props.sealLenaBox(true)
      })

      // Step 2. Take one thing. Everything in the box, listed, in content order,
      // and no commentary on any of it before, during, or after.
      sequence.after(SEAL_MS, () => {
        const keeping = config.keeping()

        if (keeping.length === 0) {
          // Nothing went to Lena. There is nothing to take and nothing to say
          // about that either, so the night carries on to the voicemail.
          voicemailStep()
          return
        }

        overlay.showChoice(
          PROMPT,
          keeping.map((object) => ({
            label: object.name,
            onSelect: (): void => {
              state.taken = object.id
              voicemailStep()
            },
          })),
          PROMPT_HINT,
        )

        // Escape closes the chooser without choosing, which is allowed, and the
        // night has to carry on from there rather than stopping.
        const carryOn = (): void => {
          if (!running) return
          if (state.taken === null) voicemailStep()
        }
        overlay.onClose(carryOn)
      })

      let past = false

      function voicemailStep(): void {
        // `onClose` fires on the chooser's way out whichever way it left, and it
        // is registered for the life of the session, so this guards itself.
        if (past || !running) return
        past = true

        // Step 3. Your own phone, on a hard surface. Not a call.
        sequence.element.classList.add('is-dark')
        sequence.after(300, () => void config.audio().playBuzz())

        const blocks = voicemail.blocks ?? []
        const nodes = blocks.map((block) => {
          const node = renderBlock(block)
          node.classList.add('ending-line')
          return node
        })

        body.replaceChildren(...nodes)

        const timing: Paced[] = blocks.map((block) => ({ text: block.text }))
        const schedule = lineSchedule(timing)

        schedule.forEach((at, index) => {
          sequence.after(BUZZ_MS + at, () => {
            for (let i = 0; i < index; i += 1) nodes[i]?.classList.add('is-past')
            nodes[index]?.classList.add('is-shown')

            const block = blocks[index]
            sequence.announce(block?.text ?? '')

            const line = block === undefined ? null : spoken(block)
            if (line !== null) config.audio().playVoice(line.seconds, line.lift, index + 1)
          })
        })

        const spoke = BUZZ_MS + sequenceDuration(timing)

        // Step 4. The key. The bowl answers only if the bowl is still there.
        sequence.after(spoke + KEY_MS, () => {
          body.replaceChildren()
          config.audio().playKeyDown(state.objects['key_bowl']?.sorted_to == null)
        })

        // Step 5. The door, and then the flat is behind you and quiet. The same
        // lock the game opened on, which is the only bookend it allows itself.
        sequence.after(spoke + KEY_MS + DOOR_MS, () => {
          config.audio().playKeyInLock()
          config.audio().leave(1.8)
        })

        // The morning. The rain stopped at some point and nobody saw it.
        const outside = spoke + KEY_MS + DOOR_MS + 2600

        sequence.after(outside, () => {
          const shot = createExterior()
          shot.setLights(state.lights_on)
          exterior = shot
          config.setView(shot)

          // The black lifts off the shot rather than cutting, so the first thing
          // the player sees outside is the light arriving.
          sequence.element.classList.add('is-revealing')
        })

        // Step 6. The card, in small type, over it. One sentence, and then the
        // support resources, which is where the game stops talking.
        sequence.after(outside + EXTERIOR_MS, () => {
          const line = (card.blocks ?? [])[0]
          if (line === undefined) return

          const node = renderBlock(line)
          node.classList.add('ending-card')
          node.classList.add('is-shown')
          body.replaceChildren(node)
          sequence.announce(line.text)
          // Low in the frame, out of the middle of the shot it is sitting over.
          sequence.element.classList.add('is-card')
        })

        sequence.after(outside + EXTERIOR_MS + CARD_MS, finish)
      }
    },

    isPlaying(): boolean {
      return sequence.isPlaying()
    },

    skip: finish,

    dispose(): void {
      clearView()
      sequence.dispose()
    },
  }
}

/**
 * Section 8.3, and Hard Rule 3.
 *
 * Two things are checked here. The first is mechanical: the desk defers until
 * the thread is read, then runs once, then stops being a scene and goes back to
 * being furniture. If it ran every time, the beat would be a loop, and a beat
 * you can replay on demand is not a beat.
 *
 * The second is the rule. There is no note in this game. The scene's last line
 * is the payoff and the payoff is an absence, so the shape of the authored data
 * is checked directly: five blocks, the sentence, and after it nothing but the
 * stage direction that says nothing follows. The validator enforces the same
 * thing at build time. It is worth having twice.
 */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

import { createInitialState } from '../src/content/flags.ts'
import { applyFlagEffects, examineEffects } from '../src/rules/effects.ts'
import { resolveExamine } from '../src/rules/secondlook.ts'
import { dwellFor, lineSchedule, sequenceDuration } from '../src/rules/pacing.ts'
import type { GameObject, Scene, SceneData, TextBlock } from '../src/content/types.ts'

const objects = JSON.parse(
  readFileSync(new URL('../data/objects.json', import.meta.url), 'utf8'),
) as GameObject[]

const sceneData = JSON.parse(
  readFileSync(new URL('../data/scenes.json', import.meta.url), 'utf8'),
) as SceneData

function required<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(`${what} is missing from data/`)
  return value
}

const desk = required(
  objects.find((object) => object.id === 'desk'),
  'the desk object',
)

const scene = required(
  sceneData.scenes.find((entry) => entry.id === 'desk_scene'),
  'the desk scene',
)

/** The look the session performs, in the order the session performs it. */
function look(state = createInitialState()) {
  const reading = resolveExamine(desk, state)
  const effects = examineEffects(desk, state, reading.secondLook)
  applyFlagEffects(state, effects)

  return { state, effects, reading }
}

/** Act 3 with the thread read, which is the only state the scene runs in. */
function afterTheThread() {
  const state = createInitialState()
  state.act = 3
  state.thread_read = true
  return state
}

function blocksOf(entry: Scene): TextBlock[] {
  return required(entry.blocks, 'the desk scene blocks')
}

describe('when the desk is a scene', () => {
  it('defers in act 1, which is what its examine text says it does', () => {
    const { effects, reading } = look()

    assert.deepEqual(effects, [])
    assert.equal(reading.text, 'His desk. Paper everywhere. Later.')
  })

  it('still defers in act 3 until the thread has actually been read', () => {
    const state = createInitialState()
    state.act = 3

    const { effects } = look(state)
    assert.deepEqual(effects, [])
  })

  it('runs once the thread is read, and marks itself done in the same look', () => {
    const state = afterTheThread()
    const { effects } = look(state)

    assert.ok(effects.some((effect) => effect.kind === 'desk_scene'))
    assert.equal(state.desk_done, true)
  })

  it('does not run again, because a beat that repeats is not a beat', () => {
    const state = afterTheThread()

    look(state)
    const { effects } = look(state)

    assert.deepEqual(effects, [])
  })

  it('stops saying "Later" once later has happened', () => {
    const state = afterTheThread()

    look(state)
    const { reading } = look(state)

    assert.equal(reading.secondLook, true)
    assert.notEqual(reading.text, desk.examine)
  })
})

describe('the authored scene', () => {
  it('is the five blocks section 8.3 describes and no more', () => {
    assert.equal(blocksOf(scene).length, 5)
  })

  it('ends on the sentence, with nothing after it but the stage direction', () => {
    const blocks = blocksOf(scene)
    const lines = blocks.filter((block) => block.kind === 'line')
    const last = lines.at(-1)

    assert.ok(last !== undefined)
    assert.equal(last.text, "Most people don't leave one. You knew that. You looked anyway.")

    // Hard Rule 3. Everything after the payoff is a stage direction saying that
    // nothing happens. Anything else here is content added after the absence,
    // which is the one thing this game may never do.
    const after = blocks.slice(blocks.indexOf(last) + 1)
    assert.deepEqual(
      after.map((block) => block.kind),
      ['stage'],
    )
  })

  it('says in its own stage direction that nothing follows', () => {
    const last = blocksOf(scene).at(-1)

    assert.ok(last !== undefined)
    assert.equal(last.kind, 'stage')
    assert.match(last.text, /Nothing else/i)
  })
})

describe('the pacing of the scene', () => {
  it('holds on the silence longer than on anything it is asked to read', () => {
    const [drawers, fragments, silence] = blocksOf(scene).map((block) => block.text)

    assert.ok(drawers !== undefined && fragments !== undefined && silence !== undefined)
    assert.ok(dwellFor({ text: silence, hold: true }) > dwellFor(drawers))
    assert.ok(dwellFor({ text: silence, hold: true }) > dwellFor(fragments))
  })

  it('never replaces a line before it can be read', () => {
    const timing = blocksOf(scene).map((block) => ({
      text: block.text,
      hold: block.text.toLowerCase().includes('silence'),
    }))

    const at = lineSchedule(timing)

    for (let i = 1; i < at.length; i += 1) {
      const previous = at[i - 1]
      const current = at[i]
      const held = timing[i - 1]

      assert.ok(previous !== undefined && current !== undefined && held !== undefined)
      assert.equal(current - previous, dwellFor(held))
    }

    assert.equal(sequenceDuration(timing), timing.reduce((sum, line) => sum + dwellFor(line), 0))
  })
})

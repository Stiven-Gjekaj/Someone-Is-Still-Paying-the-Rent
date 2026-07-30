/**
 * Content validator.
 *
 * Run with `npm run validate`, which is `node scripts/validate-content.ts`. Node
 * 24 strips the types, so there is no loader and no dependency. Every annotation
 * in this repository has to stay erasable for that to keep working, which the
 * `erasableSyntaxOnly` compiler flag enforces.
 *
 * This file reads the data with `fs` rather than importing it, because it needs
 * the raw text as well as the parsed objects.
 */

import { readFileSync, readdirSync } from 'node:fs'
import { extname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  FLOOR_MATERIALS,
  FURNITURE_SHAPES,
  OBJECT_TYPES,
  OPENING_KINDS,
  PALETTE_KEYS,
  PROP_POSES,
  PROP_SHAPES,
  ROOM_IDS,
  SURFACE_ORIENTATIONS,
  TEXT_BLOCK_KINDS,
  WALL_SIDES,
} from '../src/content/types.ts'
import {
  BOOLEAN_FLAGS,
  createInitialState,
  parseFlagReference,
  type GameState,
} from '../src/content/flags.ts'
import { examineEffects } from '../src/rules/effects.ts'
import type { GameObject } from '../src/content/types.ts'
import { READ } from './content-review.ts'

const ROOT = fileURLToPath(new URL('..', import.meta.url))

interface Problem {
  category: string
  where: string
  message: string
}

const problems: Problem[] = []

function fail(category: string, where: string, message: string): void {
  problems.push({ category, where, message })
}

function loadJson(relPath: string): unknown {
  return JSON.parse(readFileSync(join(ROOT, relPath), 'utf8'))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

const OBJECT_TYPE_SET: ReadonlySet<string> = new Set(OBJECT_TYPES)
const ROOM_ID_SET: ReadonlySet<string> = new Set(ROOM_IDS)
const BLOCK_KIND_SET: ReadonlySet<string> = new Set(TEXT_BLOCK_KINDS)
const BOOLEAN_FLAG_SET: ReadonlySet<string> = new Set(BOOLEAN_FLAGS)

const ID_PATTERN = /^[a-z][a-z0-9_]*$/

/** Fields each block kind must carry. `timestamp` is the one that may be blank. */
const BLOCK_FIELDS: Record<string, readonly string[]> = {
  line: ['text'],
  entry: ['time', 'text'],
  annotation: ['where', 'text'],
  message: ['sender', 'timestamp', 'text'],
  caption: ['label', 'text'],
  signature: ['text'],
  stage: ['text'],
}

const BLOCK_FIELDS_MAY_BE_BLANK: ReadonlySet<string> = new Set(['timestamp'])

const objects = loadJson('data/objects.json') as Record<string, unknown>[]
const fragments = loadJson('data/fragments.json') as Record<string, unknown>[]
const texts = loadJson('data/texts.json') as Record<string, unknown>[]
const roomData = loadJson('data/rooms.json') as Record<string, unknown>
const sceneData = loadJson('data/scenes.json') as Record<string, unknown>
const resources = loadJson('data/resources.json') as Record<string, unknown>
const floorPlan = loadJson('data/floorplan.json') as Record<string, unknown>

const objectIds = new Set(objects.map((o) => String(o['id'])))
const fragmentIds = new Set(fragments.map((f) => String(f['id'])))
const textIds = new Set(texts.map((t) => String(t['id'])))

// ---------------------------------------------------------------------------
// Blocks
// ---------------------------------------------------------------------------

function checkBlocks(category: string, where: string, blocks: unknown): void {
  if (!Array.isArray(blocks) || blocks.length === 0) {
    fail(category, where, 'blocks must be a non-empty array')
    return
  }

  blocks.forEach((block, index) => {
    const at = `${where} block ${index}`

    if (!isRecord(block)) {
      fail(category, at, 'block must be an object')
      return
    }

    const kind = block['kind']
    if (typeof kind !== 'string' || !BLOCK_KIND_SET.has(kind)) {
      fail(category, at, `unknown block kind ${JSON.stringify(kind)}`)
      return
    }

    const required = BLOCK_FIELDS[kind] ?? []
    for (const field of required) {
      const value = block[field]
      if (typeof value !== 'string') {
        fail(category, at, `kind "${kind}" needs a string "${field}"`)
      } else if (value.trim().length === 0 && !BLOCK_FIELDS_MAY_BE_BLANK.has(field)) {
        fail(category, at, `"${field}" is empty`)
      }
    }
  })
}

// ---------------------------------------------------------------------------
// Rooms
// ---------------------------------------------------------------------------

const rooms = roomData['rooms']
if (!Array.isArray(rooms)) {
  fail('rooms', 'data/rooms.json', 'rooms must be an array')
} else {
  const seen = new Set<string>()

  for (const room of rooms) {
    if (!isRecord(room)) {
      fail('rooms', 'data/rooms.json', 'room must be an object')
      continue
    }

    const id = room['id']
    if (typeof id !== 'string' || !ROOM_ID_SET.has(id)) {
      fail('rooms', `room ${JSON.stringify(id)}`, 'unknown room id')
      continue
    }
    if (seen.has(id)) fail('rooms', `room ${id}`, 'duplicate room')
    seen.add(id)

    for (const field of ['name', 'mood', 'purpose']) {
      if (!nonEmptyString(room[field])) fail('rooms', `room ${id}`, `"${field}" is missing or empty`)
    }
  }

  for (const id of ROOM_IDS) {
    if (!seen.has(id)) fail('rooms', `room ${id}`, 'declared in types.ts but missing from rooms.json')
  }
}

if (!Array.isArray(roomData['lighting_progression']) || roomData['lighting_progression'].length === 0) {
  fail('rooms', 'data/rooms.json', 'lighting_progression must be a non-empty array')
}

// ---------------------------------------------------------------------------
// Objects
// ---------------------------------------------------------------------------

const seenObjectIds = new Set<string>()
const sortTargets: string[] = []
const hiddenObjects: { id: string; until: string }[] = []

for (const object of objects) {
  const rawId = object['id']
  const id = typeof rawId === 'string' ? rawId : '(no id)'
  const where = `object ${id}`

  if (typeof rawId !== 'string' || !ID_PATTERN.test(rawId)) {
    fail('objects', where, 'id must be snake_case')
  }
  if (seenObjectIds.has(id)) fail('objects', where, 'duplicate id')
  seenObjectIds.add(id)

  if (!nonEmptyString(object['name'])) fail('objects', where, 'name is missing or empty')
  if (!nonEmptyString(object['examine'])) fail('objects', where, 'examine is missing or empty')
  if (typeof object['sortable'] !== 'boolean') fail('objects', where, 'sortable must be a boolean')

  const sortTarget = object['sort_target']
  if (sortTarget !== undefined) {
    if (sortTarget !== true) {
      fail('objects', where, 'sort_target may only be true, or left out')
    } else {
      if (object['sortable'] === true) {
        fail('objects', where, 'the boxes cannot be put in the boxes: sort_target and sortable disagree')
      }
      sortTargets.push(id)
    }
  }

  const room = object['room']
  if (typeof room !== 'string' || !ROOM_ID_SET.has(room)) {
    fail('objects', where, `unknown room ${JSON.stringify(room)}`)
  }

  const actMin = object['act_min']
  if (typeof actMin !== 'number' || !Number.isInteger(actMin) || actMin < 1 || actMin > 3) {
    fail('objects', where, 'act_min must be 1, 2 or 3')
  }

  const types = object['type']
  if (!Array.isArray(types) || types.length === 0) {
    fail('objects', where, 'type must be a non-empty array')
  } else {
    for (const t of types) {
      if (typeof t !== 'string' || !OBJECT_TYPE_SET.has(t)) {
        fail('objects', where, `unknown type ${JSON.stringify(t)}`)
      }
    }

    if (types.includes('memory') && object['fragment'] === undefined) {
      fail('objects', where, 'typed "memory" but carries no fragment')
    }
    if (types.includes('keystone') && object['text'] === undefined) {
      fail('objects', where, 'typed "keystone" but carries no text')
    }
  }

  const fragment = object['fragment']
  if (fragment !== undefined) {
    if (typeof fragment !== 'string' || !fragmentIds.has(fragment)) {
      fail('objects', where, `fragment ${JSON.stringify(fragment)} does not exist`)
    } else {
      const target = fragments.find((f) => f['id'] === fragment)
      if (target !== undefined && target['trigger'] !== id) {
        fail('objects', where, `fragment ${fragment} is triggered by ${String(target['trigger'])}, not this object`)
      }
    }
  }

  const text = object['text']
  if (text !== undefined) {
    if (typeof text !== 'string' || !textIds.has(text)) {
      fail('objects', where, `text ${JSON.stringify(text)} does not exist`)
    } else {
      const target = texts.find((t) => t['id'] === text)
      if (target !== undefined && target['object'] !== id) {
        fail('objects', where, `text ${text} points back at ${String(target['object'])}, not this object`)
      }
    }
  }

  // Section 5 lets an object appear in one act and become readable in a later
  // one. The two numbers have to agree in that direction.
  const textFromAct = object['text_from_act']
  if (textFromAct !== undefined) {
    if (typeof textFromAct !== 'number' || !Number.isInteger(textFromAct) || textFromAct < 1 || textFromAct > 3) {
      fail('objects', where, 'text_from_act must be 1, 2 or 3')
    } else if (object['text'] === undefined) {
      fail('objects', where, 'text_from_act is set but the object has no text to read')
    } else if (typeof actMin === 'number' && textFromAct < actMin) {
      fail('objects', where, `text_from_act ${textFromAct} is before the object exists in act ${actMin}`)
    }
  }

  // An object can be in the flat and still not be in the room: the Mira thread is
  // in a shoebox and the demo is behind a record. What hides it has to be a
  // condition something can actually satisfy, or the object is unfindable and
  // nothing else in the pipeline would say so.
  const hiddenUntil = object['hidden_until']
  if (hiddenUntil !== undefined) {
    if (typeof hiddenUntil !== 'string') {
      fail('objects', where, 'hidden_until must be a flag reference string')
    } else {
      const ref = parseFlagReference(hiddenUntil)
      if (ref === null) {
        fail('objects', where, `hidden_until ${JSON.stringify(hiddenUntil)} names no known flag`)
      } else if (ref.kind === 'derived') {
        if (!objectIds.has(ref.object)) {
          fail('objects', where, `hidden_until refers to object ${ref.object}, which does not exist`)
        } else if (ref.object === id) {
          fail('objects', where, 'hidden_until refers to the object itself, which can never be found')
        }
      }
      hiddenObjects.push({ id, until: hiddenUntil })
    }
  }

  const secondLook = object['second_look']
  if (secondLook !== undefined) {
    if (!isRecord(secondLook)) {
      fail('second look', where, 'second_look must be an object')
    } else {
      if (!nonEmptyString(secondLook['text'])) {
        fail('second look', where, 'second_look.text is missing or empty')
      }

      const raw = secondLook['requires_flag']
      if (typeof raw !== 'string') {
        fail('second look', where, 'second_look.requires_flag must be a string')
      } else {
        const ref = parseFlagReference(raw)
        if (ref === null) {
          fail('second look', where, `requires_flag ${JSON.stringify(raw)} names no known flag`)
        } else if (ref.kind === 'derived' && !objectIds.has(ref.object)) {
          fail('second look', where, `requires_flag refers to object ${ref.object}, which does not exist`)
        }
      }
    }
  }
}

// Whatever hides an object has to be reachable before the object is. A shoebox
// the player can only open in act 3 cannot be hiding an act 2 object, and an
// object hidden behind another object's second look needs that second look to
// exist. Either mistake leaves something in the data that no playthrough can
// ever reach, and nothing else here would notice.
for (const hidden of hiddenObjects) {
  const object = objects.find((o) => o['id'] === hidden.id)
  const ref = parseFlagReference(hidden.until)
  if (object === undefined || ref === null || ref.kind !== 'derived') continue

  const gate = objects.find((o) => o['id'] === ref.object)
  if (gate === undefined) continue

  const hiddenAct = object['act_min']
  const gateAct = gate['act_min']

  if (typeof hiddenAct === 'number' && typeof gateAct === 'number' && gateAct > hiddenAct) {
    fail(
      'objects',
      `object ${hidden.id}`,
      `hidden behind ${ref.object}, which does not appear until act ${gateAct}, but this appears in act ${hiddenAct}`,
    )
  }

  if (ref.prefix === 'secondlook' && gate['second_look'] === undefined) {
    fail('objects', `object ${hidden.id}`, `hidden behind a second look ${ref.object} does not have`)
  }

  if (gate['hidden_until'] === hidden.until) {
    fail('objects', `object ${hidden.id}`, `hidden behind ${ref.object}, which is hidden behind the same thing`)
  }
}

// Section 4.1 has one place things go. Two would mean the destination chooser
// depended on which set of boxes you happened to walk up to, and none would mean
// twenty-four sortable objects with nowhere to put them.
if (sortTargets.length !== 1) {
  fail(
    'objects',
    'sorting',
    `exactly one object must carry sort_target, found ${sortTargets.length}${
      sortTargets.length === 0 ? '' : `: ${sortTargets.join(', ')}`
    }`,
  )
}

// ---------------------------------------------------------------------------
// Fragments
// ---------------------------------------------------------------------------

const seenFragmentIds = new Set<string>()

for (const fragment of fragments) {
  const rawId = fragment['id']
  const id = typeof rawId === 'string' ? rawId : '(no id)'
  const where = `fragment ${id}`

  if (typeof rawId !== 'string' || !/^F-\d{2}$/.test(rawId)) {
    fail('fragments', where, 'id must look like F-01')
  }
  if (seenFragmentIds.has(id)) fail('fragments', where, 'duplicate id')
  seenFragmentIds.add(id)

  if (!nonEmptyString(fragment['beat'])) fail('fragments', where, 'beat is missing or empty')

  const trigger = fragment['trigger']
  if (typeof trigger !== 'string' || !objectIds.has(trigger)) {
    fail('fragments', where, `trigger ${JSON.stringify(trigger)} is not an object id`)
  } else {
    const target = objects.find((o) => o['id'] === trigger)
    const act = fragment['act']
    const actMin = target?.['act_min']
    if (typeof act === 'number' && typeof actMin === 'number' && act < actMin) {
      fail('fragments', where, `act ${act} is before its trigger's act_min of ${actMin}`)
    }
  }

  const act = fragment['act']
  if (typeof act !== 'number' || !Number.isInteger(act) || act < 1 || act > 3) {
    fail('fragments', where, 'act must be 1, 2 or 3')
  }

  // Section 4.3 asks for three to six lines of interior monologue.
  const lines = fragment['lines']
  if (!Array.isArray(lines)) {
    fail('fragments', where, 'lines must be an array')
  } else {
    if (lines.length < 3 || lines.length > 6) {
      fail('fragments', where, `has ${lines.length} lines, section 4.3 asks for 3 to 6`)
    }
    lines.forEach((line, index) => {
      if (!nonEmptyString(line)) fail('fragments', `${where} line ${index}`, 'line is empty')
    })
  }
}

// Section 6 names exactly twelve.
for (let n = 1; n <= 12; n += 1) {
  const id = `F-${String(n).padStart(2, '0')}`
  if (!fragmentIds.has(id)) fail('fragments', `fragment ${id}`, 'named in section 6 but missing')
}

// ---------------------------------------------------------------------------
// Keystone texts
// ---------------------------------------------------------------------------

const seenTextIds = new Set<string>()

for (const text of texts) {
  const rawId = text['id']
  const id = typeof rawId === 'string' ? rawId : '(no id)'
  const where = `text ${id}`

  if (typeof rawId !== 'string' || !ID_PATTERN.test(rawId)) fail('texts', where, 'id must be snake_case')
  if (seenTextIds.has(id)) fail('texts', where, 'duplicate id')
  seenTextIds.add(id)

  for (const field of ['section', 'title', 'form']) {
    if (!nonEmptyString(text[field])) fail('texts', where, `"${field}" is missing or empty`)
  }

  const owner = text['object']
  if (typeof owner !== 'string' || !objectIds.has(owner)) {
    fail('texts', where, `object ${JSON.stringify(owner)} does not exist`)
  }

  const claimants = objects.filter((o) => o['text'] === id)
  if (claimants.length === 0) {
    fail('texts', where, 'no object opens this document')
  } else if (claimants.length > 1) {
    fail('texts', where, `claimed by ${claimants.length} objects: ${claimants.map((o) => String(o['id'])).join(', ')}`)
  }

  checkBlocks('texts', where, text['blocks'])
}

// ---------------------------------------------------------------------------
// Acts and scenes
// ---------------------------------------------------------------------------

/**
 * The shape of a condition on an act, whichever field it arrived under.
 *
 * `gate_to_next` and `ends_when` ask the same question at opposite ends of an
 * act, and the second one earned its own field rather than its own rules.
 */
function checkActGate(where: string, label: string, act: number, gate: unknown): void {
  if (!isRecord(gate)) {
    fail('scenes', where, `${label} must be an object`)
    return
  }

  if (!nonEmptyString(gate['description'])) {
    fail('scenes', where, `${label}.description is missing or empty`)
  }

  const required = gate['requires_flags']
  if (required !== undefined) {
    if (!Array.isArray(required)) {
      fail('scenes', where, `${label}.requires_flags must be an array`)
    } else {
      for (const flag of required) {
        if (typeof flag !== 'string' || !BOOLEAN_FLAG_SET.has(flag)) {
          fail('scenes', where, `${label} names unknown flag ${JSON.stringify(flag)}`)
        }
      }
    }
  }

  // Section 4.1 and 4.5. A threshold higher than the number of objects the flat
  // actually contains by this act is an act that cannot be finished, and nothing
  // else in the pipeline would notice: the game would simply never move on, and
  // it would look like the player had missed something.
  const needed = gate['sorted_count_min']
  if (needed !== undefined) {
    if (typeof needed !== 'number' || !Number.isInteger(needed) || needed < 0) {
      fail('scenes', where, `${label}.sorted_count_min must be a whole number`)
    } else {
      const available = objects.filter(
        (object) =>
          object['sortable'] === true &&
          typeof object['act_min'] === 'number' &&
          object['act_min'] <= act,
      ).length

      if (needed > available) {
        fail(
          'scenes',
          where,
          `${label} wants ${needed} objects sorted, but only ${available} can be sorted by act ${act}`,
        )
      }
    }
  }

  const charge = gate['charge_seconds']
  if (charge !== undefined && (typeof charge !== 'number' || !(charge > 0))) {
    fail('scenes', where, `${label}.charge_seconds must be a positive number of seconds`)
  }
}

const acts = sceneData['acts']
if (!Array.isArray(acts)) {
  fail('scenes', 'data/scenes.json', 'acts must be an array')
} else {
  const seenActs = new Set<number>()

  for (const act of acts) {
    if (!isRecord(act)) {
      fail('scenes', 'data/scenes.json', 'act must be an object')
      continue
    }

    const number = act['act']
    const where = `act ${String(number)}`

    if (typeof number !== 'number' || number < 1 || number > 3) {
      fail('scenes', where, 'act must be 1, 2 or 3')
      continue
    }
    if (seenActs.has(number)) fail('scenes', where, 'duplicate act')
    seenActs.add(number)

    for (const field of ['id', 'title', 'layer', 'lighting']) {
      if (!nonEmptyString(act[field])) fail('scenes', where, `"${field}" is missing or empty`)
    }

    const gate = act['gate_to_next']
    if (gate !== undefined) checkActGate(where, 'gate_to_next', number, gate)

    const ends = act['ends_when']
    if (ends !== undefined) checkActGate(where, 'ends_when', number, ends)
  }

  for (const n of [1, 2, 3]) {
    if (!seenActs.has(n)) fail('scenes', `act ${n}`, 'missing')
  }

  // Act 3 ends the game, so nothing may gate past it.
  const third = acts.find((a) => isRecord(a) && a['act'] === 3)
  if (isRecord(third) && third['gate_to_next'] !== undefined) {
    fail('scenes', 'act 3', 'has a gate_to_next, but there is no act 4')
  }

  // Section 8.4. And it has to end somewhere, on the act that ends it. A missing
  // ending condition is a game that is complete and unfinishable at the same
  // time: everything is reachable, nothing is over, and the player is left
  // standing in a flat waiting for something that is never coming.
  if (isRecord(third) && third['ends_when'] === undefined) {
    fail('scenes', 'act 3', 'has no ends_when, so nothing ends the game')
  }

  for (const act of acts) {
    if (!isRecord(act) || act['act'] === 3) continue
    if (act['ends_when'] !== undefined) {
      fail(
        'scenes',
        `act ${String(act['act'])}`,
        'has an ends_when, but the game ends on act 3 and nowhere else',
      )
    }
  }

  // A charge is a wait the player triggers and then sits through, and only act 2
  // has one. An ending that waited on a clock would be the game deciding when
  // the player is finished, which is the opposite of what section 8.4 is.
  if (isRecord(third) && isRecord(third['ends_when']) && third['ends_when']['charge_seconds'] !== undefined) {
    fail('scenes', 'act 3', 'ends_when carries charge_seconds, so the game would end on a timer')
  }
}

const scenes = sceneData['scenes']
if (!Array.isArray(scenes)) {
  fail('scenes', 'data/scenes.json', 'scenes must be an array')
} else {
  const seenScenes = new Set<string>()

  for (const scene of scenes) {
    if (!isRecord(scene)) {
      fail('scenes', 'data/scenes.json', 'scene must be an object')
      continue
    }

    const rawId = scene['id']
    const id = typeof rawId === 'string' ? rawId : '(no id)'
    const where = `scene ${id}`

    if (typeof rawId !== 'string' || !ID_PATTERN.test(rawId)) fail('scenes', where, 'id must be snake_case')
    if (seenScenes.has(id)) fail('scenes', where, 'duplicate id')
    seenScenes.add(id)

    for (const field of ['section', 'title', 'summary']) {
      if (!nonEmptyString(scene[field])) fail('scenes', where, `"${field}" is missing or empty`)
    }

    const act = scene['act']
    if (typeof act !== 'number' || act < 1 || act > 3) fail('scenes', where, 'act must be 1, 2 or 3')

    if (scene['blocks'] !== undefined) checkBlocks('scenes', where, scene['blocks'])

    const steps = scene['steps']
    if (steps !== undefined) {
      if (!Array.isArray(steps) || steps.length === 0) {
        fail('scenes', where, 'steps must be a non-empty array')
      } else {
        steps.forEach((step, index) => {
          if (!nonEmptyString(step)) fail('scenes', `${where} step ${index}`, 'step is empty')
        })
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Hard Rule 3, in the one scene that is made of it
// ---------------------------------------------------------------------------

/**
 * Section 8.3. The desk scene ends on a sentence about there being no note, and
 * the beat is that nothing follows it.
 *
 * The lexicons above already refuse the words. This refuses the shape, which is
 * the part that would slip through: a reveal appended after the payoff needs no
 * forbidden vocabulary at all, and a sixth block would read to a validator as
 * ordinary content and to a player as the game taking the line back.
 *
 * If you are here because this check is failing, it is not a check to relax.
 */
{
  const where = 'scene desk_scene'
  const PAYOFF = "Most people don't leave one. You knew that. You looked anyway."

  const scene = Array.isArray(scenes)
    ? scenes.find((entry) => isRecord(entry) && entry['id'] === 'desk_scene')
    : undefined

  if (!isRecord(scene)) {
    fail('scenes', where, 'missing, and it is the scene section 8.3 is entirely about')
  } else {
    const blocks = scene['blocks']

    if (!Array.isArray(blocks)) {
      fail('scenes', where, 'has no blocks')
    } else {
      const lines = blocks.filter((block) => isRecord(block) && block['kind'] === 'line')
      const payoff = lines.at(-1)

      if (!isRecord(payoff) || payoff['text'] !== PAYOFF) {
        fail('scenes', where, `the last line must be exactly ${JSON.stringify(PAYOFF)}`)
      } else {
        const after = blocks.slice(blocks.indexOf(payoff) + 1)

        for (const block of after) {
          if (!isRecord(block) || block['kind'] !== 'stage') {
            fail('scenes', where, 'nothing but a stage direction may follow the last line')
          }
        }

        if (after.length > 1) {
          fail('scenes', where, `${after.length} blocks follow the last line, and the scene allows one`)
        }
      }
    }
  }
}

// Section 4.5. The objective line, revealed by a flag rather than by an act.
const goals = sceneData['goals']
if (!Array.isArray(goals) || goals.length === 0) {
  fail('scenes', 'data/scenes.json', 'goals must be a non-empty array')
} else {
  const seenGoals = new Set<string>()

  for (const goal of goals) {
    if (!isRecord(goal)) {
      fail('scenes', 'data/scenes.json', 'goal must be an object')
      continue
    }

    const rawId = goal['id']
    const id = typeof rawId === 'string' ? rawId : '(no id)'
    const where = `goal ${id}`

    if (typeof rawId !== 'string' || !ID_PATTERN.test(rawId)) fail('scenes', where, 'id must be snake_case')
    if (seenGoals.has(id)) fail('scenes', where, 'duplicate id')
    seenGoals.add(id)

    if (!nonEmptyString(goal['text'])) fail('scenes', where, 'text is missing or empty')

    const when = goal['when']
    if (typeof when !== 'string') {
      fail('scenes', where, '"when" must be a string')
      continue
    }

    const reference = parseFlagReference(when)
    if (reference === null) {
      fail('scenes', where, `"when" names no known flag: ${JSON.stringify(when)}`)
    } else if (reference.kind === 'derived' && !objectIds.has(reference.object)) {
      fail('scenes', where, `"when" refers to object ${reference.object}, which does not exist`)
    }
  }
}

// Every flag the content leans on has to be set by something.
//
// A second look gated on a flag nothing writes never resolves, and a gate on one
// never opens. Both fail silently and both look, from inside the game, exactly
// like a player who has missed something. This runs the real effects table over
// the real objects rather than trusting a list.
{
  const written = new Set<string>()

  /**
   * The states the effects table is run against.
   *
   * Some effects are guarded on their own flag not being set yet, and others on
   * a different flag already being set. The desk needs both at once: it fires
   * only once the thread has been read and only while the desk has not been gone
   * through. All-off and all-on each miss it, so every flag also gets a run in
   * which it is the only one turned off.
   */
  const candidates: GameState[] = []

  {
    const off = createInitialState()
    off.act = 3
    candidates.push(off)

    for (const missing of [null, ...BOOLEAN_FLAGS]) {
      const state = createInitialState()
      state.act = 3
      for (const flag of BOOLEAN_FLAGS) state[flag] = flag !== missing
      candidates.push(state)
    }
  }

  for (const object of objects) {
    for (const showedSecondLook of [false, true]) {
      for (const state of candidates) {
        for (const effect of examineEffects(object as unknown as GameObject, state, showedSecondLook)) {
          if (effect.kind === 'flag') written.add(effect.flag)
        }
      }
    }
  }

  // Set by the session rather than by looking at something, so they are named
  // here with the reason. Anything else must come from the effects table.
  const ELSEWHERE: Record<string, string> = {
    phone_on: 'the chime, in src/game/charge.ts',
    record_playing: 'the toggle_demo effect, applied in src/game/session.ts',
    lights_on: 'the toggle_lights effect, applied in src/game/session.ts',
  }

  const needed = new Set<string>()

  for (const object of objects) {
    const secondLook = object['second_look']
    if (isRecord(secondLook) && typeof secondLook['requires_flag'] === 'string') {
      const ref = parseFlagReference(secondLook['requires_flag'])
      if (ref?.kind === 'state') needed.add(ref.flag)
    }

    const hiddenUntil = object['hidden_until']
    if (typeof hiddenUntil === 'string') {
      const ref = parseFlagReference(hiddenUntil)
      if (ref?.kind === 'state') needed.add(ref.flag)
    }
  }

  for (const act of Array.isArray(acts) ? acts : []) {
    if (!isRecord(act)) continue

    // Both ends of an act. An ending condition naming a flag nothing writes is
    // the worst version of this failure: the game is finished, and it never ends.
    for (const field of ['gate_to_next', 'ends_when']) {
      const gate = act[field]
      if (!isRecord(gate) || !Array.isArray(gate['requires_flags'])) continue
      for (const flag of gate['requires_flags']) {
        if (typeof flag === 'string') needed.add(flag)
      }
    }
  }

  for (const flag of needed) {
    if (written.has(flag) || flag in ELSEWHERE) continue
    fail('objects', `flag ${flag}`, 'the content depends on it and nothing in the flat sets it')
  }
}

// ---------------------------------------------------------------------------
// Resources, and Hard Rule 9
// ---------------------------------------------------------------------------

const advisory = resources['advisory']
if (!isRecord(advisory)) {
  fail('resources', 'data/resources.json', 'advisory is missing')
} else {
  if (!nonEmptyString(advisory['title'])) fail('resources', 'advisory', 'title is missing or empty')
  if (!nonEmptyString(advisory['lead_in'])) fail('resources', 'advisory', 'lead_in is missing or empty')

  const lines = advisory['lines']
  if (!Array.isArray(lines) || lines.length === 0) {
    fail('resources', 'advisory', 'Hard Rule 9: the advisory must carry at least one line')
  } else {
    lines.forEach((line, index) => {
      if (!nonEmptyString(line)) fail('resources', `advisory line ${index}`, 'line is empty')
    })
  }
}

const regions = resources['regions']
const defaultRegion = resources['default_region']

if (!isRecord(regions) || Object.keys(regions).length === 0) {
  fail('resources', 'data/resources.json', 'Hard Rule 9: at least one region must be configured')
} else {
  if (typeof defaultRegion !== 'string' || regions[defaultRegion] === undefined) {
    fail('resources', 'data/resources.json', `default_region ${JSON.stringify(defaultRegion)} is not a configured region`)
  }

  for (const [key, region] of Object.entries(regions)) {
    if (!isRecord(region)) {
      fail('resources', `region ${key}`, 'region must be an object')
      continue
    }

    if (!nonEmptyString(region['label'])) fail('resources', `region ${key}`, 'label is missing or empty')

    const entries = region['entries']
    if (!Array.isArray(entries) || entries.length === 0) {
      fail('resources', `region ${key}`, 'must carry at least one entry')
      continue
    }

    entries.forEach((entry, index) => {
      const at = `region ${key} entry ${index}`
      if (!isRecord(entry)) {
        fail('resources', at, 'entry must be an object')
        return
      }

      for (const field of ['id', 'name', 'detail', 'url']) {
        if (!nonEmptyString(entry[field])) fail('resources', at, `"${field}" is missing or empty`)
      }

      // A number nobody checked is worse than no number at all.
      if (!nonEmptyString(entry['source'])) {
        fail('resources', at, 'every entry must record where it was verified, in "source"')
      }
    })
  }
}

// ---------------------------------------------------------------------------
// Floor plan geometry
// ---------------------------------------------------------------------------

/**
 * The plan is a set of axis-aligned rectangles, which makes every one of these
 * checks arithmetic rather than guesswork. A doorway placed on a wall two rooms
 * do not actually share produces a hole into nothing, and it is invisible until
 * you walk into it.
 */
interface Rect {
  id: string
  minX: number
  minZ: number
  maxX: number
  maxZ: number
}

const FLOOR_MATERIAL_SET: ReadonlySet<string> = new Set(FLOOR_MATERIALS)
const WALL_SIDE_SET: ReadonlySet<string> = new Set(WALL_SIDES)
const OPENING_KIND_SET: ReadonlySet<string> = new Set(OPENING_KINDS)

const EPSILON = 1e-6

const wallHeight = typeof floorPlan['wall_height'] === 'number' ? floorPlan['wall_height'] : 0
if (wallHeight <= 0) fail('floor plan', 'data/floorplan.json', 'wall_height must be positive')

const eyeHeight = typeof floorPlan['eye_height'] === 'number' ? floorPlan['eye_height'] : 0
if (eyeHeight <= 0 || eyeHeight >= wallHeight) {
  fail('floor plan', 'data/floorplan.json', 'eye_height must be above the floor and below the ceiling')
}

const rects = new Map<string, Rect>()
const planRooms = floorPlan['rooms']

if (!Array.isArray(planRooms)) {
  fail('floor plan', 'data/floorplan.json', 'rooms must be an array')
} else {
  for (const room of planRooms) {
    if (!isRecord(room)) {
      fail('floor plan', 'data/floorplan.json', 'room must be an object')
      continue
    }

    const id = room['id']
    const where = `plan room ${String(id)}`

    if (typeof id !== 'string' || !ROOM_ID_SET.has(id)) {
      fail('floor plan', where, 'unknown room id')
      continue
    }
    if (rects.has(id)) fail('floor plan', where, 'duplicate room')

    const min = room['min']
    const max = room['max']
    if (!Array.isArray(min) || min.length !== 2 || !Array.isArray(max) || max.length !== 2) {
      fail('floor plan', where, 'min and max must each be [x, z]')
      continue
    }

    const rect: Rect = {
      id,
      minX: Number(min[0]),
      minZ: Number(min[1]),
      maxX: Number(max[0]),
      maxZ: Number(max[1]),
    }

    if (rect.maxX <= rect.minX || rect.maxZ <= rect.minZ) {
      fail('floor plan', where, 'max must be greater than min on both axes')
      continue
    }

    if (typeof room['floor'] !== 'string' || !FLOOR_MATERIAL_SET.has(room['floor'])) {
      fail('floor plan', where, `unknown floor material ${JSON.stringify(room['floor'])}`)
    }
    if (typeof room['ceiling'] !== 'boolean') fail('floor plan', where, 'ceiling must be a boolean')

    const parapet = room['parapet']
    if (parapet !== undefined) {
      if (!isRecord(parapet)) {
        fail('floor plan', where, 'parapet must be an object')
      } else {
        const height = parapet['height']
        // Hard Rule 10: chest height and solid. A low parapet turns the balcony
        // into a place you look down from, which is exactly what it must not be.
        if (typeof height !== 'number' || height < 1.0) {
          fail('floor plan', where, 'Hard Rule 10: a balcony parapet must be at least 1.0m and solid')
        }
        if (!Array.isArray(parapet['sides']) || parapet['sides'].length === 0) {
          fail('floor plan', where, 'parapet must name the sides it runs along')
        }
      }
    }

    rects.set(id, rect)
  }

  for (const id of ROOM_IDS) {
    if (!rects.has(id)) fail('floor plan', `plan room ${id}`, 'named in rooms.json but has no rectangle')
  }

  const all = [...rects.values()]
  for (let i = 0; i < all.length; i += 1) {
    for (let j = i + 1; j < all.length; j += 1) {
      const a = all[i]
      const b = all[j]
      if (a === undefined || b === undefined) continue
      const overlapX = Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX)
      const overlapZ = Math.min(a.maxZ, b.maxZ) - Math.max(a.minZ, b.minZ)
      if (overlapX > EPSILON && overlapZ > EPSILON) {
        fail('floor plan', `${a.id} and ${b.id}`, 'rectangles overlap')
      }
    }
  }
}

const adjacency = new Map<string, string[]>()
for (const id of rects.keys()) adjacency.set(id, [])

const planOpenings = floorPlan['openings']
if (!Array.isArray(planOpenings)) {
  fail('floor plan', 'data/floorplan.json', 'openings must be an array')
} else {
  for (const opening of planOpenings) {
    if (!isRecord(opening)) {
      fail('floor plan', 'data/floorplan.json', 'opening must be an object')
      continue
    }

    const between = opening['between']
    if (!Array.isArray(between) || between.length !== 2) {
      fail('floor plan', 'data/floorplan.json', 'opening.between must name two rooms')
      continue
    }

    const [aId, bId] = [String(between[0]), String(between[1])]
    const where = `opening ${aId} to ${bId}`

    if (typeof opening['kind'] !== 'string' || !OPENING_KIND_SET.has(opening['kind'])) {
      fail('floor plan', where, `unknown opening kind ${JSON.stringify(opening['kind'])}`)
    }

    const axis = opening['wall']
    const at = Number(opening['at'])
    const centre = Number(opening['centre'])
    const width = Number(opening['width'])
    const height = Number(opening['height'])

    if (axis !== 'x' && axis !== 'z') {
      fail('floor plan', where, 'wall must be "x" or "z"')
      continue
    }
    if (!(width > 0) || !(height > 0)) {
      fail('floor plan', where, 'width and height must be positive')
      continue
    }
    if (height > wallHeight + EPSILON) fail('floor plan', where, 'opening is taller than the wall')

    const a = rects.get(aId)
    if (a === undefined) {
      fail('floor plan', where, `${aId} has no rectangle`)
      continue
    }

    const low = centre - width / 2
    const high = centre + width / 2

    const touches = (rect: Rect): boolean =>
      axis === 'z'
        ? Math.abs(rect.minZ - at) < EPSILON || Math.abs(rect.maxZ - at) < EPSILON
        : Math.abs(rect.minX - at) < EPSILON || Math.abs(rect.maxX - at) < EPSILON

    if (bId === 'outside') {
      if (!touches(a)) fail('floor plan', where, 'the front door is not on a wall of its room')
      const span = axis === 'z' ? [a.minX, a.maxX] : [a.minZ, a.maxZ]
      const spanLow = span[0] ?? 0
      const spanHigh = span[1] ?? 0
      if (low < spanLow - EPSILON || high > spanHigh + EPSILON) {
        fail('floor plan', where, 'the front door runs past the end of its wall')
      }
      continue
    }

    const b = rects.get(bId)
    if (b === undefined) {
      fail('floor plan', where, `${bId} has no rectangle`)
      continue
    }

    if (!touches(a) || !touches(b)) {
      fail('floor plan', where, `these rooms do not share the wall ${axis}=${at}`)
      continue
    }

    const sharedLow = axis === 'z' ? Math.max(a.minX, b.minX) : Math.max(a.minZ, b.minZ)
    const sharedHigh = axis === 'z' ? Math.min(a.maxX, b.maxX) : Math.min(a.maxZ, b.maxZ)

    if (low < sharedLow - EPSILON || high > sharedHigh + EPSILON) {
      fail(
        'floor plan',
        where,
        `opening spans ${low.toFixed(2)} to ${high.toFixed(2)}, outside the shared wall ${sharedLow.toFixed(2)} to ${sharedHigh.toFixed(2)}`,
      )
    }

    adjacency.get(aId)?.push(bId)
    adjacency.get(bId)?.push(aId)
  }
}

const planWindows = floorPlan['windows']
if (!Array.isArray(planWindows)) {
  fail('floor plan', 'data/floorplan.json', 'windows must be an array')
} else {
  for (const window of planWindows) {
    if (!isRecord(window)) {
      fail('floor plan', 'data/floorplan.json', 'window must be an object')
      continue
    }

    const roomId = String(window['room'])
    const side = window['wall']
    const where = `window in ${roomId} on the ${String(side)} wall`

    const rect = rects.get(roomId)
    if (rect === undefined) {
      fail('floor plan', where, 'unknown room')
      continue
    }
    if (typeof side !== 'string' || !WALL_SIDE_SET.has(side)) {
      fail('floor plan', where, 'wall must be north, south, east, or west')
      continue
    }

    const centre = Number(window['centre'])
    const width = Number(window['width'])
    const height = Number(window['height'])
    const sill = Number(window['sill'])

    const alongX = side === 'north' || side === 'south'
    const spanLow = alongX ? rect.minX : rect.minZ
    const spanHigh = alongX ? rect.maxX : rect.maxZ

    if (centre - width / 2 < spanLow - EPSILON || centre + width / 2 > spanHigh + EPSILON) {
      fail('floor plan', where, 'the window runs past the end of its wall')
    }
    if (sill < 0) fail('floor plan', where, 'the sill is below the floor')
    if (sill + height > wallHeight + EPSILON) fail('floor plan', where, 'the window reaches the ceiling')
  }
}

// Every room has to be walkable from where the player starts.
const spawn = floorPlan['spawn']
if (!isRecord(spawn)) {
  fail('floor plan', 'data/floorplan.json', 'spawn is missing')
} else {
  const spawnRoom = String(spawn['room'])
  const rect = rects.get(spawnRoom)
  const position = spawn['position']

  if (rect === undefined) {
    fail('floor plan', 'spawn', `unknown room ${spawnRoom}`)
  } else if (!Array.isArray(position) || position.length !== 2) {
    fail('floor plan', 'spawn', 'position must be [x, z]')
  } else {
    const x = Number(position[0])
    const z = Number(position[1])
    if (x < rect.minX || x > rect.maxX || z < rect.minZ || z > rect.maxZ) {
      fail('floor plan', 'spawn', `position ${x}, ${z} is outside ${spawnRoom}`)
    }

    const reached = new Set([spawnRoom])
    const queue = [spawnRoom]
    while (queue.length > 0) {
      const current = queue.shift()
      if (current === undefined) break
      for (const neighbour of adjacency.get(current) ?? []) {
        if (!reached.has(neighbour)) {
          reached.add(neighbour)
          queue.push(neighbour)
        }
      }
    }

    for (const id of rects.keys()) {
      if (!reached.has(id)) fail('floor plan', `plan room ${id}`, `unreachable on foot from ${spawnRoom}`)
    }
  }
}

// ---------------------------------------------------------------------------
// Furniture
// ---------------------------------------------------------------------------

/**
 * Furniture is checked against the plan rather than against a screenshot. A
 * wardrobe standing in a doorway or a counter half inside a wall is arithmetic,
 * and finding it here costs nothing compared with finding it by walking into it.
 */
const FURNITURE_SHAPE_SET: ReadonlySet<string> = new Set(FURNITURE_SHAPES)
const PALETTE_KEY_SET: ReadonlySet<string> = new Set(PALETTE_KEYS)
const SURFACE_ORIENTATION_SET: ReadonlySet<string> = new Set(SURFACE_ORIENTATIONS)

interface Footprint {
  id: string
  room: string
  minX: number
  minZ: number
  maxX: number
  maxZ: number
}

/** How far in front of an opening must stay clear for the player to get through. */
const DOORWAY_CLEARANCE = 0.4

const furniture = loadJson('data/furniture.json') as Record<string, unknown>[]
const footprints: Footprint[] = []
const surfaceNames = new Map<string, string>()
const seenFurnitureIds = new Set<string>()

for (const piece of furniture) {
  const rawId = piece['id']
  const id = typeof rawId === 'string' ? rawId : '(no id)'
  const where = `furniture ${id}`

  if (typeof rawId !== 'string' || !ID_PATTERN.test(rawId)) fail('furniture', where, 'id must be snake_case')
  if (seenFurnitureIds.has(id)) fail('furniture', where, 'duplicate id')
  seenFurnitureIds.add(id)

  const roomId = piece['room']
  if (typeof roomId !== 'string' || !ROOM_ID_SET.has(roomId)) {
    fail('furniture', where, `unknown room ${JSON.stringify(roomId)}`)
    continue
  }

  if (typeof piece['shape'] !== 'string' || !FURNITURE_SHAPE_SET.has(piece['shape'])) {
    fail('furniture', where, `unknown shape ${JSON.stringify(piece['shape'])}`)
  }

  const material = piece['material']
  if (material !== undefined && (typeof material !== 'string' || !PALETTE_KEY_SET.has(material))) {
    fail('furniture', where, `unknown material ${JSON.stringify(material)}`)
  }

  const objectRef = piece['object']
  if (objectRef !== undefined) {
    if (typeof objectRef !== 'string' || !objectIds.has(objectRef)) {
      fail('furniture', where, `object ${JSON.stringify(objectRef)} does not exist`)
    }
  }

  const position = piece['position']
  const size = piece['size']
  if (!Array.isArray(position) || position.length !== 2 || !Array.isArray(size) || size.length !== 3) {
    fail('furniture', where, 'position must be [x, z] and size must be [width, height, depth]')
    continue
  }

  const x = Number(position[0])
  const z = Number(position[1])
  const width = Number(size[0])
  const tall = Number(size[1])
  const depth = Number(size[2])

  if (!(width > 0) || !(tall > 0) || !(depth > 0)) {
    fail('furniture', where, 'every dimension must be positive')
    continue
  }

  const elevation = piece['elevation'] === undefined ? 0 : Number(piece['elevation'])
  if (elevation + tall > wallHeight + EPSILON) fail('furniture', where, 'reaches through the ceiling')

  // Conservative axis-aligned bounds for the rotated rectangle.
  const angle = piece['rotation'] === undefined ? 0 : Number(piece['rotation'])
  const cos = Math.abs(Math.cos(angle))
  const sin = Math.abs(Math.sin(angle))
  const extentX = (width / 2) * cos + (depth / 2) * sin
  const extentZ = (width / 2) * sin + (depth / 2) * cos

  const footprint: Footprint = {
    id,
    room: roomId,
    minX: x - extentX,
    minZ: z - extentZ,
    maxX: x + extentX,
    maxZ: z + extentZ,
  }

  const rect = rects.get(roomId)
  if (rect !== undefined) {
    const slack = 0.02
    if (
      footprint.minX < rect.minX - slack ||
      footprint.maxX > rect.maxX + slack ||
      footprint.minZ < rect.minZ - slack ||
      footprint.maxZ > rect.maxZ + slack
    ) {
      fail('furniture', where, `sticks out of ${roomId}`)
    }
  }

  // A millimetre, not an epsilon. Pieces are placed by hand and meant to touch,
  // and a rotation written as 1.5708 rather than exactly a quarter turn leaves
  // micron-scale overlaps that are not worth anybody's attention.
  const TOUCHING = 0.001

  for (const other of footprints) {
    if (other.room !== roomId) continue
    const overlapX = Math.min(footprint.maxX, other.maxX) - Math.max(footprint.minX, other.minX)
    const overlapZ = Math.min(footprint.maxZ, other.maxZ) - Math.max(footprint.minZ, other.minZ)
    if (overlapX > TOUCHING && overlapZ > TOUCHING) {
      fail('furniture', where, `overlaps ${other.id} by ${(Math.min(overlapX, overlapZ) * 100).toFixed(1)}cm`)
    }
  }

  // Nothing may stand in a doorway, or close enough in front of one to block it.
  if (Array.isArray(planOpenings)) {
    for (const opening of planOpenings) {
      if (!isRecord(opening)) continue
      const between = opening['between']
      if (!Array.isArray(between) || !between.includes(roomId)) continue

      const axis = opening['wall']
      const at = Number(opening['at'])
      const centre = Number(opening['centre'])
      const half = Number(opening['width']) / 2

      const zoneMinX = axis === 'z' ? centre - half : at - DOORWAY_CLEARANCE
      const zoneMaxX = axis === 'z' ? centre + half : at + DOORWAY_CLEARANCE
      const zoneMinZ = axis === 'z' ? at - DOORWAY_CLEARANCE : centre - half
      const zoneMaxZ = axis === 'z' ? at + DOORWAY_CLEARANCE : centre + half

      const overlapX = Math.min(footprint.maxX, zoneMaxX) - Math.max(footprint.minX, zoneMinX)
      const overlapZ = Math.min(footprint.maxZ, zoneMaxZ) - Math.max(footprint.minZ, zoneMinZ)

      if (overlapX > EPSILON && overlapZ > EPSILON) {
        fail('furniture', where, `blocks the ${String(between[0])} to ${String(between[1])} doorway`)
      }
    }
  }

  footprints.push(footprint)

  const surfaces = piece['surfaces']
  if (surfaces !== undefined) {
    if (!Array.isArray(surfaces)) {
      fail('furniture', where, 'surfaces must be an array')
    } else {
      for (const surface of surfaces) {
        if (!isRecord(surface)) {
          fail('furniture', where, 'surface must be an object')
          continue
        }

        const name = surface['name']
        if (typeof name !== 'string' || !ID_PATTERN.test(name)) {
          fail('furniture', where, `surface name ${JSON.stringify(name)} must be snake_case`)
          continue
        }

        const owner = surfaceNames.get(name)
        if (owner !== undefined) {
          fail('furniture', where, `surface "${name}" is already provided by ${owner}`)
        }
        surfaceNames.set(name, id)

        const surfaceHeight = Number(surface['height'])
        if (!(surfaceHeight >= 0)) fail('furniture', where, `surface "${name}" needs a height`)

        const orientation = surface['orientation']

        // `height` is measured from the piece's own base, and furniture.ts adds
        // the elevation on top. Authoring it as a height above the floor instead
        // puts the surface at roughly twice its intended height, which is how the
        // spare towel ended up at 2.54m with nothing in the game complaining.
        //
        // A horizontal surface has to be low enough to see the top of from
        // standing, or the objects on it exist and are unreachable.
        if (orientation !== 'vertical') {
          const top = elevation + surfaceHeight
          const highest = eyeHeight - 0.15
          if (top > highest + EPSILON) {
            fail(
              'furniture',
              where,
              `surface "${name}" sits at ${top.toFixed(2)}m, above the ${highest.toFixed(2)}m a standing player can see the top of. Surface height is measured from the base of the piece, not from the floor.`,
            )
          }
        }

        if (orientation !== undefined && (typeof orientation !== 'string' || !SURFACE_ORIENTATION_SET.has(orientation))) {
          fail('furniture', where, `surface "${name}" has an unknown orientation`)
        }
        if (orientation === 'vertical') {
          const facing = surface['facing']
          if (typeof facing !== 'string' || !WALL_SIDE_SET.has(facing)) {
            fail('furniture', where, `vertical surface "${name}" must say which way it faces`)
          }
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Placement
// ---------------------------------------------------------------------------

/**
 * Every object has to end up somewhere, exactly once, on a surface that exists,
 * within that surface's edges. An object placed 40cm off the side of a bedside
 * table hangs in the air, and nothing else in the pipeline would notice.
 *
 * The surface extents here mirror the ones furniture.ts builds. That is a real
 * duplication, and it is worth it: without it an off-the-edge placement is only
 * findable by walking up to it.
 */
const PROP_SHAPE_SET: ReadonlySet<string> = new Set(PROP_SHAPES)
const PROP_POSE_SET: ReadonlySet<string> = new Set(PROP_POSES)

interface SurfaceExtent {
  orientation: string
  /** Half-extents, [along, across]. */
  halfAlong: number
  halfAcross: number
}

const surfaceExtents = new Map<string, SurfaceExtent>()

for (const piece of furniture) {
  const size = piece['size']
  if (!Array.isArray(size)) continue
  const width = Number(size[0])
  const depth = Number(size[2])

  for (const surface of Array.isArray(piece['surfaces']) ? piece['surfaces'] : []) {
    if (!isRecord(surface)) continue
    const name = surface['name']
    if (typeof name !== 'string') continue
    const inset = Number(surface['inset'])
    const orientation = surface['orientation'] === 'vertical' ? 'vertical' : 'horizontal'

    // A horizontal surface runs the width and depth of its piece. A vertical one
    // runs the width and a fixed reach up and down the face. Both match what
    // furniture.ts registers.
    const across = orientation === 'vertical' ? 0.6 : Math.max(depth - inset * 2, 0.05)

    surfaceExtents.set(name, {
      orientation,
      halfAlong: Math.max(width - inset * 2, 0.05) / 2,
      halfAcross: across / 2,
    })
  }
}

// The surfaces every room gets without anyone writing them down.
for (const [id, rect] of rects) {
  const width = rect.maxX - rect.minX
  const depth = rect.maxZ - rect.minZ

  surfaceExtents.set(`${id}_floor`, {
    orientation: 'horizontal',
    halfAlong: Math.max(width - 0.6, 0.2) / 2,
    halfAcross: Math.max(depth - 0.6, 0.2) / 2,
  })

  for (const side of WALL_SIDES) {
    const along = side === 'north' || side === 'south' ? width : depth
    surfaceExtents.set(`${id}_wall_${side}`, {
      orientation: 'vertical',
      halfAlong: Math.max(along - 0.4, 0.2) / 2,
      halfAcross: Math.max(wallHeight - 0.4, 0.2) / 2,
    })
  }
}

if (Array.isArray(planWindows)) {
  for (const w of planWindows) {
    if (!isRecord(w)) continue
    surfaceExtents.set(`${String(w['room'])}_${String(w['wall'])}_sill`, {
      orientation: 'horizontal',
      halfAlong: Math.max(Number(w['width']) - 0.1, 0.1) / 2,
      halfAcross: 0.06,
    })
  }
}

const placements = loadJson('data/placement.json') as Record<string, unknown>[]
const placed = new Map<string, string>()

for (const placement of placements) {
  const rawId = placement['id']
  const id = typeof rawId === 'string' ? rawId : '(no id)'
  const where = `placement ${id}`

  if (typeof rawId !== 'string' || !objectIds.has(rawId)) {
    fail('placement', where, `${JSON.stringify(rawId)} is not an object id`)
    continue
  }

  const existing = placed.get(id)
  if (existing !== undefined) {
    fail('placement', where, 'placed more than once')
  }
  placed.set(id, 'placement.json')

  const shape = placement['shape']
  if (typeof shape !== 'string' || !PROP_SHAPE_SET.has(shape)) {
    fail('placement', where, `unknown shape ${JSON.stringify(shape)}`)
  }

  const pose = placement['pose']
  if (pose !== undefined && (typeof pose !== 'string' || !PROP_POSE_SET.has(pose))) {
    fail('placement', where, `unknown pose ${JSON.stringify(pose)}`)
  }

  const tint = placement['tint']
  if (tint !== undefined && (typeof tint !== 'string' || !PALETTE_KEY_SET.has(tint))) {
    fail('placement', where, `unknown tint ${JSON.stringify(tint)}`)
  }

  const scale = placement['scale']
  if (scale !== undefined && (typeof scale !== 'number' || scale <= 0)) {
    fail('placement', where, 'scale must be a positive number')
  }

  const surfaceName = placement['surface']
  if (typeof surfaceName !== 'string') {
    fail('placement', where, 'surface must be a string')
    continue
  }

  const extent = surfaceExtents.get(surfaceName)
  if (extent === undefined) {
    fail('placement', where, `surface "${surfaceName}" does not exist`)
    continue
  }

  const offset = placement['offset']
  if (offset === undefined) continue

  if (!Array.isArray(offset) || offset.length !== 3) {
    fail('placement', where, 'offset must be [x, y, z]')
    continue
  }

  const alongOffset = Math.abs(Number(offset[0]))
  const acrossOffset = Math.abs(Number(extent.orientation === 'vertical' ? offset[1] : offset[2]))

  if (alongOffset > extent.halfAlong) {
    fail(
      'placement',
      where,
      `sits ${(alongOffset - extent.halfAlong).toFixed(2)}m off the end of "${surfaceName}"`,
    )
  }
  if (acrossOffset > extent.halfAcross) {
    fail(
      'placement',
      where,
      `sits ${(acrossOffset - extent.halfAcross).toFixed(2)}m off the side of "${surfaceName}"`,
    )
  }
}

// Furniture that is itself an object counts as placed.
for (const piece of furniture) {
  const objectRef = piece['object']
  if (typeof objectRef !== 'string') continue
  if (placed.has(objectRef)) {
    fail('placement', `object ${objectRef}`, 'is both a furniture piece and a placement')
  }
  placed.set(objectRef, 'furniture.json')
}

for (const id of objectIds) {
  if (!placed.has(id)) fail('placement', `object ${id}`, 'is never placed in the flat')
}

// ---------------------------------------------------------------------------
// Section 0, the hard rules
// ---------------------------------------------------------------------------

/**
 * Only strings the player can actually encounter are scanned below.
 *
 * `design_note` fields, scene summaries and steps, room descriptions, and act
 * definitions are production notes. They have to be able to name the rules in
 * order to explain them, so scanning them would make every lexicon unusable.
 * Nothing in a production note reaches the player.
 *
 * False positives here are the point, not a bug. Hard Rule 1 says no object in
 * the flat relates to means in any way, so a kitchen knife or a wardrobe belt
 * flagging is the check working. Rewrite the string. Do not add a suppression.
 */
interface Strand {
  where: string
  text: string
  room?: string
}

const playerFacing: Strand[] = []

function collect(where: string, value: unknown, room?: string): void {
  if (typeof value === 'string' && value.trim().length > 0) {
    playerFacing.push(room === undefined ? { where, text: value } : { where, text: value, room })
  }
}

// The field is part of the label because a block can carry several of them. A
// notebook entry with a `time` and a `text` is two strings, and calling both of
// them "block 0" makes a failure message name a place that holds two strings and
// point at neither. It also makes the label unusable as a key, which
// scripts/content-review.ts needs it to be.
function collectBlocks(where: string, blocks: unknown, room?: string): void {
  if (!Array.isArray(blocks)) return
  blocks.forEach((block, index) => {
    if (!isRecord(block)) return
    for (const field of ['text', 'time', 'where', 'label', 'sender']) {
      collect(`${where} block ${index} ${field}`, block[field], room)
    }
  })
}

const roomOf = new Map<string, string>()
for (const object of objects) {
  const id = String(object['id'])
  const room = object['room']
  if (typeof room === 'string') roomOf.set(id, room)
}

for (const object of objects) {
  const id = String(object['id'])
  const room = roomOf.get(id)
  collect(`object ${id} name`, object['name'], room)
  collect(`object ${id} examine`, object['examine'], room)

  const secondLook = object['second_look']
  if (isRecord(secondLook)) collect(`object ${id} second_look`, secondLook['text'], room)
}

for (const fragment of fragments) {
  const id = String(fragment['id'])
  // A fragment inherits the room of the object that triggers it, so balcony
  // fragments are held to Hard Rule 10 like balcony objects are.
  const room = roomOf.get(String(fragment['trigger']))
  collect(`fragment ${id} beat`, fragment['beat'], room)

  const lines = fragment['lines']
  if (Array.isArray(lines)) {
    lines.forEach((line, index) => collect(`fragment ${id} line ${index}`, line, room))
  }
}

for (const text of texts) {
  const id = String(text['id'])
  const room = roomOf.get(String(text['object']))
  collect(`text ${id} title`, text['title'], room)
  collectBlocks(`text ${id}`, text['blocks'], room)
}

if (Array.isArray(scenes)) {
  for (const scene of scenes) {
    if (!isRecord(scene)) continue
    const id = String(scene['id'])
    collect(`scene ${id} title_card`, scene['title_card'])
    collectBlocks(`scene ${id}`, scene['blocks'])
  }
}

// The goal line. Found by the v0.6 read: this text goes straight to the screen
// in `src/ui/goal.ts` and into the live region a screen reader speaks, and until
// now it was the one source of player-facing prose no lexicon had ever seen. The
// six strings there today are clean. The seventh was the risk.
if (Array.isArray(goals)) {
  for (const goal of goals) {
    if (!isRecord(goal)) continue
    collect(`goal ${String(goal['id'])} text`, goal['text'])
  }
}

if (isRecord(advisory)) {
  collect('advisory lead_in', advisory['lead_in'])
  const lines = advisory['lines']
  if (Array.isArray(lines)) {
    lines.forEach((line, index) => collect(`advisory line ${index}`, line))
  }
}

if (isRecord(regions)) {
  for (const [key, region] of Object.entries(regions)) {
    if (!isRecord(region)) continue
    const entries = region['entries']
    if (!Array.isArray(entries)) continue
    entries.forEach((entry, index) => {
      if (!isRecord(entry)) return
      collect(`region ${key} entry ${index} name`, entry['name'])
      collect(`region ${key} entry ${index} detail`, entry['detail'])
    })
  }
}

/**
 * Hard Rule 1 says no object in the flat relates to means in any way, and that
 * is a statement about what is in the room, not only about what is written about
 * it. Furniture and placement carry no prose, but they do decide what exists: a
 * piece called `knife_block` or a prop shaped `rope` puts the thing in the flat
 * whether or not any string ever mentions it.
 *
 * So the ids and shapes get scanned too, against the same lexicons.
 */
const geometryNames: Strand[] = []

for (const piece of furniture) {
  const id = String(piece['id'])
  const room = typeof piece['room'] === 'string' ? piece['room'] : undefined
  geometryNames.push({ where: `furniture ${id} id`, text: id.replace(/_/g, ' '), ...(room === undefined ? {} : { room }) })
  if (typeof piece['shape'] === 'string') {
    geometryNames.push({ where: `furniture ${id} shape`, text: piece['shape'], ...(room === undefined ? {} : { room }) })
  }
}

for (const placement of placements) {
  const id = String(placement['id'])
  const room = roomOf.get(id)
  if (typeof placement['shape'] === 'string') {
    geometryNames.push({ where: `placement ${id} shape`, text: placement['shape'], ...(room === undefined ? {} : { room }) })
  }
}

interface Lexicon {
  rule: string
  terms: readonly string[]
  /** When present, only strands this returns true for are scanned. */
  only?: (strand: Strand) => boolean
}

const onBalcony = (strand: Strand): boolean => strand.room === 'balcony'

const LEXICONS: readonly Lexicon[] = [
  {
    rule: 'Hard Rule 1 and 2: the method is never named, shown, implied, or hinted at',
    terms: [
      'noose', 'rope', 'ligature', 'hang', 'hanged', 'hanging',
      'blade', 'razor', 'knife', 'knives', 'wrist', 'wrists',
      'overdose', 'poison', 'poisoned',
      'carbon monoxide', 'exhaust fumes', 'gas',
      'firearm', 'gun', 'pistol', 'rifle', 'bullet', 'gunshot', 'shot himself',
      'drown', 'drowned', 'suffocate', 'suffocated', 'asphyxiate',
      'plastic bag', 'belt',
      'took his own life', 'ended his life', 'killed himself', 'how he did it',
      'the body', 'identify the body', 'where it happened', 'found him',
    ],
  },
  {
    rule: 'Hard Rule 3: there is no note, and none may ever be added',
    terms: [
      'suicide note', 'farewell note', 'goodbye note', 'a note for you',
      'last letter', 'final letter', 'note he left', 'left you a note',
      'his last words', 'final words',
    ],
  },
  {
    rule: 'Hard Rule 6: the bathroom contains no medication objects',
    terms: [
      'medication', 'medicine', 'pills', 'pill bottle', 'tablets',
      'prescription', 'antidepressant', 'antidepressants', 'ssri',
      'dosage', 'sedative', 'benzodiazepine', 'sleeping pills',
      'blister pack', 'pharmacy',
    ],
  },
  {
    rule: 'Hard Rule 10: nothing on the balcony may carry dark connotation',
    only: onBalcony,
    terms: [
      'jump', 'jumped', 'jumping', 'leap', 'leapt',
      'ledge', 'edge of', 'over the side', 'over the edge',
      'look down', 'looking down', 'floors down', 'storeys', 'stories down',
      'drop from', 'fell from', 'fall from', 'the drop',
    ],
  },
]

/**
 * Hard Rules 4 and 8, in the forms they can actually be written in.
 *
 * These two are marked human-only in `docs/CONTENT_RULES.md` and they stay that
 * way: no lexicon catches implication, and implication is the whole risk. What a
 * lexicon does catch is the explicit form. A cause gets stated with "because" or
 * "the reason"; a verdict on preventability gets stated with "if I had", "should
 * have", "saw it coming", "my fault". A sentence can break either rule without
 * one of these words, but it cannot contain one of these words and be nobody's
 * business.
 *
 * So unlike the lexicons above, a hit here is not a failure. It is a string that
 * has to have been read by somebody, and `REVIEWED` below is where the reading
 * is recorded. A hit with no entry fails; an entry whose string has since been
 * edited also fails, because the reading was of the old words.
 */
const CAUSE_AND_VERDICT: readonly string[] = [
  // Cause. Hard Rule 4: no single cause is ever given or implied.
  'because', 'the reason', 'reason why', 'that is why', "that's why",
  'caused', 'led to', 'brought on', 'drove him', 'down to',
  // Verdict. Hard Rule 8: the game never answers whether it could have been
  // prevented, in either direction.
  'if he had', 'if I had', 'if you had', 'if only', 'if someone had',
  'would have', 'could have', 'should have', 'what if',
  'too late', 'the signs', 'warning signs', 'saw it coming', 'missed it',
  'my fault', 'his fault', 'your fault', 'blame',
  'gave up', 'give up', 'let him down', 'nothing anyone could',
  // Intent. Section 7 says the documents talk around it, and talking around it
  // is allowed, so these are here to be read rather than to be refused.
  'on purpose', 'meant to',
]

/**
 * Every string in the game that speaks in one of those forms, and why it is
 * allowed to.
 *
 * The text is stored alongside the reason on purpose. Keying on the location
 * alone would let somebody rewrite a line, keep the word, and inherit a reading
 * that was done on different words. When the text moves, the entry stops
 * matching and the check asks for the reading again.
 */
interface Reviewed {
  text: string
  reason: string
}

const REVIEWED: Record<string, Reviewed> = {
  'object underbed_box examine': {
    text: 'A shoebox pushed to the far side, against the wall, where you would have to be looking to find it.',
    reason:
      'A conditional about searching a room, not about a death. It does carry the fact that the '
      + 'player is only looking tonight, which is the resonance section 4.5 is built on, but it '
      + 'states no verdict about that and offers none.',
  },
  'fragment F-03 beat': {
    text: 'The naming ceremony. He watered it with a wine glass because "Zlatan deserves stemware."',
    reason:
      'The same joke as the line below, in the one-line summary the bible gives each fragment. '
      + 'Not shown to the player; the validator scans it anyway, and so does this.',
  },
  'fragment F-03 line 2': {
    text: 'He watered it out of a wine glass that first night, because Zlatan deserves stemware.',
    reason: 'A joke about a monstera. It is also Hard Rule 5 doing its job.',
  },
  'text lena_note block 1 text': {
    text:
      "Whatever you keep of his, keep it because it's him, not because it hurts to put it down. "
      + 'He would hate that.',
    reason:
      'Causal, and about why the player should keep a thing rather than about why he died. '
      + 'Verbatim from the bible, section 7.1.',
  },
  'text vera_letter block 0 text': {
    text:
      'My Niko. I am sending the proper recipe because whatever you are making from memory is '
      + 'wrong, I can feel it from here. Double the lemon. Are you eating? Send a photo of the '
      + 'plant, not the sky this time.',
    reason: 'A grandmother being rude about his cooking. Verbatim from the bible, section 7.6.',
  },
  'text mira_draft block 1 text': {
    text:
      'I keep starting this and it turns into a list of things I should have said in October, so '
      + 'here is the shortest version. None of it was your fault, and most of it was good. The '
      + 'blue mug is yours whenever you want it.',
    reason:
      'The riskiest string in the game, and it is verbatim from the bible, section 7.4. Mira is '
      + 'writing to Niko about the end of a relationship, before his death, and "none of it was '
      + 'your fault" is her refusing to assign blame for the breakup. It is not addressed to the '
      + 'player and it is not about the death. Read the other way it would be a Hard Rule 4 '
      + 'violation, so it is worth saying plainly: the letter declines to give a reason, which is '
      + 'the opposite of giving one.',
  },
  'text job_application block 0 text': {
    text:
      '...seven years across motion and illustration, most recently freelance. I work best on '
      + 'small teams, and I am trying to work smaller and slower on purpose...',
    reason:
      'A cover letter describing how he wanted to work. Hard Rule 5 evidence: he was still '
      + 'applying for things.',
  },
}

function containsTerm(text: string, term: string): boolean {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`\\b${escaped}\\b`, 'i').test(text)
}

for (const lexicon of LEXICONS) {
  for (const strand of [...playerFacing, ...geometryNames]) {
    if (lexicon.only !== undefined && !lexicon.only(strand)) continue
    for (const term of lexicon.terms) {
      if (containsTerm(strand.text, term)) {
        fail('hard rules', strand.where, `${lexicon.rule}. Matched "${term}".`)
      }
    }
  }
}

/**
 * Hard Rule 5, which is the one human-only rule with a shape.
 *
 * "Niko's struggles are always interleaved with plans, humor, and care. Every
 * middle layer discovery sits near evidence of a future he was still building."
 *
 * That second sentence is a claim about adjacency, and the data knows what is
 * next to what. So this names the objects that count as evidence of a future,
 * with the words that earn each one, and then checks that no middle-layer
 * discovery is stranded away from all of them.
 *
 * **The default is suspicion, and that is the whole design.** Anything from act 2
 * down that is not on this list is treated as a struggle and needs a warm
 * neighbour. A list of struggles instead would pass silently the day somebody
 * adds a fifty-second object and forgets to classify it, and silence is exactly
 * what this rule cannot afford.
 *
 * Adding to this list is a content judgement, not a way to quiet the check. The
 * phrase is required so that the judgement can be argued with.
 */
interface Warmth {
  /**
   * Verbatim from one of the object's own strings: its name, its examine text,
   * its second look, or a fragment it triggers. Checked below, because a
   * paraphrase cannot be argued with. A reader who disagrees has to be able to
   * go and read the words the claim rests on.
   */
  quote?: string
  /**
   * Why the object counts when its own words do not say so. Rarer, and it should
   * stay rare: an object whose warmth has to be argued for is an object a player
   * may not receive as warm.
   */
  argument?: string
}

const A_FUTURE_HE_WAS_BUILDING: Record<string, Warmth> = {
  sketchbook_new: { quote: 'Starting again. Or trying to. Both are true.' },
  job_application: { quote: "keep it. they should know who's showing up." },
  demo_cdr: { quote: "we'll fix the mix later." },
  zlatan_plant: { quote: 'He was taking care of things.' },
  concert_tickets: { quote: 'for a show in April. He bought them in February.' },
  cuttings_jar: { quote: 'He was propagating. Plural. Plans, plural.' },
  recipe_card: { quote: 'propped against the tin where he could see it while he cooked.' },
  empty_pots: { quote: 'He was getting back to it. The pots were waiting.' },
  notebook_4am: { quote: 'tired of being tired. gym tomorrow.' },
  bass_case: { quote: 'a mint tin of broken strings labeled in marker. Evidence.' },
  dad_lighter: { quote: 'It still has fuel in it.' },
  photobooth_strip: { quote: 'By the third they are laughing' },
  hoodie_mira: { quote: 'Washed and folded before it went into the box' },
  photo_hike_box: { quote: 'kept the blur one anyway. best one.' },
  team_bib: { quote: 'He kept the bib in his own bag so the job could never be given to anyone else.' },
  game_controller: { quote: 'There was no shortage of good nights.' },
  fridge_towel: { quote: 'Best call of that year.' },
  mug_chipped: { quote: 'There was a ceremony. There was a speech. The speech was deliberately too long.' },

  two_chairs: {
    argument:
      'Section 5 and Hard Rule 10. The balcony is exclusively a place of warm memory, so its '
      + 'objects are warm by construction rather than by any sentence.',
  },
  caps_jar: {
    argument:
      'Section 5 and Hard Rule 10, as above. "An archive of good evenings, kept in glass" says it '
      + 'too, but the rule is the reason.',
  },
  string_lights: {
    argument:
      'The one thing in the flat the player can leave better than they found it. That is a fact '
      + 'about what the game lets you do rather than about what any string says.',
  },
}

/**
 * Hard Rule 5 findings that a person has to settle, not the validator.
 *
 * Reported on every run and never a failure. The alternative was to quietly move
 * the object into the warm list until the check went green, which is how a
 * review of your own work ends up agreeing with itself. An entry here is an open
 * question with the argument attached, and it stays printed until somebody
 * answers it.
 */
const OPEN_TO_A_HUMAN: Record<string, string> = {
  appt_card:
    'The cancelled counselling card is the one middle-layer discovery with nothing forward-looking '
    + 'in its room. The bathroom holds it plus the cologne, the spare towel and the toothbrush, and '
    + 'all three of those are the player\'s grief rather than his life. Hard Rule 6 makes this the '
    + 'mental-health room on purpose and keeps it sparse, so the two rules meet here and the second '
    + 'one is not satisfied. Against that: the card is three years old rather than recent, "He kept '
    + 'it anyway" is not nothing, and the spare towel he kept folded for you is arguably the care '
    + 'the rule asks for. It was not on the warm list before this check was written and it is not '
    + 'being added to it now, because adding it now would be reclassifying to make a failure go '
    + 'away. Recommendation: something of his that points forwards belongs in that room. No '
    + 'existing object can move into it without taking the warmth out of the room it leaves.',
}

{
  const inRoom = new Map<string, string[]>()
  const inRevealGroup = new Map<string, string[]>()

  for (const object of objects) {
    const id = String(object['id'])
    const room = object['room']
    if (typeof room === 'string') {
      const list = inRoom.get(room) ?? []
      list.push(id)
      inRoom.set(room, list)
    }

    const hidden = object['hidden_until']
    if (typeof hidden === 'string') {
      const list = inRevealGroup.get(hidden) ?? []
      list.push(id)
      inRevealGroup.set(hidden, list)
    }
  }

  // Every string an object speaks with: its own name, examine text and second
  // look, plus any fragment it triggers and any keystone text it opens.
  const speaksFor = new Map<string, string>()
  for (const id of objectIds) speaksFor.set(id, id)
  for (const fragment of fragments) {
    const trigger = fragment['trigger']
    if (typeof trigger === 'string') speaksFor.set(String(fragment['id']), trigger)
  }
  for (const text of texts) {
    const object = text['object']
    if (typeof object === 'string') speaksFor.set(String(text['id']), object)
  }

  const wordsOf = new Map<string, string[]>()
  for (const strand of playerFacing) {
    const match = /^(?:object|fragment|text) (\S+) /.exec(strand.where)
    if (match === null) continue
    const owner = speaksFor.get(String(match[1]))
    if (owner === undefined) continue
    const list = wordsOf.get(owner) ?? []
    list.push(strand.text)
    wordsOf.set(owner, list)
  }

  for (const [id, warmth] of Object.entries(A_FUTURE_HE_WAS_BUILDING)) {
    if (!objectIds.has(id)) {
      fail('hard rules', `future ${id}`, 'is named as evidence of a future but is not an object')
      continue
    }

    const { quote, argument } = warmth
    if ((quote === undefined) === (argument === undefined)) {
      fail(
        'hard rules',
        `future ${id}`,
        'needs exactly one of quote or argument. A quote is the object\'s own words and is '
        + 'checked. An argument is why it counts when its own words do not say so.',
      )
      continue
    }

    if (argument !== undefined) {
      if (argument.trim().length === 0) {
        fail('hard rules', `future ${id}`, 'has an empty argument')
      }
      continue
    }

    // A paraphrase cannot be argued with, so the quote has to be findable.
    const said = wordsOf.get(id) ?? []
    if (!said.some((text) => text.includes(quote as string))) {
      fail(
        'hard rules',
        `future ${id}`,
        `is claimed warm on the strength of ${JSON.stringify(quote)}, which it does not say. `
        + 'Quote it verbatim from the object\'s name, examine text, second look or a fragment it '
        + 'triggers, or move the claim to an argument and say plainly that the object\'s own words '
        + 'do not carry it.',
      )
    }
  }

  for (const object of objects) {
    const id = String(object['id'])
    const act = object['act_min']
    const room = object['room']

    // The middle layer and below. Act 1 is the surface the player is meant to
    // fall for him on, and section 5 already builds it out of warmth.
    if (typeof act !== 'number' || act < 2) continue
    if (id in A_FUTURE_HE_WAS_BUILDING) continue

    const hidden = object['hidden_until']
    const neighbours = [
      ...(typeof room === 'string' ? inRoom.get(room) ?? [] : []),
      ...(typeof hidden === 'string' ? inRevealGroup.get(hidden) ?? [] : []),
    ]

    if (neighbours.some((near) => near !== id && near in A_FUTURE_HE_WAS_BUILDING)) continue
    if (id in OPEN_TO_A_HUMAN) continue

    fail(
      'hard rules',
      `object ${id}`,
      'Hard Rule 5. It is a middle-layer discovery with no evidence of a future he was still '
      + `building anywhere near it${typeof room === 'string' ? ` in the ${room}` : ''}. Either it is `
      + 'warmer than it looks, in which case say so in A_FUTURE_HE_WAS_BUILDING with the words '
      + 'that earn it, or something forward-looking belongs in that room.',
    )
  }
}

/**
 * The v0.6 read, kept honest.
 *
 * `scripts/content-review.ts` holds one entry per player-facing string. This
 * makes that a fact rather than an intention: a new string with no entry fails,
 * an entry for a string that no longer exists fails, and an entry whose recorded
 * text has drifted from the data fails.
 *
 * The third one is the point. A verdict is about particular words. Change the
 * words and the verdict is a leftover, and a leftover verdict is worse than no
 * verdict, because it looks like somebody checked.
 */
{
  const unread: string[] = []
  for (const strand of playerFacing) {
    const verdict = READ[strand.where]
    if (verdict === undefined) {
      unread.push(strand.where)
      continue
    }
    if (verdict.text !== strand.text) {
      fail(
        'content review',
        strand.where,
        'the string has changed since it was read, so its verdict in '
        + 'scripts/content-review.ts is about words that are no longer there. Re-read it '
        + 'against all six passes, not only the one that prompted the edit, and update '
        + `the entry.\n      read:  ${JSON.stringify(verdict.text)}\n      now:   ${JSON.stringify(strand.text)}`,
      )
    }
  }

  for (const where of unread) {
    fail(
      'content review',
      where,
      'is player-facing and has no entry in scripts/content-review.ts. Read it against '
      + 'the six passes in docs/CONTENT_REVIEW.md and record the verdict. An entry with '
      + 'no notes means read with nothing to argue, which is an answer, but it has to be '
      + 'given rather than assumed.',
    )
  }

  const collected = new Set(playerFacing.map((strand) => strand.where))
  for (const where of Object.keys(READ)) {
    if (collected.has(where)) continue
    fail(
      'content review',
      where,
      'has a verdict in scripts/content-review.ts but is not a string the validator '
      + 'collects. Either it was deleted, in which case remove the entry, or the label '
      + 'moved, in which case the verdict is now attached to nothing.',
    )
  }
}

// Hard Rules 4 and 8, which are human-only and stay that way. A hit is a string
// that somebody has to have read, not a string that is wrong. See CAUSE_AND_VERDICT.
{
  const usedEntries = new Set<string>()

  for (const strand of playerFacing) {
    const matched = CAUSE_AND_VERDICT.filter((term) => containsTerm(strand.text, term))
    if (matched.length === 0) continue

    const entry = REVIEWED[strand.where]

    if (entry === undefined) {
      fail(
        'hard rules',
        strand.where,
        `speaks of cause or of what could have been ("${matched.join('", "')}"), and Hard Rules 4 `
        + 'and 8 say the game does neither. If it is allowed, say why in REVIEWED in '
        + 'scripts/validate-content.ts and record it in docs/CONTENT_REVIEW.md.',
      )
      continue
    }

    usedEntries.add(strand.where)

    if (entry.text !== strand.text) {
      fail(
        'hard rules',
        strand.where,
        'has been rewritten since it was read against Hard Rules 4 and 8. The reading was of the '
        + 'old words. Read the new ones and update REVIEWED.',
      )
    }

    if (entry.reason.trim().length === 0) {
      fail('hard rules', strand.where, 'is allowed by REVIEWED with no reason given')
    }
  }

  // An entry for a string that no longer says anything causal is an entry nobody
  // will ever read again, and a stale allowance is how the next one slips past.
  for (const where of Object.keys(REVIEWED)) {
    if (!usedEntries.has(where)) {
      fail('hard rules', where, 'is allowed by REVIEWED but no longer matches. Drop the entry.')
    }
  }
}

// Hard Rule 7. The word belongs on the advisory screen and nowhere else, so this
// one scans the raw files rather than the parsed strings: not even a production
// note in the game data may carry it.
const WORD_ALLOWED_IN = 'data/resources.json'

for (const file of ['data/objects.json', 'data/fragments.json', 'data/texts.json', 'data/scenes.json', 'data/rooms.json']) {
  if (/\bsuicide\b/i.test(readFileSync(join(ROOT, file), 'utf8'))) {
    fail(
      'hard rules',
      file,
      `Hard Rule 7: the word "suicide" appears on the advisory screen only, which lives in ${WORD_ALLOWED_IN}. In-game documents talk around it, the way people actually do.`,
    )
  }
}

// ---------------------------------------------------------------------------
// Section 9, the ambiguity ledger
// ---------------------------------------------------------------------------

/**
 * Nothing mechanical can check these. They are printed after a clean run so that
 * whoever changed the content reads them again before shipping it.
 */
const AMBIGUITY_LEDGER: readonly string[] = [
  'What the unsent draft was going to say.',
  "When Mira's letter was written, and exactly why they ended.",
  'Who the second concert ticket was for.',
  'Whether the 4 a.m. entries were his worst nights or ordinary insomnia.',
  'Why he never called the referral number, and what would have happened if he had.',
  'Whether anyone, including the player, could have changed anything.',
  'Why. The answer to why is the whole flat, and the whole flat is not an answer.',
]

// ---------------------------------------------------------------------------
// Writing style
// ---------------------------------------------------------------------------

/**
 * No em-dashes and no emoji, anywhere in the repository. This covers source,
 * data, docs, and config alike, and there are no exemptions: the lore bible was
 * normalized along with everything else. The `commit-msg` hook applies the same
 * two checks to commit messages.
 *
 * Written as escapes rather than literals so that this file passes its own check.
 */
const EM_DASH = '\u2014'
const EMOJI = /\p{Extended_Pictographic}/u

const SCAN_EXTENSIONS: ReadonlySet<string> = new Set([
  '.ts', '.js', '.mjs', '.cjs', '.json', '.jsonc',
  '.md', '.html', '.css', '.yml', '.yaml',
])

const SCAN_FILENAMES: ReadonlySet<string> = new Set([
  '.editorconfig', '.nvmrc', '.gitignore', 'commit-msg',
])

const SKIP_DIRECTORIES: ReadonlySet<string> = new Set(['.git', 'node_modules', 'dist', '.vite'])

/** Generated, not written. Its contents are not ours to style. */
const SKIP_FILES: ReadonlySet<string> = new Set(['package-lock.json'])

function walk(directory: string, found: string[]): string[] {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRECTORIES.has(entry.name)) continue
      walk(join(directory, entry.name), found)
      continue
    }

    if (!entry.isFile() || SKIP_FILES.has(entry.name)) continue
    if (SCAN_EXTENSIONS.has(extname(entry.name)) || SCAN_FILENAMES.has(entry.name)) {
      found.push(join(directory, entry.name))
    }
  }

  return found
}

const scannedFiles = walk(ROOT, [])

for (const file of scannedFiles) {
  const where = relative(ROOT, file)
  const lines = readFileSync(file, 'utf8').split('\n')

  lines.forEach((line, index) => {
    const at = `${where}:${index + 1}`

    if (line.includes(EM_DASH)) {
      fail('writing style', at, 'em-dash. Use a comma, a colon, a full stop, or restructure.')
    }

    const emoji = EMOJI.exec(line)
    if (emoji !== null) {
      fail('writing style', at, `emoji ${JSON.stringify(emoji[0])}. Remove it.`)
    }
  })
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

function report(): void {
  console.log('Content validation')
  console.log(
    `  ${objects.length} objects, ${fragments.length} fragments, ${texts.length} keystone texts, ` +
      `${Array.isArray(rooms) ? rooms.length : 0} rooms`,
  )

  console.log(
    `  ${playerFacing.length} player-facing strings and ${geometryNames.length} geometry names ` +
      'scanned against the section 0 lexicons',
  )
  console.log(`  ${scannedFiles.length} files scanned for em-dashes and emoji`)

  if (problems.length === 0) {
    console.log('\nNo problems found.')
    console.log('\nSection 9 still needs a human. The game must never answer:')
    AMBIGUITY_LEDGER.forEach((question, index) => {
      console.log(`  ${index + 1}. ${question}`)
    })
    const open = Object.entries(OPEN_TO_A_HUMAN)
    if (open.length > 0) {
      console.log('\nHard Rule 5 has open questions. Somebody has to decide these:')
      for (const [id, argument] of open) console.log(`  ${id}: ${argument}`)
    }

    console.log('\nFour of the ten hard rules cannot be checked mechanically at all.')
    console.log('See docs/CONTENT_RULES.md.')
    return
  }

  const byCategory = new Map<string, Problem[]>()
  for (const problem of problems) {
    const bucket = byCategory.get(problem.category)
    if (bucket === undefined) byCategory.set(problem.category, [problem])
    else bucket.push(problem)
  }

  for (const [category, found] of byCategory) {
    console.error(`\n${category} (${found.length})`)
    for (const problem of found) console.error(`  ${problem.where}: ${problem.message}`)
  }

  console.error(`\n${problems.length} problem${problems.length === 1 ? '' : 's'}.`)
}

report()
process.exit(problems.length === 0 ? 0 : 1)

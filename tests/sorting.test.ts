/**
 * Section 4.1 and 4.2, checked against the real content.
 *
 * Two things are being defended here. The first is the verb table: you cannot
 * Take something you have not looked at, and while your hands are full nothing
 * but the boxes answers. The second is that `sorted_count` counts distinct
 * objects, because the act 1 gate is a threshold on it.
 */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

import { createInitialState } from '../src/content/flags.ts'
import { isSorted, recordSort, sortDestinations, sortLabel, sortableInAct } from '../src/rules/sorting.ts'
import { documentReadable, verbFor } from '../src/rules/verbs.ts'
import type { Act, GameObject, SceneData } from '../src/content/types.ts'

const objects = JSON.parse(
  readFileSync(new URL('../data/objects.json', import.meta.url), 'utf8'),
) as GameObject[]

const scenes = JSON.parse(
  readFileSync(new URL('../data/scenes.json', import.meta.url), 'utf8'),
) as SceneData

const byId = new Map(objects.map((object) => [object.id, object]))

function object(id: string): GameObject {
  const found = byId.get(id)
  assert.ok(found !== undefined, `${id} is missing from data/objects.json`)
  return found
}

function act(number: number): Act {
  const found = scenes.acts.find((a) => a.act === number)
  assert.ok(found !== undefined, `act ${number} is missing from data/scenes.json`)
  return found
}

describe('verbFor', () => {
  const boots = object('boots_muddy')

  it('offers Examine before Take on something you have not looked at', () => {
    assert.equal(boots.sortable, true)
    assert.equal(verbFor(boots, { act: 1, examined: false, carrying: false }), 'Examine')
  })

  it('offers Take once it has been looked at', () => {
    assert.equal(verbFor(boots, { act: 1, examined: true, carrying: false }), 'Take')
  })

  it('never offers Take on something that is not sortable', () => {
    const wardrobe = object('wardrobe')
    assert.equal(wardrobe.sortable, false)
    assert.equal(verbFor(wardrobe, { act: 1, examined: true, carrying: false }), 'Examine')
  })

  it('says nothing about anything but the boxes while your hands are full', () => {
    assert.equal(verbFor(boots, { act: 1, examined: true, carrying: true }), null)
  })

  it('offers Sort at the boxes while your hands are full', () => {
    const boxes = object('sorting_boxes')
    assert.equal(boxes.sort_target, true)
    assert.equal(verbFor(boxes, { act: 1, examined: true, carrying: true }), 'Sort')
  })

  it('offers Examine at the boxes when your hands are empty', () => {
    assert.equal(verbFor(object('sorting_boxes'), { act: 1, examined: true, carrying: false }), 'Examine')
  })
})

describe('documentReadable', () => {
  it('keeps the phone thread shut in act 1, when the phone is found', () => {
    const phone = object('phone_dead')
    assert.equal(phone.act_min, 1)
    assert.equal(documentReadable(phone, 1), false)
    assert.equal(verbFor(phone, { act: 1, examined: false, carrying: false }), 'Examine')
  })

  it('opens the phone thread in act 3', () => {
    const phone = object('phone_dead')
    assert.equal(documentReadable(phone, 3), true)
    assert.equal(verbFor(phone, { act: 3, examined: true, carrying: false }), 'Read')
  })

  it('opens an ordinary readable in the act it appears', () => {
    const note = object('lena_note')
    assert.equal(note.text_from_act, undefined)
    assert.equal(documentReadable(note, note.act_min), true)
  })
})

describe('recordSort', () => {
  it('records the destination and counts the object once', () => {
    const state = createInitialState()

    assert.equal(recordSort(state, 'boots_muddy', 'lena'), true)
    assert.equal(state.sorted_count, 1)
    assert.equal(state.objects['boots_muddy']?.sorted_to, 'lena')
    assert.equal(isSorted(state, 'boots_muddy'), true)
  })

  it('refuses to count the same object twice', () => {
    const state = createInitialState()

    recordSort(state, 'boots_muddy', 'lena')
    assert.equal(recordSort(state, 'boots_muddy', 'donate'), false)

    assert.equal(state.sorted_count, 1)
    // And the first answer stands. There is no undo in section 4.1.
    assert.equal(state.objects['boots_muddy']?.sorted_to, 'lena')
  })

  it('keeps an examined object examined', () => {
    const state = createInitialState()
    state.objects['boots_muddy'] = { examined: true, second_look_seen: true, sorted_to: null }

    recordSort(state, 'boots_muddy', 'let_go')

    assert.equal(state.objects['boots_muddy']?.examined, true)
    assert.equal(state.objects['boots_muddy']?.second_look_seen, true)
  })

  it('counts every destination the same, because none of them is the right one', () => {
    const state = createInitialState()

    sortDestinations().forEach((destination, index) => {
      recordSort(state, `made_up_${index}`, destination)
    })

    assert.equal(state.sorted_count, sortDestinations().length)
  })
})

describe('the act 1 gate', () => {
  it('asks for fewer objects than act 1 actually puts in the flat', () => {
    const needed = act(1).gate_to_next?.sorted_count_min
    assert.ok(typeof needed === 'number', 'act 1 has no sorted_count_min')

    const available = sortableInAct(objects, 1)
    assert.ok(
      available.length >= needed,
      `act 1 needs ${needed} sorted but only ${available.length} objects can be sorted in it`,
    )
  })

  it('has a label for every destination the chooser will offer', () => {
    for (const destination of sortDestinations()) {
      assert.match(sortLabel(destination), /^[A-Z ]+$/)
    }
  })
})

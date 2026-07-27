/**
 * Renders a keystone document the way the paper actually looks.
 *
 * Section 4.2 asks for diegetic typography, which mostly means not laying a
 * handwritten note out like a web page. The 4 a.m. notebook is timestamped
 * entries in a cheap notebook. The cover letter has red pen in the margin. The
 * phone thread is two people, one of whom is not going to reply.
 *
 * Every block kind in TEXT_BLOCK_KINDS is handled here. Adding a kind to the type
 * without adding it here fails the exhaustiveness check at the bottom rather than
 * silently dropping the block.
 */

import type { KeystoneText, TextBlock } from '../content/types.ts'

function element(tag: string, className: string, text?: string): HTMLElement {
  const node = document.createElement(tag)
  node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

function renderBlock(block: TextBlock): HTMLElement {
  if (block.kind === 'line') {
    return element('p', 'doc-line', block.text)
  }

  if (block.kind === 'entry') {
    const entry = element('div', 'doc-entry')
    entry.append(element('span', 'doc-entry-time', block.time))
    entry.append(element('p', 'doc-entry-text', block.text))
    return entry
  }

  if (block.kind === 'annotation') {
    const note = element('div', 'doc-annotation')
    note.append(element('span', 'doc-annotation-where', block.where))
    note.append(element('span', 'doc-annotation-text', block.text))
    return note
  }

  if (block.kind === 'message') {
    // "You" is the player character, so their messages sit on the other side.
    const mine = block.sender.toLowerCase() === 'you'
    const draft = block.sender.toLowerCase() === 'draft'
    const row = element('div', `doc-message${mine ? ' is-mine' : ''}${draft ? ' is-draft' : ''}`)

    const meta = block.timestamp.trim().length > 0
      ? `${block.sender}, ${block.timestamp}`
      : block.sender
    row.append(element('span', 'doc-message-meta', meta))
    row.append(element('p', 'doc-message-text', block.text))
    return row
  }

  if (block.kind === 'caption') {
    const caption = element('div', 'doc-caption')
    caption.append(element('span', 'doc-caption-label', block.label))
    caption.append(element('p', 'doc-caption-text', block.text))
    return caption
  }

  if (block.kind === 'signature') {
    return element('p', 'doc-signature', block.text)
  }

  if (block.kind === 'stage') {
    return element('p', 'doc-stage', block.text)
  }

  // If this line stops compiling, a block kind was added to the type and not to
  // the renderer. Handle it above rather than widening this.
  const unhandled: never = block
  throw new Error(`unhandled text block: ${JSON.stringify(unhandled)}`)
}

export function renderDocument(text: KeystoneText): HTMLElement {
  const body = element('div', `doc doc-form-${text.form.replace(/[^a-z]+/gi, '-').toLowerCase()}`)

  for (const block of text.blocks) {
    body.append(renderBlock(block))
  }

  return body
}

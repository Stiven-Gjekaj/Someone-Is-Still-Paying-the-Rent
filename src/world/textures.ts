/**
 * Textures drawn to a canvas at load time. There are no image files in this
 * project and there will not be any.
 *
 * Every generator draws from a seeded pseudo-random source rather than
 * Math.random, so the grain in the floorboards and the speckle in the plaster
 * are identical on every load. A flat that reshuffles its own surfaces each time
 * you open it feels unstable, and this one is meant to feel like somewhere you
 * have been a hundred times.
 */

import * as THREE from 'three'

/** mulberry32. Small, fast, and good enough for surface noise. */
function seeded(seed: number): () => number {
  let state = seed >>> 0
  return function next(): number {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

interface Surface {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  size: number
}

function surface(size: number): Surface {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size

  const ctx = canvas.getContext('2d')
  if (ctx === null) throw new Error('2d canvas context unavailable')

  return { canvas, ctx, size }
}

function finish(s: Surface, repeat: number): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(s.canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(repeat, repeat)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

/** Speckle, drawn as translucent dots so it survives being tiled. */
function speckle(s: Surface, random: () => number, count: number, alpha: number): void {
  for (let i = 0; i < count; i += 1) {
    const shade = Math.floor(random() * 255)
    s.ctx.fillStyle = `rgba(${shade},${shade},${shade},${alpha})`
    s.ctx.fillRect(random() * s.size, random() * s.size, 1, 1)
  }
}

/** Walls and ceilings. Old plaster, painted over more than once. */
export function plasterTexture(color: string, seed = 1): THREE.CanvasTexture {
  const s = surface(256)
  s.ctx.fillStyle = color
  s.ctx.fillRect(0, 0, s.size, s.size)

  const random = seeded(seed)
  speckle(s, random, 4200, 0.05)

  // A few long, faint trowel marks.
  s.ctx.strokeStyle = 'rgba(0,0,0,0.03)'
  s.ctx.lineWidth = 2
  for (let i = 0; i < 14; i += 1) {
    const y = random() * s.size
    s.ctx.beginPath()
    s.ctx.moveTo(0, y)
    s.ctx.bezierCurveTo(s.size * 0.3, y + random() * 12 - 6, s.size * 0.7, y + random() * 12 - 6, s.size, y)
    s.ctx.stroke()
  }

  return finish(s, 3)
}

/** Floorboards, running along one axis, with a worn seam between each. */
export function floorboardTexture(seed = 2): THREE.CanvasTexture {
  const s = surface(512)
  const random = seeded(seed)
  const boards = 8
  const boardWidth = s.size / boards

  for (let i = 0; i < boards; i += 1) {
    const warmth = 0.86 + random() * 0.28
    const r = Math.floor(96 * warmth)
    const g = Math.floor(70 * warmth)
    const b = Math.floor(48 * warmth)
    s.ctx.fillStyle = `rgb(${r},${g},${b})`
    s.ctx.fillRect(i * boardWidth, 0, boardWidth, s.size)

    // Grain along the board.
    s.ctx.strokeStyle = 'rgba(0,0,0,0.16)'
    s.ctx.lineWidth = 1
    for (let line = 0; line < 12; line += 1) {
      const x = i * boardWidth + random() * boardWidth
      s.ctx.beginPath()
      s.ctx.moveTo(x, 0)
      s.ctx.bezierCurveTo(x + random() * 5 - 2.5, s.size * 0.4, x + random() * 5 - 2.5, s.size * 0.7, x, s.size)
      s.ctx.stroke()
    }

    // The seam.
    s.ctx.fillStyle = 'rgba(0,0,0,0.4)'
    s.ctx.fillRect(i * boardWidth, 0, 1.5, s.size)
  }

  speckle(s, random, 2600, 0.06)
  return finish(s, 4)
}

/** Kitchen and bathroom. Small square tiles, grout gone grey. */
export function tileTexture(color: string, grout: string, seed = 3): THREE.CanvasTexture {
  const s = surface(256)
  const random = seeded(seed)
  const cells = 6
  const cell = s.size / cells

  s.ctx.fillStyle = grout
  s.ctx.fillRect(0, 0, s.size, s.size)

  for (let x = 0; x < cells; x += 1) {
    for (let y = 0; y < cells; y += 1) {
      s.ctx.fillStyle = color
      s.ctx.globalAlpha = 0.88 + random() * 0.12
      s.ctx.fillRect(x * cell + 1.5, y * cell + 1.5, cell - 3, cell - 3)
    }
  }

  s.ctx.globalAlpha = 1
  speckle(s, random, 1200, 0.04)
  return finish(s, 3)
}

/** The balcony. Painted concrete, long since weathered. */
export function concreteTexture(seed = 4): THREE.CanvasTexture {
  const s = surface(256)
  s.ctx.fillStyle = '#6a6862'
  s.ctx.fillRect(0, 0, s.size, s.size)

  const random = seeded(seed)
  speckle(s, random, 9000, 0.09)

  s.ctx.fillStyle = 'rgba(0,0,0,0.05)'
  for (let i = 0; i < 40; i += 1) {
    const size = 2 + random() * 6
    s.ctx.fillRect(random() * s.size, random() * s.size, size, size)
  }

  return finish(s, 4)
}

/** Notes, letters, printouts. Off-white with visible fibre. */
export function paperTexture(tint = '#e8e2d4', seed = 5): THREE.CanvasTexture {
  const s = surface(256)
  s.ctx.fillStyle = tint
  s.ctx.fillRect(0, 0, s.size, s.size)

  const random = seeded(seed)
  speckle(s, random, 2000, 0.05)

  return finish(s, 1)
}

/**
 * The city across the street, wrapped around the flat.
 *
 * Deliberately warm. It is the only thing outside the windows and the only thing
 * visible from the balcony, and Hard Rule 10 makes the balcony a place of warm
 * memory only. Other people's lit windows do that; an empty skyline does not.
 * There is no street surface here and no drop, at any height.
 */
export function cityTexture(seed = 21): THREE.CanvasTexture {
  const width = 2048
  const height = 1024
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  if (ctx === null) throw new Error('2d canvas context unavailable')

  const random = seeded(seed)

  const sky = ctx.createLinearGradient(0, 0, 0, height * 0.4)
  sky.addColorStop(0, '#0a0c12')
  sky.addColorStop(1, '#191722')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, width, height * 0.4)

  ctx.fillStyle = '#12111a'
  ctx.fillRect(0, height * 0.38, width, height * 0.38)

  // Buildings, back row first so the front row overlaps it.
  for (const layer of [0, 1]) {
    const base = height * (layer === 0 ? 0.7 : 0.76)
    const shade = layer === 0 ? '#16151f' : '#0e0d15'
    let x = -60

    while (x < width + 60) {
      const w = 90 + random() * 190
      const h = (layer === 0 ? 120 : 190) + random() * 210
      const top = base - h

      ctx.fillStyle = shade
      ctx.fillRect(x, top, w, base - top)

      // Windows. Most are dark. Somebody is up, but not everybody.
      const cols = Math.max(2, Math.floor(w / 34))
      const rows = Math.max(2, Math.floor(h / 42))
      for (let cx = 0; cx < cols; cx += 1) {
        for (let cy = 0; cy < rows; cy += 1) {
          const lit = random()
          if (lit > 0.72) {
            const warmth = 0.55 + random() * 0.45
            ctx.fillStyle = `rgba(${Math.floor(255 * warmth)},${Math.floor(190 * warmth)},${Math.floor(120 * warmth)},${0.5 + random() * 0.5})`
            ctx.fillRect(
              x + 12 + cx * (w / cols),
              top + 14 + cy * (h / rows),
              Math.max(6, w / cols - 16),
              Math.max(8, h / rows - 20),
            )
          }
        }
      }

      x += w + 8 + random() * 26
    }
  }

  // Street glow below, so looking down finds warmth rather than a drop.
  const glow = ctx.createLinearGradient(0, height * 0.74, 0, height)
  glow.addColorStop(0, 'rgba(255,176,96,0.22)')
  glow.addColorStop(0.45, 'rgba(180,110,60,0.10)')
  glow.addColorStop(1, 'rgba(10,9,12,1)')
  ctx.fillStyle = glow
  ctx.fillRect(0, height * 0.74, width, height * 0.26)

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

/** Water running down glass. Tiles vertically so it can be scrolled forever. */
export function rainStreakTexture(seed = 22): THREE.CanvasTexture {
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size

  const ctx = canvas.getContext('2d')
  if (ctx === null) throw new Error('2d canvas context unavailable')

  ctx.clearRect(0, 0, size, size)

  const random = seeded(seed)
  for (let i = 0; i < 150; i += 1) {
    const x = random() * size
    const y = random() * size
    const length = 20 + random() * 120
    const alpha = 0.05 + random() * 0.16

    const streak = ctx.createLinearGradient(x, y, x, y + length)
    streak.addColorStop(0, 'rgba(210,225,235,0)')
    streak.addColorStop(0.4, `rgba(210,225,235,${alpha})`)
    streak.addColorStop(1, 'rgba(210,225,235,0)')

    ctx.fillStyle = streak
    ctx.fillRect(x, y, 1 + random() * 1.6, length)
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  return texture
}

/** Sofa, blankets, towels, the hoodie. A soft weave. */
export function fabricTexture(color: string, seed = 6): THREE.CanvasTexture {
  const s = surface(128)
  s.ctx.fillStyle = color
  s.ctx.fillRect(0, 0, s.size, s.size)

  const random = seeded(seed)
  s.ctx.strokeStyle = 'rgba(0,0,0,0.07)'
  s.ctx.lineWidth = 1

  for (let i = 0; i < s.size; i += 3) {
    s.ctx.beginPath()
    s.ctx.moveTo(i, 0)
    s.ctx.lineTo(i, s.size)
    s.ctx.moveTo(0, i)
    s.ctx.lineTo(s.size, i)
    s.ctx.stroke()
  }

  speckle(s, random, 900, 0.05)
  return finish(s, 6)
}

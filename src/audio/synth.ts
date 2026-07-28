/**
 * Every sound in the flat, made from oscillators and noise.
 *
 * There are no audio files here for the same reason there are no textures: the
 * project ships nothing binary. Rain is filtered noise, the room tone is the same
 * noise pushed further down, the radiator is an enveloped click, and the fridge
 * is a sawtooth with its top taken off.
 *
 * It also sidesteps the licensing question entirely, which for a game about a
 * real subject is worth more than a slightly better rain loop.
 */

/** Two seconds of noise, looped. Long enough that the loop is not audible. */
export function noiseBuffer(context: AudioContext): AudioBuffer {
  const length = context.sampleRate * 2
  const buffer = context.createBuffer(1, length, context.sampleRate)
  const data = buffer.getChannelData(0)

  for (let i = 0; i < length; i += 1) {
    data[i] = Math.random() * 2 - 1
  }

  return buffer
}

export interface Source {
  output: AudioNode
  start(): void
  stop(): void
}

function loopingNoise(context: AudioContext, buffer: AudioBuffer): AudioBufferSourceNode {
  const source = context.createBufferSource()
  source.buffer = buffer
  source.loop = true
  return source
}

/**
 * Rain, heard from inside. Most of the top end is the window, so the bed is
 * mostly the low hiss with just enough above it to read as water.
 */
export function createRain(context: AudioContext, buffer: AudioBuffer, level: number): Source {
  const source = loopingNoise(context, buffer)

  const low = context.createBiquadFilter()
  low.type = 'lowpass'
  low.frequency.value = 2200
  low.Q.value = 0.4

  const high = context.createBiquadFilter()
  high.type = 'highpass'
  high.frequency.value = 420

  const gain = context.createGain()
  gain.gain.value = level

  // A slow swell, so it is weather rather than static.
  const swell = context.createOscillator()
  swell.frequency.value = 0.06
  const swellDepth = context.createGain()
  swellDepth.gain.value = level * 0.28
  swell.connect(swellDepth).connect(gain.gain)

  source.connect(high).connect(low).connect(gain)

  return {
    output: gain,
    start(): void {
      source.start()
      swell.start()
    },
    stop(): void {
      source.stop()
      swell.stop()
    },
  }
}

/** The building itself. Almost inaudible, and very obvious when it stops. */
export function createRoomTone(context: AudioContext, buffer: AudioBuffer, level: number): Source {
  const source = loopingNoise(context, buffer)

  const low = context.createBiquadFilter()
  low.type = 'lowpass'
  low.frequency.value = 180

  const gain = context.createGain()
  gain.gain.value = level

  source.connect(low).connect(gain)

  return {
    output: gain,
    start(): void {
      source.start()
    },
    stop(): void {
      source.stop()
    },
  }
}

/**
 * The fridge Niko fought for two years. A sawtooth with the top filtered off,
 * which is close enough to a compressor to be recognisable and, importantly,
 * annoying.
 */
export interface Hum extends Source {
  setMuffled(muffled: boolean): void
}

export function createFridgeHum(context: AudioContext, level: number): Hum {
  const oscillator = context.createOscillator()
  oscillator.type = 'sawtooth'
  oscillator.frequency.value = 98

  const shape = context.createBiquadFilter()
  shape.type = 'lowpass'
  shape.frequency.value = 420
  shape.Q.value = 3

  const gain = context.createGain()
  gain.gain.value = level

  oscillator.connect(shape).connect(gain)

  return {
    output: gain,

    setMuffled(muffled: boolean): void {
      const now = context.currentTime
      // The towel works. It always worked.
      shape.frequency.setTargetAtTime(muffled ? 150 : 420, now, 0.6)
      gain.gain.setTargetAtTime(muffled ? level * 0.28 : level, now, 0.6)
    },

    start(): void {
      oscillator.start()
    },

    stop(): void {
      oscillator.stop()
    },
  }
}

/** One radiator tick. Fired on a timer rather than looped. */
export function tick(context: AudioContext, destination: AudioNode, level: number): void {
  const now = context.currentTime

  const oscillator = context.createOscillator()
  oscillator.type = 'triangle'
  oscillator.frequency.setValueAtTime(1400 + Math.random() * 700, now)
  oscillator.frequency.exponentialRampToValueAtTime(320, now + 0.05)

  const gain = context.createGain()
  gain.gain.setValueAtTime(0, now)
  gain.gain.linearRampToValueAtTime(level, now + 0.004)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14)

  oscillator.connect(gain).connect(destination)
  oscillator.start(now)
  oscillator.stop(now + 0.2)
}

/**
 * Section 8.1. A key going into a loose cylinder, turning, and the door coming
 * open.
 *
 * Three parts, because that is what the sound is: the scrape of the key finding
 * the pins, two dull clacks as the cylinder turns past a worn detent, and the
 * latch letting go. The looseness is the point. It is a door he opened a
 * thousand times and it never got fixed.
 *
 * Returns how long the whole thing lasts, so the opening can wait for it.
 */
export function keyInLock(context: AudioContext, buffer: AudioBuffer, destination: AudioNode, level: number): number {
  const start = context.currentTime + 0.05

  // The key going in. Filtered noise, brief and scratchy.
  const scrape = context.createBufferSource()
  scrape.buffer = buffer

  const scrapeFilter = context.createBiquadFilter()
  scrapeFilter.type = 'bandpass'
  scrapeFilter.frequency.value = 2600
  scrapeFilter.Q.value = 1.2

  const scrapeGain = context.createGain()
  scrapeGain.gain.setValueAtTime(0, start)
  scrapeGain.gain.linearRampToValueAtTime(level * 0.5, start + 0.03)
  scrapeGain.gain.linearRampToValueAtTime(level * 0.22, start + 0.16)
  scrapeGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.3)

  scrape.connect(scrapeFilter).connect(scrapeGain).connect(destination)
  scrape.start(start)
  scrape.stop(start + 0.35)

  // The cylinder. Two clacks, the second heavier, because it is worn.
  for (const [at, pitch, weight] of [[0.42, 240, 0.8], [0.62, 175, 1]] as const) {
    const clack = context.createOscillator()
    clack.type = 'square'
    clack.frequency.setValueAtTime(pitch, start + at)
    clack.frequency.exponentialRampToValueAtTime(pitch * 0.55, start + at + 0.04)

    const shape = context.createGain()
    shape.gain.setValueAtTime(0, start + at)
    shape.gain.linearRampToValueAtTime(level * weight, start + at + 0.004)
    shape.gain.exponentialRampToValueAtTime(0.0001, start + at + 0.11)

    const soften = context.createBiquadFilter()
    soften.type = 'lowpass'
    soften.frequency.value = 900

    clack.connect(shape).connect(soften).connect(destination)
    clack.start(start + at)
    clack.stop(start + at + 0.16)
  }

  // The latch letting go, and the door.
  const latch = context.createBufferSource()
  latch.buffer = buffer

  const latchFilter = context.createBiquadFilter()
  latchFilter.type = 'lowpass'
  latchFilter.frequency.value = 520

  const latchGain = context.createGain()
  latchGain.gain.setValueAtTime(0, start + 0.86)
  latchGain.gain.linearRampToValueAtTime(level * 0.85, start + 0.9)
  latchGain.gain.exponentialRampToValueAtTime(0.0001, start + 1.5)

  latch.connect(latchFilter).connect(latchGain).connect(destination)
  latch.start(start + 0.86)
  latch.stop(start + 1.6)

  return 1.7
}

/**
 * Section 8.2. The phone finishing its charge.
 *
 * Two notes a fifth apart on a soft sine, with a little glass on top, and a long
 * tail. Quiet on purpose: the bible asks for a sound the player stops for on
 * their own rather than one that stops them. It is the smallest possible event,
 * and everything in the flat has been building toward it for four minutes.
 *
 * Returns how long it rings.
 */
export function chime(context: AudioContext, destination: AudioNode, level: number): number {
  const start = context.currentTime + 0.02

  // A phone's notification tone, not a bell. Two pitches, the second arriving
  // before the first has finished.
  for (const [at, hz, weight] of [[0, 987.77, 1], [0.16, 1318.51, 0.72]] as const) {
    const tone = context.createOscillator()
    tone.type = 'sine'
    tone.frequency.setValueAtTime(hz, start + at)

    const shape = context.createGain()
    shape.gain.setValueAtTime(0, start + at)
    shape.gain.linearRampToValueAtTime(level * weight, start + at + 0.012)
    shape.gain.exponentialRampToValueAtTime(0.0001, start + at + 1.1)

    // A touch of the octave above, at a tenth of the level. It is what makes a
    // sine read as a small speaker rather than a test tone.
    const glass = context.createOscillator()
    glass.type = 'sine'
    glass.frequency.setValueAtTime(hz * 2, start + at)

    const glassGain = context.createGain()
    glassGain.gain.setValueAtTime(0, start + at)
    glassGain.gain.linearRampToValueAtTime(level * weight * 0.11, start + at + 0.008)
    glassGain.gain.exponentialRampToValueAtTime(0.0001, start + at + 0.4)

    tone.connect(shape).connect(destination)
    glass.connect(glassGain).connect(destination)

    tone.start(start + at)
    tone.stop(start + at + 1.3)
    glass.start(start + at)
    glass.stop(start + at + 0.5)
  }

  return 1.5
}

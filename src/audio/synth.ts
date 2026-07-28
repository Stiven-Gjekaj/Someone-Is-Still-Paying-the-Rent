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

/**
 * Section 5. The Low Orbit demo: "one song, unmixed, drums too loud, alive."
 *
 * Bass, two chords, and a kick and snare mixed the way a band mixes itself at
 * two in the morning in somebody's front room, which is to say the drums win. It
 * loops, because a record does.
 *
 * Deliberately not sad. This is the only time the player hears him make anything,
 * and section 0 asks for the struggles to be interleaved with the plans and the
 * noise. It is a decent song by people who were enjoying themselves.
 */
export function createDemo(context: AudioContext, buffer: AudioBuffer, level: number): Source {
  const output = context.createGain()
  output.gain.value = level

  // Through a narrow band, so it reads as a small stereo across a room rather
  // than as music playing at the player.
  const speaker = context.createBiquadFilter()
  speaker.type = 'bandpass'
  speaker.frequency.value = 900
  speaker.Q.value = 0.55
  speaker.connect(output)

  const bar = 1.85
  const beat = bar / 4
  const started: { stop(): void }[] = []

  // Two chords, eight bars apart from each other and from nothing else. A minor
  // to F, which is every song anybody wrote in a front room.
  const CHORDS = [
    [110, 130.81, 164.81],
    [87.31, 110, 174.61],
  ]

  function voice(hz: number, at: number, hold: number, gain: number, type: OscillatorType): void {
    const tone = context.createOscillator()
    tone.type = type
    tone.frequency.setValueAtTime(hz, at)

    const shape = context.createGain()
    shape.gain.setValueAtTime(0, at)
    shape.gain.linearRampToValueAtTime(gain, at + 0.02)
    shape.gain.setValueAtTime(gain, at + hold * 0.7)
    shape.gain.exponentialRampToValueAtTime(0.0001, at + hold)

    tone.connect(shape).connect(speaker)
    tone.start(at)
    tone.stop(at + hold + 0.05)
    started.push(tone)
  }

  function hit(at: number, gain: number, pitch: number, decay: number): void {
    const drum = context.createOscillator()
    drum.type = 'sine'
    drum.frequency.setValueAtTime(pitch, at)
    drum.frequency.exponentialRampToValueAtTime(pitch * 0.4, at + decay)

    const shape = context.createGain()
    shape.gain.setValueAtTime(gain, at)
    shape.gain.exponentialRampToValueAtTime(0.0001, at + decay)

    drum.connect(shape).connect(speaker)
    drum.start(at)
    drum.stop(at + decay + 0.02)
    started.push(drum)
  }

  function snare(at: number, gain: number): void {
    const noise = context.createBufferSource()
    noise.buffer = buffer

    const band = context.createBiquadFilter()
    band.type = 'bandpass'
    band.frequency.value = 1900
    band.Q.value = 0.8

    const shape = context.createGain()
    shape.gain.setValueAtTime(gain, at)
    shape.gain.exponentialRampToValueAtTime(0.0001, at + 0.16)

    noise.connect(band).connect(shape).connect(speaker)
    noise.start(at)
    noise.stop(at + 0.2)
    started.push(noise)
  }

  /** Schedules one pass. Called again, a bar early, to keep it going. */
  function schedule(from: number, bars: number): number {
    for (let index = 0; index < bars; index += 1) {
      const at = from + index * bar
      const chord = CHORDS[Math.floor(index / 2) % CHORDS.length] ?? CHORDS[0]!

      // Bass, on the one and the three, up an octave down.
      voice(chord[0]! / 2, at, beat * 1.6, 0.5, 'triangle')
      voice(chord[0]! / 2, at + beat * 2, beat * 1.6, 0.42, 'triangle')

      // The chord, held, quiet under everything.
      for (const hz of chord) voice(hz, at + 0.01, bar * 0.92, 0.11, 'sawtooth')

      // The drums. Louder than any of it, which is the note in section 5.
      hit(at, 1.15, 92, 0.3)
      hit(at + beat * 2.5, 1.0, 92, 0.28)
      snare(at + beat, 0.85)
      snare(at + beat * 3, 0.9)
    }

    return from + bars * bar
  }

  // `ReturnType` rather than `number`: @types/node is in scope for the validator
  // and the tests, and it types the browser's setInterval as Node's.
  let timer: ReturnType<typeof globalThis.setInterval> | null = null
  let nextAt = 0

  return {
    output,

    start(): void {
      nextAt = schedule(context.currentTime + 0.08, 8)

      // Rescheduled rather than looped from a buffer: it is a few hundred bytes
      // of oscillator either way, and this keeps the whole song in one place.
      timer = globalThis.setInterval(() => {
        if (nextAt - context.currentTime < bar * 4) nextAt = schedule(nextAt, 8)
      }, 1000)
    },

    stop(): void {
      if (timer !== null) globalThis.clearInterval(timer)
      timer = null

      for (const node of started) {
        try {
          node.stop()
        } catch {
          // Already finished. Nothing to do.
        }
      }
      started.length = 0
    },
  }
}

/**
 * Section 8.3. A drawer opening, then shutting.
 *
 * Wood on wood, which is a filtered noise slide with a knock at each end: the
 * pull, the run, and the stop. Deliberately unmusical. The desk scene fires these
 * faster and faster and then not at all, and the not at all is the scene.
 */
export function drawer(context: AudioContext, buffer: AudioBuffer, destination: AudioNode, level: number): number {
  const start = context.currentTime + 0.01

  // The run: noise through a low band that opens as the drawer comes out.
  const run = context.createBufferSource()
  run.buffer = buffer

  const grain = context.createBiquadFilter()
  grain.type = 'bandpass'
  grain.frequency.setValueAtTime(240, start)
  grain.frequency.linearRampToValueAtTime(620, start + 0.22)
  grain.Q.value = 0.9

  const shape = context.createGain()
  shape.gain.setValueAtTime(0, start)
  shape.gain.linearRampToValueAtTime(level * 0.55, start + 0.03)
  shape.gain.linearRampToValueAtTime(level * 0.3, start + 0.18)
  shape.gain.exponentialRampToValueAtTime(0.0001, start + 0.26)

  run.connect(grain).connect(shape).connect(destination)
  run.start(start)
  run.stop(start + 0.3)

  // The stop at the end of the runners, and the shut after it.
  for (const [at, weight] of [[0.24, 1], [0.46, 0.7]] as const) {
    const knock = context.createOscillator()
    knock.type = 'triangle'
    knock.frequency.setValueAtTime(180, start + at)
    knock.frequency.exponentialRampToValueAtTime(72, start + at + 0.05)

    const thud = context.createGain()
    thud.gain.setValueAtTime(0, start + at)
    thud.gain.linearRampToValueAtTime(level * weight, start + at + 0.005)
    thud.gain.exponentialRampToValueAtTime(0.0001, start + at + 0.13)

    const soften = context.createBiquadFilter()
    soften.type = 'lowpass'
    soften.frequency.value = 700

    knock.connect(thud).connect(soften).connect(destination)
    knock.start(start + at)
    knock.stop(start + at + 0.18)
  }

  return 0.6
}

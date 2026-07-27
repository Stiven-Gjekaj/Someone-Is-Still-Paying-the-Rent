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

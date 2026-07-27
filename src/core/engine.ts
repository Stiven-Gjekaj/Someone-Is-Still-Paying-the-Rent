/**
 * Renderer, scene, camera, and the render loop.
 *
 * Everything here is about a dark room with a few warm bulbs in it, which is a
 * harder lighting problem than a bright one: the highlights around a bare bulb
 * clip badly under a naive tone curve. AgX rolls them off instead of blowing
 * them out, which matters when most of the flat is lamplight in pools.
 *
 * Three uses physical light units, so intensities here are in candela and fall
 * off with the square of distance. A room bulb is single digits, not hundreds.
 */

import * as THREE from 'three'

export interface Engine {
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  /** Seconds since the loop started. */
  elapsed(): number
  start(update: (delta: number, elapsed: number) => void): void
  stop(): void
  dispose(): void
  setFieldOfView(degrees: number): void
}

export interface EngineOptions {
  fieldOfView?: number
}

const NIGHT = 0x07080a

/** A tab left in the background hands back one enormous delta. Clamp it. */
const MAX_DELTA = 0.1

export function createEngine(mount: HTMLElement, options: EngineOptions = {}): Engine {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.AgXToneMapping
  renderer.toneMappingExposure = 1.1
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.domElement.className = 'world-canvas'
  mount.append(renderer.domElement)

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(NIGHT)
  // Enough haze to give the rooms depth without reading as smoke. The flat is
  // cold and it has been raining all night.
  scene.fog = new THREE.Fog(NIGHT, 5, 22)

  const camera = new THREE.PerspectiveCamera(
    options.fieldOfView ?? 62,
    window.innerWidth / window.innerHeight,
    0.05,
    60,
  )

  const clock = new THREE.Clock(false)
  let update: ((delta: number, elapsed: number) => void) | null = null
  let running = false

  function onResize(): void {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(window.innerWidth, window.innerHeight)
  }

  window.addEventListener('resize', onResize)

  function tick(): void {
    const delta = Math.min(clock.getDelta(), MAX_DELTA)
    if (update !== null) update(delta, clock.elapsedTime)
    renderer.render(scene, camera)
  }

  return {
    renderer,
    scene,
    camera,

    elapsed(): number {
      return clock.elapsedTime
    },

    start(fn: (delta: number, elapsed: number) => void): void {
      update = fn
      if (running) return
      running = true
      clock.start()
      renderer.setAnimationLoop(tick)
    },

    stop(): void {
      if (!running) return
      running = false
      clock.stop()
      renderer.setAnimationLoop(null)
    },

    dispose(): void {
      renderer.setAnimationLoop(null)
      running = false
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      renderer.domElement.remove()
    },

    setFieldOfView(degrees: number): void {
      camera.fov = degrees
      camera.updateProjectionMatrix()
    },
  }
}

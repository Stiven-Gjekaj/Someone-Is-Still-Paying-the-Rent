/**
 * Section 8.4. The building, from outside, the morning after.
 *
 * Its own scene and its own camera. Nothing in `src/world/` can be reused for
 * this: the flat is lit for a dark room in candela and its `applyAct` is a
 * scalar multiply over authored night colours, which cannot express a hue
 * change and is typed `1 | 2 | 3` so dawn is not expressible at all. The city
 * backdrop in `src/world/rain.ts` is a `BackSide` cylinder centred on the flat,
 * so a camera out here would be outside it and would see nothing.
 *
 * ## Hard Rule 10 decides the framing, and the framing is the content
 *
 * The rule is that nothing on the balcony, or any elevated point, may carry
 * dark connotation. The codebase has enforced its parenthetical three separate
 * times: the backdrop has no street surface and puts warmth at its base, the
 * rain volume has no ground, and the balcony has a solid parapet rather than a
 * railing because "the drop is never part of the composition".
 *
 * A shot looking up at a balcony from a pavement inverts all three. So this one
 * does not look up, and there is no pavement:
 *
 *   - A long lens, level with the balcony. Convergence is what makes a facade
 *     read as tall, and a 24 degree lens has almost none.
 *   - The wall runs off the top and the bottom of the frame. Two storeys are in
 *     shot, which is not a number anybody can count from.
 *   - No roofline and no ground anywhere in frame, at any aspect ratio.
 *   - The sky is beside the building rather than above it, past the corner, so
 *     the morning is legible and the height is not.
 *
 * What is left is one warm window among warm windows, which is exactly what the
 * bible asks for and the only thing about this shot that is allowed to matter.
 *
 * If you are widening the frame, moving the camera down, or adding a pavement,
 * a doorway, or a roofline: that is the rule, not a preference.
 *
 * His own window is dark. He is gone and so are you, and the string lights are
 * the only thing in the picture the player decided.
 */

import * as THREE from 'three'

import { dawnTexture, facadeTexture } from './textures.ts'

export interface Exterior {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  /** Section 5 and 8.4. Whether the player left them on. */
  setLights(on: boolean): void
  /** Keeps the aspect right if the window is resized while the shot is held. */
  resize(width: number, height: number): void
  dispose(): void
}

/**
 * Long. See the header: convergence is what would make the height legible, and
 * a narrow lens has almost none. This one also crops to well under two storeys,
 * which is the other half of the same rule: there is nothing in frame to count.
 */
const FIELD_OF_VIEW = 17

/** How far back the camera stands. With that lens, a bay and a half. */
const DISTANCE = 15

/**
 * Panned right, not turned right. The camera only ever translates, so the wall
 * stays exactly square to it and no vertical in the shot leans anywhere.
 */
const CAMERA_X = 0.5

/**
 * The facade sheet, in metres, and where its right-hand corner falls.
 *
 * Far taller than the frame on purpose: the wall must leave the shot at the top
 * and the bottom rather than ending inside it.
 */
const FACADE_WIDTH = 19
const FACADE_HEIGHT = 13.6
const CORNER_X = 3.2

/** The grid the sheet is drawn on, so the balcony can be hung under a window. */
const BAYS = 10
const FLOORS = 5
const BAY = FACADE_WIDTH / BAYS
const STOREY = FACADE_HEIGHT / FLOORS

/** His window: the eighth bay along, the third row down. Nothing depends on it. */
const HIS_BAY = 7
const HIS_FLOOR = 2

const WINDOW_X = CORNER_X - FACADE_WIDTH + (HIS_BAY + 0.5) * BAY
const WINDOW_Y = FACADE_HEIGHT / 2 - (HIS_FLOOR + 0.49) * STOREY
const WINDOW_WIDTH = BAY * 0.42
const WINDOW_HEIGHT = STOREY * 0.5

/** The balcony hangs off the bottom of that window, the way a balcony does. */
const BALCONY_X = WINDOW_X
const BALCONY_Y = WINDOW_Y - WINDOW_HEIGHT / 2

const BULB_OFF = 0.05
const BULB_ON = 2.6

export function createExterior(): Exterior {
  const scene = new THREE.Scene()
  const owned: { dispose(): void }[] = []

  function keep<T extends { dispose(): void }>(value: T): T {
    owned.push(value)
    return value
  }

  const camera = new THREE.PerspectiveCamera(FIELD_OF_VIEW, 16 / 9, 0.1, 200)
  camera.position.set(CAMERA_X, 0, DISTANCE)
  camera.lookAt(CAMERA_X, 0, 0)

  const sky = keep(dawnTexture())
  scene.background = sky

  // Just enough haze to put air between the wall and the corner, in the colour
  // of the sky it is standing against.
  scene.fog = new THREE.Fog(0xb9b3a6, 22, 62)

  // The wall. Its right edge is the corner, so everything sits to the left of it.
  const facade = new THREE.Mesh(
    keep(new THREE.PlaneGeometry(FACADE_WIDTH, FACADE_HEIGHT)),
    keep(
      new THREE.MeshStandardMaterial({
        map: keep(facadeTexture()),
        roughness: 0.94,
      }),
    ),
  )
  facade.position.set(CORNER_X - FACADE_WIDTH / 2, 0, 0)
  facade.receiveShadow = true
  scene.add(facade)

  // The return around the corner, in shadow, so the building has a thickness
  // rather than being a picture of a building.
  const flank = new THREE.Mesh(
    keep(new THREE.PlaneGeometry(9, FACADE_HEIGHT)),
    keep(new THREE.MeshStandardMaterial({ color: 0x5d554b, roughness: 0.96 })),
  )
  flank.position.set(CORNER_X, 0, -4.5)
  flank.rotation.y = -Math.PI / 2
  scene.add(flank)

  // His balcony. Solid parapet, as everywhere else in this project: the drop is
  // never part of the composition, and a railing would draw one.
  const balcony = new THREE.Group()
  balcony.position.set(BALCONY_X, BALCONY_Y, 0)
  scene.add(balcony)

  // Darker than it wants to be. A pale parapet is the brightest thing in the
  // frame and takes the shot off the one warm thing in it.
  const concrete = keep(new THREE.MeshStandardMaterial({ color: 0x6f665b, roughness: 0.94 }))

  const slab = new THREE.Mesh(keep(new THREE.BoxGeometry(1.9, 0.14, 1.05)), concrete)
  slab.position.set(0, -0.07, 0.525)
  slab.castShadow = true
  balcony.add(slab)

  const parapet = new THREE.Mesh(keep(new THREE.BoxGeometry(1.9, 0.82, 0.09)), concrete)
  parapet.position.set(0, 0.41, 1.0)
  parapet.castShadow = true
  balcony.add(parapet)

  for (const side of [-1, 1]) {
    const end = new THREE.Mesh(keep(new THREE.BoxGeometry(0.09, 0.82, 1.05)), concrete)
    end.position.set(side * 0.9, 0.41, 0.525)
    balcony.add(end)
  }

  // His window, over the one the sheet drew there, so it is dark whatever the
  // texture's own coin toss said. Nobody is in and nobody is coming back, and
  // the string below it is the only warm thing on this part of the wall.
  const window_ = new THREE.Mesh(
    keep(new THREE.PlaneGeometry(WINDOW_WIDTH, WINDOW_HEIGHT)),
    // Matt, and it has to be: anything specular here takes a highlight off the
    // string below and puts what looks like a lamp on in his front room.
    keep(new THREE.MeshStandardMaterial({ color: 0x333b47, roughness: 0.95 })),
  )
  window_.position.set(0, WINDOW_HEIGHT / 2, 0.012)
  balcony.add(window_)

  // The string, along the parapet and up the wall. Six bulbs, warm, the way they
  // have been for six summers.
  const bulbMaterial = keep(
    new THREE.MeshStandardMaterial({
      color: 0xffd89b,
      emissive: 0xffb457,
      emissiveIntensity: BULB_OFF,
      roughness: 0.4,
    }),
  )

  const bulbGeometry = keep(new THREE.SphereGeometry(0.05, 10, 8))
  const wire = keep(new THREE.MeshStandardMaterial({ color: 0x2a2622, roughness: 0.85 }))
  const wireGeometry = keep(new THREE.CylinderGeometry(0.008, 0.008, 1, 5))

  const BULBS = 6
  const points: THREE.Vector3[] = []

  for (let i = 0; i < BULBS; i += 1) {
    const t = i / (BULBS - 1)
    const x = -0.82 + t * 1.64
    // A slack line, hung from both ends, which is what a string of lights does.
    // Clear of the parapet and in front of it, so the bulbs read as hanging on
    // it rather than as set into it.
    const y = 0.93 + Math.sin(t * Math.PI) * -0.14
    const at = new THREE.Vector3(x, y, 1.12)
    points.push(at)

    const glass = new THREE.Mesh(bulbGeometry, bulbMaterial)
    glass.position.copy(at)
    balcony.add(glass)
  }

  for (let i = 1; i < points.length; i += 1) {
    const from = points[i - 1]
    const to = points[i]
    if (from === undefined || to === undefined) continue

    const segment = new THREE.Mesh(wireGeometry, wire)
    segment.position.copy(from).add(to).multiplyScalar(0.5)
    segment.scale.y = from.distanceTo(to)
    segment.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      to.clone().sub(from).normalize(),
    )
    balcony.add(segment)
  }

  /**
   * What the string actually throws on the wall. Emissive material lights
   * nothing in Three, and the whole point of the shot is the light, not the
   * bulbs.
   */
  const glow = new THREE.PointLight(0xffb457, 0, 4.5, 2)
  glow.position.set(BALCONY_X, BALCONY_Y + 0.9, 1.34)
  scene.add(glow)

  // A second, weaker one below and in front, so the light reaches the parapet
  // and the wall beside it. Deliberately not above: light spilling up onto his
  // window would read as somebody home, and nobody is.
  const spill = new THREE.PointLight(0xffc98a, 0, 3.4, 2)
  spill.position.set(BALCONY_X, BALCONY_Y + 0.42, 1.75)
  scene.add(spill)

  // Morning. Cool from the sky, warm from the low end of it, and no sun yet.
  const ambient = new THREE.HemisphereLight(0xa8b6cb, 0x6b5c4c, 1.15)
  scene.add(ambient)

  const low = new THREE.DirectionalLight(0xffcf9c, 2.9)
  low.position.set(9, 2.5, 12)
  low.target.position.set(0, 0, 0)

  // The balcony's own shadow on the wall behind it, which is the only thing that
  // stops a flat facade with a grey slab on it reading as a diagram.
  low.castShadow = true
  low.shadow.mapSize.set(1024, 1024)
  low.shadow.camera.left = -6
  low.shadow.camera.right = 6
  low.shadow.camera.top = 5
  low.shadow.camera.bottom = -5
  low.shadow.camera.near = 1
  low.shadow.camera.far = 30
  low.shadow.bias = -0.0012

  scene.add(low)
  scene.add(low.target)

  const fill = new THREE.DirectionalLight(0x93a4bd, 0.9)
  fill.position.set(-8, 6, 9)
  scene.add(fill)

  return {
    scene,
    camera,

    setLights(on: boolean): void {
      bulbMaterial.emissiveIntensity = on ? BULB_ON : BULB_OFF
      glow.intensity = on ? 1.5 : 0
      spill.intensity = on ? 0.8 : 0
    },

    resize(width: number, height: number): void {
      camera.aspect = width / Math.max(1, height)
      camera.updateProjectionMatrix()
    },

    dispose(): void {
      for (const thing of owned) thing.dispose()
      owned.length = 0
      scene.clear()
      scene.background = null
      scene.fog = null
    },
  }
}

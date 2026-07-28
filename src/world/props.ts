/**
 * The prop archetypes named by `data/placement.json`.
 *
 * Sixteen shapes cover fifty-one objects, which is the point: a mug is a mug
 * whether it is yours or hers, and the difference between them lives in the text
 * and in a tint, not in a bespoke mesh. Anything that needed its own model would
 * need an artist and a binary file, and this project has neither.
 *
 * Every shape is built standing on the origin: centred in X and Z, base at y = 0,
 * at roughly its real size in metres. Placement scales, turns, and lifts it.
 */

import * as THREE from 'three'

import type { PaletteKey, PropShape, SortDestination } from '../content/types.ts'
import { sortDestinations, sortLabel } from '../rules/sorting.ts'
import { materialByKey, type Materials } from './materials.ts'
import { markerLabelTexture, shippingLabelTexture } from './textures.ts'

export interface PropFactory {
  build(shape: PropShape, tint?: PaletteKey): THREE.Group
  /** Section 5. The one thing in the flat the player can leave switched on. */
  setStringLights(on: boolean): void
  /**
   * Section 8.4. Flaps down, tape across, courier label. Only the Lena box: the
   * other two stay open, and that contrast is the picture.
   */
  sealLenaBox(sealed: boolean): void
  dispose(): void
}

/** Glass catching the street. Section 5 is explicit that this is not lit. */
const BULB_OFF = 0.07

/** Lit. Six small bulbs, warm, the way they have been for six summers. */
const BULB_ON = 1.4

export function createPropFactory(materials: Materials): PropFactory {
  // Geometries and the one material these shapes own outright, so the caller can
  // drop the lot in a single call.
  const owned: { dispose(): void }[] = []

  function keep<T extends THREE.BufferGeometry>(geometry: T): T {
    owned.push(geometry)
    return geometry
  }

  function box(
    parent: THREE.Group,
    w: number,
    h: number,
    d: number,
    material: THREE.Material,
    x = 0,
    y = 0,
    z = 0,
    yaw = 0,
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(keep(new THREE.BoxGeometry(w, h, d)), material)
    mesh.position.set(x, y, z)
    mesh.rotation.y = yaw
    mesh.castShadow = true
    mesh.receiveShadow = true
    parent.add(mesh)
    return mesh
  }

  function cylinder(
    parent: THREE.Group,
    radiusTop: number,
    radiusBottom: number,
    height: number,
    material: THREE.Material,
    x = 0,
    y = 0,
    z = 0,
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(
      keep(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 16)),
      material,
    )
    mesh.position.set(x, y, z)
    mesh.castShadow = true
    mesh.receiveShadow = true
    parent.add(mesh)
    return mesh
  }

  // Drawing a label costs a canvas, so the three are drawn once and shared even
  // if the trio is ever built more than once.
  const labels = new Map<SortDestination, THREE.MeshStandardMaterial>()

  /**
   * The bulbs on the balcony wire, at factory scope so the ending can reach them.
   *
   * `emissiveIntensity: 0.07` is the OFF state and the comment below says why: it
   * is glass catching the street, not a lit filament. Turning them on climbs from
   * it. Built once and shared, the way the labels are.
   */
  const bulb = new THREE.MeshStandardMaterial({
    color: 0xffd89b,
    emissive: 0xffb457,
    emissiveIntensity: BULB_OFF,
    roughness: 0.4,
  })
  owned.push(bulb)

  /**
   * The two states of the Lena carton, both built and one of them hidden.
   *
   * Built rather than rebuilt because the ending seals the box while the player
   * is looking at it, and swapping a visibility flag is the only version of that
   * which cannot flicker. Empty until the trio is built, and it is built once.
   */
  const lenaOpen: THREE.Object3D[] = []
  const lenaSealed: THREE.Object3D[] = []

  /**
   * Packing tape. Its own material rather than paper, because the whole reason
   * the seal reads across a dim room is that tape is the one shiny thing on a
   * cardboard box.
   */
  const tape = new THREE.MeshStandardMaterial({
    color: 0xbfa87f,
    roughness: 0.22,
    metalness: 0.02,
  })
  owned.push(tape)

  let shippingLabel: THREE.MeshStandardMaterial | null = null

  function shippingLabelMaterial(): THREE.MeshStandardMaterial {
    if (shippingLabel !== null) return shippingLabel

    const map = shippingLabelTexture('Lena Marku')
    const material = new THREE.MeshStandardMaterial({ map, roughness: 0.75 })
    owned.push(material, map)
    shippingLabel = material
    return material
  }

  function labelMaterial(destination: SortDestination): THREE.MeshStandardMaterial {
    const existing = labels.get(destination)
    if (existing !== undefined) return existing

    const map = markerLabelTexture(sortLabel(destination), 30 + labels.size)
    const material = new THREE.MeshStandardMaterial({
      map,
      roughness: 0.9,
      transparent: true,
      // Sitting 2mm proud of the card and drawn after it. Without this the
      // transparent parts of the label write depth and punch a hole in the box.
      depthWrite: false,
    })
    owned.push(material, map)
    labels.set(destination, material)
    return material
  }

  function build(shape: PropShape, tint?: PaletteKey): THREE.Group {
    const group = new THREE.Group()
    const accent = tint === undefined ? undefined : materialByKey(materials, tint)

    if (shape === 'paper') {
      box(group, 0.21, 0.0015, 0.148, accent ?? materials.paper, 0, 0.001, 0)
      return group
    }

    if (shape === 'book') {
      const cover = accent ?? materials.woodDark
      box(group, 0.145, 0.032, 0.21, cover, 0, 0.016, 0)
      box(group, 0.133, 0.024, 0.198, materials.paper, 0.004, 0.016, 0)
      return group
    }

    if (shape === 'mug') {
      const body = accent ?? materials.ceramicWhite
      cylinder(group, 0.041, 0.036, 0.095, body, 0, 0.0475, 0)
      cylinder(group, 0.034, 0.032, 0.006, materials.plasticDark, 0, 0.092, 0)
      const handle = new THREE.Mesh(
        keep(new THREE.TorusGeometry(0.026, 0.006, 8, 14, Math.PI * 1.1)),
        body,
      )
      handle.position.set(0.046, 0.05, 0)
      handle.rotation.set(0, Math.PI / 2, -Math.PI / 2)
      handle.castShadow = true
      group.add(handle)
      return group
    }

    if (shape === 'bowl') {
      const body = accent ?? materials.ceramicWhite
      cylinder(group, 0.082, 0.05, 0.062, body, 0, 0.031, 0)
      cylinder(group, 0.072, 0.044, 0.05, materials.plasticDark, 0, 0.04, 0)
      return group
    }

    if (shape === 'jar') {
      const body = accent ?? materials.glass
      cylinder(group, 0.048, 0.048, 0.135, body, 0, 0.0675, 0)
      cylinder(group, 0.05, 0.05, 0.012, materials.metalDull, 0, 0.135, 0)
      // Something in it. Bottle caps, cuttings, whichever the text says.
      cylinder(group, 0.042, 0.042, 0.05, materials.metalBrass, 0, 0.026, 0)
      return group
    }

    if (shape === 'bottle') {
      const body = accent ?? materials.glass
      cylinder(group, 0.026, 0.03, 0.085, body, 0, 0.0425, 0)
      cylinder(group, 0.011, 0.02, 0.045, body, 0, 0.107, 0)
      cylinder(group, 0.013, 0.013, 0.012, materials.metalDull, 0, 0.134, 0)
      return group
    }

    if (shape === 'phone') {
      box(group, 0.072, 0.009, 0.147, accent ?? materials.plasticDark, 0, 0.0045, 0)
      box(group, 0.064, 0.001, 0.136, materials.plasticDark, 0, 0.0095, 0)
      return group
    }

    if (shape === 'frame') {
      const frame = accent ?? materials.woodDark
      box(group, 0.185, 0.014, 0.135, frame, 0, 0.007, 0)
      box(group, 0.155, 0.004, 0.108, materials.paper, 0, 0.015, 0)
      return group
    }

    if (shape === 'carton') {
      const card = accent ?? materials.card
      box(group, 0.3, 0.235, 0.24, card, 0, 0.1175, 0)
      // Tape across the top, so it reads as packed rather than empty.
      box(group, 0.06, 0.002, 0.24, materials.paper, 0, 0.236, 0)
      return group
    }

    if (shape === 'carton_trio') {
      const card = accent ?? materials.card
      const width = 0.3
      const depth = 0.24
      const height = 0.235

      // Three, side by side, because section 4.1 has three destinations. They are
      // one interactable: the choice is made in the overlay, not by aiming at a
      // particular box, so that a misaimed reticle can never send his coat to the
      // wrong place.
      sortDestinations().forEach((destination, index) => {
        const x = (index - 1) * (width + 0.055)
        // Not squared up. He put them down one at a time.
        const yaw = [-0.05, 0.02, 0.07][index] ?? 0

        const carton = new THREE.Group()
        box(carton, width, height, depth, card, 0, height / 2, 0)
        // Flaps open, waiting. The taped carton is a different shape.
        for (const side of [-1, 1]) {
          const flap = box(carton, width, 0.004, 0.09, card, 0, height + 0.043, side * 0.155, 0)
          flap.rotation.x = side * 0.55
          if (destination === 'lena') lenaOpen.push(flap)
        }

        const label = new THREE.Mesh(
          keep(new THREE.PlaneGeometry(width * 0.86, height * 0.34)),
          labelMaterial(destination),
        )
        label.position.set(0, height * 0.56, depth / 2 + 0.002)
        carton.add(label)

        // Section 8.4. The same box, closed, waiting under the open one. Only
        // this box gets it: the picture at the end is one carton going somewhere
        // and two that are not.
        if (destination === 'lena') {
          for (const side of [-1, 1]) {
            const shut = box(carton, width, 0.004, 0.115, card, 0, height + 0.002, side * 0.0605, 0)
            shut.visible = false
            lenaSealed.push(shut)
          }

          // Along the seam, and over both ends of it, the way anybody tapes a box.
          const seam = box(carton, 0.06, 0.0025, depth + 0.02, tape, 0, height + 0.006, 0)
          seam.visible = false
          lenaSealed.push(seam)

          for (const side of [-1, 1]) {
            const end = box(carton, width + 0.02, 0.0025, 0.05, tape, 0, height + 0.005, side * (depth / 2 - 0.012))
            end.visible = false
            lenaSealed.push(end)
          }

          const courier = new THREE.Mesh(
            keep(new THREE.PlaneGeometry(width * 0.5, width * 0.375)),
            shippingLabelMaterial(),
          )
          courier.position.set(width * 0.16, height + 0.008, -0.03)
          courier.rotation.x = -Math.PI / 2
          courier.visible = false
          carton.add(courier)
          lenaSealed.push(courier)
        }

        carton.position.set(x, 0, 0)
        carton.rotation.y = yaw
        group.add(carton)
      })

      return group
    }

    if (shape === 'plant') {
      cylinder(group, 0.105, 0.078, 0.155, accent ?? materials.terracotta, 0, 0.0775, 0)
      cylinder(group, 0.098, 0.098, 0.02, materials.soil, 0, 0.152, 0)
      // A monstera reads from its leaf silhouette more than anything else.
      for (let i = 0; i < 6; i += 1) {
        const angle = (i / 6) * Math.PI * 2
        const lift = 0.24 + (i % 3) * 0.07
        const leaf = new THREE.Mesh(keep(new THREE.CircleGeometry(0.1, 7)), materials.leaf)
        leaf.material.side = THREE.DoubleSide
        leaf.position.set(Math.cos(angle) * 0.11, lift, Math.sin(angle) * 0.11)
        leaf.rotation.set(-Math.PI / 3, angle, 0)
        leaf.castShadow = true
        group.add(leaf)
        cylinder(group, 0.005, 0.005, lift - 0.15, materials.leaf, Math.cos(angle) * 0.055, 0.15 + (lift - 0.15) / 2, Math.sin(angle) * 0.055)
      }
      return group
    }

    if (shape === 'cloth') {
      const weave = accent ?? materials.fabricGrey
      box(group, 0.3, 0.045, 0.22, weave, 0, 0.0225, 0)
      box(group, 0.26, 0.035, 0.185, weave, 0.012, 0.062, -0.008, 0.12)
      return group
    }

    if (shape === 'footwear') {
      for (const side of [-1, 1]) {
        const x = side * 0.065
        box(group, 0.1, 0.075, 0.235, materials.rubber, x, 0.0375, 0, side * 0.08)
        box(group, 0.098, 0.03, 0.09, materials.plasticDark, x, 0.085, -0.06, side * 0.08)
      }
      return group
    }

    if (shape === 'folding_seat') {
      // Two of them, angled slightly toward each other. Never one, never three.
      for (const side of [-1, 1]) {
        const seat = new THREE.Group()
        box(seat, 0.4, 0.03, 0.38, materials.woodMid, 0, 0.42, 0)
        box(seat, 0.4, 0.42, 0.03, materials.woodMid, 0, 0.63, -0.175)
        for (const sx of [-1, 1]) {
          for (const sz of [-1, 1]) {
            box(seat, 0.03, 0.42, 0.03, materials.metalDull, sx * 0.17, 0.21, sz * 0.16)
          }
        }
        seat.position.set(side * 0.32, 0, 0)
        seat.rotation.y = -side * 0.28
        group.add(seat)
      }
      return group
    }

    if (shape === 'case') {
      const shell = accent ?? materials.plasticDark
      box(group, 0.36, 0.13, 0.62, shell, 0, 0.065, 0)
      box(group, 0.37, 0.012, 0.63, materials.metalDull, 0, 0.065, 0)
      box(group, 0.09, 0.02, 0.03, materials.metalDull, 0, 0.14, 0.24)
      return group
    }

    if (shape === 'disc') {
      box(group, 0.126, 0.002, 0.126, materials.paper, 0, 0.001, 0)
      cylinder(group, 0.058, 0.058, 0.0012, accent ?? materials.metalWhite, 0, 0.0028, 0)
      cylinder(group, 0.008, 0.008, 0.002, materials.plasticDark, 0, 0.0034, 0)
      return group
    }

    // string_lights: a run of bulbs on a sagging wire. They still work, but they
    // are not on: section 5 makes switching them on the player's choice, and the
    // flag it sets decides whether they are burning in the final exterior shot.
    const span = 2.2
    const segments = 11

    for (let i = 0; i <= segments; i += 1) {
      const t = i / segments
      const x = (t - 0.5) * span
      // A shallow catenary, faked with a parabola. Nobody measures.
      const sag = -0.16 * (1 - Math.pow((t - 0.5) * 2, 2))
      box(group, span / segments, 0.006, 0.006, materials.plasticDark, x, sag, 0)
      if (i % 2 === 0) {
        const light = new THREE.Mesh(keep(new THREE.SphereGeometry(0.022, 10, 8)), bulb)
        light.position.set(x, sag - 0.035, 0)
        group.add(light)
      }
    }

    return group
  }

  return {
    build,

    setStringLights(on: boolean): void {
      bulb.emissiveIntensity = on ? BULB_ON : BULB_OFF
    },

    sealLenaBox(sealed: boolean): void {
      for (const part of lenaOpen) part.visible = !sealed
      for (const part of lenaSealed) part.visible = sealed
    },

    dispose(): void {
      for (const geometry of owned) geometry.dispose()
      owned.length = 0
    },
  }
}

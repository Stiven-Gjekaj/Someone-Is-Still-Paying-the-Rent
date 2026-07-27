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

import type { PaletteKey, PropShape } from '../content/types.ts'
import { materialByKey, type Materials } from './materials.ts'

export interface PropFactory {
  build(shape: PropShape, tint?: PaletteKey): THREE.Group
  dispose(): void
}

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

    // string_lights: a run of bulbs on a sagging wire. They still work.
    const span = 2.2
    const segments = 11
    const bulb = new THREE.MeshStandardMaterial({
      color: 0xffd89b,
      emissive: 0xffb457,
      emissiveIntensity: 0.6,
      roughness: 0.4,
    })
    owned.push(bulb)

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
    dispose(): void {
      for (const geometry of owned) geometry.dispose()
      owned.length = 0
    },
  }
}

/**
 * The soft outline on whatever is under the reticle.
 *
 * Two effects, because one is not enough here. A back-face shell scaled up
 * slightly gives the silhouette the bible asks for, and it works well on the
 * furniture-sized objects. It does almost nothing for a sheet of paper 1.5mm
 * thick, and this flat is full of paper, so the object's own materials also get
 * a small emissive lift.
 *
 * Both are built once per object and then toggled, so hovering back and forth
 * across a shelf does not allocate anything after the first pass.
 *
 * No EffectComposer. A full post-processing chain to outline one object at a time
 * costs the whole frame, and if it fails it takes the picture with it. This
 * degrades to nothing.
 */

import * as THREE from 'three'

const SHELL_SCALE = 1.055
const EMISSIVE = new THREE.Color(0xffb870)
const EMISSIVE_STRENGTH = 0.22

interface Lifted {
  mesh: THREE.Mesh
  original: THREE.Material | THREE.Material[]
  highlighted: THREE.Material | THREE.Material[]
}

export interface Highlight {
  set(node: THREE.Object3D | null): void
  dispose(): void
}

function isMesh(node: THREE.Object3D): node is THREE.Mesh {
  return (node as THREE.Mesh).isMesh === true
}

function liftMaterial(material: THREE.Material): THREE.Material {
  const clone = material.clone()
  const standard = clone as THREE.MeshStandardMaterial
  if (standard.emissive !== undefined) {
    standard.emissive = EMISSIVE.clone()
    standard.emissiveIntensity = EMISSIVE_STRENGTH
  }
  return clone
}

export function createHighlight(): Highlight {
  const shellMaterial = new THREE.MeshBasicMaterial({
    color: 0xffc98a,
    side: THREE.BackSide,
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
  })

  const shells = new Map<THREE.Object3D, THREE.Group>()
  const lifts = new Map<THREE.Object3D, Lifted[]>()

  let active: THREE.Object3D | null = null

  function shellFor(node: THREE.Object3D): THREE.Group {
    const existing = shells.get(node)
    if (existing !== undefined) return existing

    const group = new THREE.Group()
    group.name = 'outline'

    node.traverse((child) => {
      if (!isMesh(child) || child.name === 'outline') return
      const copy = new THREE.Mesh(child.geometry, shellMaterial)
      // Match where the mesh sits inside the object, then swell it a little.
      copy.position.copy(child.position)
      copy.quaternion.copy(child.quaternion)
      copy.scale.copy(child.scale).multiplyScalar(SHELL_SCALE)
      copy.renderOrder = -1
      group.add(copy)
    })

    node.add(group)
    shells.set(node, group)
    return group
  }

  function liftsFor(node: THREE.Object3D): Lifted[] {
    const existing = lifts.get(node)
    if (existing !== undefined) return existing

    const found: Lifted[] = []
    node.traverse((child) => {
      if (!isMesh(child) || child.name === 'outline') return
      if (child.parent?.name === 'outline') return

      const original = child.material
      const highlighted = Array.isArray(original)
        ? original.map(liftMaterial)
        : liftMaterial(original)

      found.push({ mesh: child, original, highlighted })
    })

    lifts.set(node, found)
    return found
  }

  function apply(node: THREE.Object3D, on: boolean): void {
    shellFor(node).visible = on
    for (const lift of liftsFor(node)) {
      lift.mesh.material = on ? lift.highlighted : lift.original
    }
  }

  return {
    set(node: THREE.Object3D | null): void {
      if (node === active) return
      if (active !== null) apply(active, false)
      active = node
      if (active !== null) apply(active, true)
    },

    dispose(): void {
      if (active !== null) apply(active, false)
      active = null

      for (const [node, group] of shells) {
        node.remove(group)
        group.clear()
      }
      shells.clear()

      for (const found of lifts.values()) {
        for (const lift of found) {
          const materials = Array.isArray(lift.highlighted) ? lift.highlighted : [lift.highlighted]
          for (const material of materials) material.dispose()
        }
      }
      lifts.clear()

      shellMaterial.dispose()
    },
  }
}

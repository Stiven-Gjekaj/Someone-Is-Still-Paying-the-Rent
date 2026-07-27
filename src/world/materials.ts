/**
 * The material palette for the whole flat.
 *
 * Built once and shared, so that fifty objects made of wood are fifty draw calls
 * against one material rather than fifty materials. Everything is a
 * MeshStandardMaterial: the flat is lit by a handful of warm bulbs and needs
 * honest roughness more than it needs clever shading.
 *
 * The bulb colour is read from the same `--bulb` custom property the HUD uses,
 * so the lamplight in the rooms and the link colour on the advisory screen
 * cannot drift apart. Everything else here is surface colour that has no UI
 * equivalent, and is defined in this file alone.
 */

import * as THREE from 'three'

import {
  concreteTexture,
  fabricTexture,
  floorboardTexture,
  paperTexture,
  plasterTexture,
  tileTexture,
} from './textures.ts'

const BULB_FALLBACK = '#d9b26f'

/** Reads a CSS custom property, falling back when the stylesheet has not landed. */
export function cssColor(name: string, fallback: string): THREE.Color {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return new THREE.Color(raw.length > 0 ? raw : fallback)
}

export function bulbColor(): THREE.Color {
  return cssColor('--bulb', BULB_FALLBACK)
}

export interface Materials {
  wall: THREE.MeshStandardMaterial
  ceiling: THREE.MeshStandardMaterial
  skirting: THREE.MeshStandardMaterial

  floorWood: THREE.MeshStandardMaterial
  floorTileKitchen: THREE.MeshStandardMaterial
  floorTileBathroom: THREE.MeshStandardMaterial
  concrete: THREE.MeshStandardMaterial

  woodDark: THREE.MeshStandardMaterial
  woodMid: THREE.MeshStandardMaterial
  woodPale: THREE.MeshStandardMaterial

  metalDull: THREE.MeshStandardMaterial
  metalBrass: THREE.MeshStandardMaterial
  metalWhite: THREE.MeshStandardMaterial

  fabricGrey: THREE.MeshStandardMaterial
  fabricWarm: THREE.MeshStandardMaterial

  paper: THREE.MeshStandardMaterial
  card: THREE.MeshStandardMaterial

  ceramicWhite: THREE.MeshStandardMaterial
  ceramicBlue: THREE.MeshStandardMaterial
  terracotta: THREE.MeshStandardMaterial

  glass: THREE.MeshPhysicalMaterial
  leaf: THREE.MeshStandardMaterial
  soil: THREE.MeshStandardMaterial
  plasticDark: THREE.MeshStandardMaterial
  rubber: THREE.MeshStandardMaterial

  dispose(): void
}

export function createMaterials(): Materials {
  const wallMap = plasterTexture('#b9b2a4', 11)
  const ceilingMap = plasterTexture('#cfc9bd', 12)
  const woodMap = floorboardTexture()
  const kitchenTileMap = tileTexture('#8f9490', '#5c5f5c', 13)
  const bathroomTileMap = tileTexture('#a8b0ad', '#6b706d', 14)
  const concreteMap = concreteTexture()
  const paperMap = paperTexture()
  const cardMap = paperTexture('#d6cbb2', 15)
  const greyWeave = fabricTexture('#4a4b4d', 16)
  const warmWeave = fabricTexture('#6b5340', 17)

  const owned: { dispose(): void }[] = [
    wallMap,
    ceilingMap,
    woodMap,
    kitchenTileMap,
    bathroomTileMap,
    concreteMap,
    paperMap,
    cardMap,
    greyWeave,
    warmWeave,
  ]

  function standard(
    parameters: THREE.MeshStandardMaterialParameters,
  ): THREE.MeshStandardMaterial {
    const material = new THREE.MeshStandardMaterial(parameters)
    owned.push(material)
    return material
  }

  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x9fb0bb,
    roughness: 0.08,
    metalness: 0,
    transmission: 0.9,
    thickness: 0.01,
    transparent: true,
    opacity: 0.35,
  })
  owned.push(glass)

  return {
    wall: standard({ map: wallMap, color: 0xa8a294, roughness: 0.95 }),
    ceiling: standard({ map: ceilingMap, color: 0xb6b1a6, roughness: 1 }),
    skirting: standard({ color: 0xd6d0c4, roughness: 0.7 }),

    floorWood: standard({ map: woodMap, roughness: 0.68 }),
    floorTileKitchen: standard({ map: kitchenTileMap, roughness: 0.42 }),
    floorTileBathroom: standard({ map: bathroomTileMap, roughness: 0.38 }),
    concrete: standard({ map: concreteMap, roughness: 0.98 }),

    woodDark: standard({ color: 0x4a3728, roughness: 0.62 }),
    woodMid: standard({ color: 0x7a5c3f, roughness: 0.6 }),
    woodPale: standard({ color: 0xa8845c, roughness: 0.58 }),

    metalDull: standard({ color: 0x6e7175, roughness: 0.45, metalness: 0.8 }),
    metalBrass: standard({ color: 0xb08b4a, roughness: 0.34, metalness: 0.9 }),
    metalWhite: standard({ color: 0xd8d6d0, roughness: 0.3, metalness: 0.6 }),

    fabricGrey: standard({ map: greyWeave, roughness: 0.96 }),
    fabricWarm: standard({ map: warmWeave, roughness: 0.96 }),

    paper: standard({ map: paperMap, color: 0xefe9dc, roughness: 0.92 }),
    card: standard({ map: cardMap, roughness: 0.9 }),

    ceramicWhite: standard({ color: 0xe4e0d6, roughness: 0.24 }),
    ceramicBlue: standard({ color: 0x4d6f86, roughness: 0.26 }),
    terracotta: standard({ color: 0xa5613f, roughness: 0.86 }),

    glass,
    leaf: standard({ color: 0x38612f, roughness: 0.66 }),
    soil: standard({ color: 0x2e2419, roughness: 1 }),
    plasticDark: standard({ color: 0x24262a, roughness: 0.55 }),
    rubber: standard({ color: 0x1c1d1f, roughness: 0.95 }),

    dispose(): void {
      for (const item of owned) item.dispose()
      owned.length = 0
    },
  }
}

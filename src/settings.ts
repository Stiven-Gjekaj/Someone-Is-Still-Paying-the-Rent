/**
 * Comfort settings, remembered between sittings.
 *
 * Head bob defaults to whatever the system already says about motion. Somebody
 * who has told their operating system they get motion sick should not have to
 * tell this game separately, and should certainly not have to find the option
 * after the first minute has already made them ill.
 */

const STORAGE_KEY = 'sispr.settings'

export interface Settings {
  headBob: boolean
  /** Mouse look multiplier. Also scales the arrow keys. */
  sensitivity: number
  fieldOfView: number
  /**
   * Everything the flat makes, from silence to as loud as it was authored.
   *
   * Not a nicety. The rain, the fridge and the radiators run for the whole game,
   * and section 8.2's chime is a gate signal rather than decoration: a player who
   * cannot hear it has no idea the night has moved on. Until v0.5 the only
   * control was the pause menu's mute, which is all or nothing.
   */
  volume: number
}

export const SENSITIVITY_RANGE = { min: 0.4, max: 2, step: 0.05 }
export const FIELD_OF_VIEW_RANGE = { min: 55, max: 85, step: 1 }
/** Down to nothing, because somebody may want the flat silent and still played. */
export const VOLUME_RANGE = { min: 0, max: 1, step: 0.05 }

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function defaultSettings(): Settings {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  return { headBob: !reduced, sensitivity: 1, fieldOfView: 62, volume: 1 }
}

export function loadSettings(): Settings {
  const base = defaultSettings()

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw === null) return base

    const stored = JSON.parse(raw) as Partial<Settings>
    return {
      headBob: typeof stored.headBob === 'boolean' ? stored.headBob : base.headBob,
      sensitivity: typeof stored.sensitivity === 'number'
        ? clamp(stored.sensitivity, SENSITIVITY_RANGE.min, SENSITIVITY_RANGE.max)
        : base.sensitivity,
      fieldOfView: typeof stored.fieldOfView === 'number'
        ? clamp(stored.fieldOfView, FIELD_OF_VIEW_RANGE.min, FIELD_OF_VIEW_RANGE.max)
        : base.fieldOfView,
      volume: typeof stored.volume === 'number' && Number.isFinite(stored.volume)
        ? clamp(stored.volume, VOLUME_RANGE.min, VOLUME_RANGE.max)
        : base.volume,
    }
  } catch {
    // Private browsing, a full quota, or a corrupted value. Defaults are fine,
    // and losing a preference is not worth breaking the game over.
    return base
  }
}

export function saveSettings(settings: Settings): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // As above. The setting still applies for this sitting.
  }
}

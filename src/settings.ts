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
  /**
   * How large the words are, as a multiplier on whatever size the browser is
   * already using.
   *
   * A multiplier rather than a size, so a player who has already turned their
   * browser's default up keeps that and this compounds with it. Setting a size
   * here would overrule a decision somebody had already made about their own
   * eyes.
   *
   * Every piece of text in the game is affected, because `src/styles.css` puts
   * this on the document root and everything else is in `rem`.
   */
  textScale: number
}

export const SENSITIVITY_RANGE = { min: 0.4, max: 2, step: 0.05 }
export const FIELD_OF_VIEW_RANGE = { min: 55, max: 85, step: 1 }
/** Down to nothing, because somebody may want the flat silent and still played. */
export const VOLUME_RANGE = { min: 0, max: 1, step: 0.05 }
/**
 * Up to double, down to a little under.
 *
 * The top is where it is because the longest thing the game shows, the advisory,
 * still fits a small laptop at twice the size. Below is bounded too: this is a
 * comfort setting, and text small enough to be unreadable is not comfort.
 */
export const TEXT_SCALE_RANGE = { min: 0.85, max: 2, step: 0.05 }

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function defaultSettings(): Settings {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  return { headBob: !reduced, sensitivity: 1, fieldOfView: 62, volume: 1, textScale: 1 }
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
      textScale: typeof stored.textScale === 'number' && Number.isFinite(stored.textScale)
        ? clamp(stored.textScale, TEXT_SCALE_RANGE.min, TEXT_SCALE_RANGE.max)
        : base.textScale,
    }
  } catch {
    // Private browsing, a full quota, or a corrupted value. Defaults are fine,
    // and losing a preference is not worth breaking the game over.
    return base
  }
}

/**
 * Puts the text size on the document, which is the only place it works.
 *
 * Separate from the session, and called before one exists, because the advisory
 * and the title screen are drawn before anything starts a game. v0.8.2 set this
 * inside `applySettings` and nowhere else, so a player who had turned the type
 * up got it everywhere except on the two screens they meet first, one of which
 * is the content advisory. The suite did not catch it: every check that reads a
 * font size is already inside a session by the time it looks.
 *
 * On the root element rather than the mount, because `rem` resolves against the
 * root and nothing else. See the `html` rule in src/styles.css.
 */
export function applyTextScale(scale: number): void {
  document.documentElement.style.setProperty('--text-scale', String(scale))
}

export function saveSettings(settings: Settings): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // As above. The setting still applies for this sitting.
  }
}

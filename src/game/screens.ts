/**
 * Who has the screen and the pointer right now.
 *
 * By the end of the game five things want it: the overlay, a memory, the opening
 * beat, the desk scene, and the ending. Plus the pause menu, which may interrupt
 * any of them and must never be interrupted by one, because Hard Rule 9 says the
 * support resources are reachable at all times.
 *
 * All of that used to be four separate places in the session that had to agree
 * with each other. It is one place now, because the number of things contending
 * for it is about to double.
 *
 * The two calls are `hold`, meaning something other than the flat is on screen
 * now, and `release`, meaning give it back. Both are safe to call more than once.
 */

import type { Player } from '../player/controller.ts'
import type { Hud } from '../ui/hud.ts'
import type { GoalLine } from '../ui/goal.ts'
import type { Menu } from '../ui/menu.ts'
import type { Settings } from '../settings.ts'

export interface ScreensConfig {
  player: Player
  hud: Hud
  goalLine: GoalLine
  menu: Menu
  settings(): Settings
  applySettings(next: Settings): void
  /**
   * Whether something is deliberately holding the screen.
   *
   * Every one of those things releases the pointer on purpose, and a released
   * pointer is normally what opens the pause menu. Without this, opening a
   * document would pause the game.
   */
  isBusy(): boolean
  /**
   * Hard Rule 9, and the advisory's promise that the flat will wait.
   *
   * Called with true when the pause menu opens and false when it closes, so
   * whatever beat is on screen can hold where it is. Pausing used to leave the
   * beats running: the ending took about six seconds to get from the voicemail
   * to the support resources underneath the menu, and then replaced the menu
   * with them. A player who paused during the hardest part of the game had it
   * played at them anyway.
   */
  holdBeats(held: boolean): void
}

export interface Screens {
  /** Something other than the flat is on screen. Hides the HUD, drops the pointer. */
  hold(): void
  /** Hands the flat back. Does nothing while the player is paused. */
  release(): void
  /** Hard Rule 9. The pause menu, from anywhere, at any time. */
  pause(): void
  isPaused(): boolean
}

export function createScreens(config: ScreensConfig): Screens {
  const { player, hud, goalLine, menu } = config

  /** Whether the player was using the mouse when the last beat took the screen. */
  let heldThePointer = false

  function showPauseMenu(): void {
    hud.setVisible(false)
    menu.showPause([
      {
        label: 'Resume',
        onSelect: (): void => {
          menu.close()
          // Before the pointer, so a beat picks up exactly where it stopped
          // rather than a frame into the flat coming back.
          config.holdBeats(false)
          player.lock()
        },
      },
      {
        label: 'Comfort',
        onSelect: (): void =>
          menu.showComfort(config.settings(), config.applySettings, showPauseMenu),
      },
      {
        // Hard Rule 9. Always reachable, from anywhere, without unloading the flat.
        label: 'Support resources',
        onSelect: (): void => menu.showResources(showPauseMenu),
      },
    ])
  }

  /**
   * Opens the pause menu, once.
   *
   * Escape both reaches this directly and releases the pointer, and releasing
   * the pointer is the other thing that reaches it, so one keypress arrives
   * twice. Rebuilding the menu in between replaces the buttons under the
   * player's cursor, which is how a click on "Support resources" can land on a
   * node that no longer exists. Going back from a submenu calls `showPauseMenu`
   * rather than this, because there the menu being open is the point.
   */
  function pause(): void {
    if (menu.isOpen()) return
    // Hard Rule 9. Whatever is on screen stops where it is, so the menu is not
    // a thing the game plays on past.
    config.holdBeats(true)
    showPauseMenu()
  }

  function release(): void {
    // Not if the player has paused in the meantime. Escape out of a memory and
    // straight into the pause menu, and the memory's own release would arrive a
    // beat later and take the pointer back, closing the menu under them.
    if (menu.isOpen()) return

    // Nor if something else has taken the screen in the meantime. Every beat
    // releases a second or so after it ends, once its fade has run, and the
    // ending starts from a flag that the last of those beats is what sets. So
    // the last memory in the game routinely finishes fading out while the
    // ending is already running, and this used to put the HUD back on top of it
    // and take the pointer away from the one list the player has to click.
    if (config.isBusy()) return

    hud.setVisible(true)
    goalLine.setVisible(true)

    // Only give the pointer back to somebody who had it. Asking for a lock
    // without a gesture behind it fails, and for a player using the keyboard
    // that is every single time an overlay closes: a console error each, and a
    // browser prompt on some of them, for a lock they never wanted.
    if (heldThePointer && !player.isLocked()) player.lock()
  }

  // Escape releases the pointer, and the browser owns that key, so the pause menu
  // hangs off the unlock rather than off a key handler that could be missed.
  player.onLockChange((locked) => {
    if (locked) {
      // Hard Rule 9. A lock that arrives while the menu is up is a request made
      // just before the player paused, resolving just after: closing an overlay
      // asks for the pointer back, and pressing Escape in the moment before the
      // browser answers used to take the pause menu away again. Honour the pause
      // rather than the stale request.
      if (menu.isOpen()) {
        player.unlock()
        return
      }

      hud.setVisible(true)
      goalLine.setVisible(true)
      return
    }

    goalLine.setVisible(false)
    if (config.isBusy()) return
    pause()
  })

  return {
    hold(): void {
      // Remembered here rather than asked for later, because by the time the
      // beat releases the pointer has been gone for a while either way.
      heldThePointer = player.isLocked()

      hud.setVisible(false)
      goalLine.setVisible(false)
      player.unlock()
    },

    release,
    pause,

    isPaused(): boolean {
      return menu.isOpen()
    },
  }
}

/**
 * Finding a Chromium, without hardcoding one.
 *
 * The verification scripts this suite came from each carried a literal
 * `executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'`, and
 * that path is why they only ever ran on one machine.
 *
 * The reason they needed it is worth writing down, because it will happen again
 * the next time either side moves. `playwright-core` pins a browser revision and
 * refuses to launch anything else it finds: version 1.62 wants chromium 1234.
 * A sandbox that ships its own browser will not generally have that revision, so
 * `chromium.launch()` with no path fails there. In CI the opposite is true:
 * `npx playwright install chromium` puts exactly the right revision exactly
 * where playwright looks, and a hardcoded path would point at nothing.
 *
 * So neither answer works everywhere and the resolution has to be ordered:
 *
 * 1. `SISPR_CHROMIUM`, for anybody who knows better than this file.
 * 2. `$PLAYWRIGHT_BROWSERS_PATH/chromium`, which sandboxes that pre-install a
 *    browser tend to provide as a stable symlink to whichever revision they
 *    actually have. Revision-independent by construction.
 * 3. Nothing, and let playwright-core find the browser it installed itself.
 *
 * `playwright-core` rather than `playwright` on purpose: it never downloads a
 * browser during `npm install`, so adding it does not fight an environment that
 * has already provided one.
 */

import { accessSync, constants } from 'node:fs'
import { join } from 'node:path'

import { chromium, type Browser, type Page } from 'playwright-core'

/**
 * The viewport every check runs at, so a failure is reproducible.
 *
 * Small on purpose, and it is the single biggest thing keeping this suite inside
 * its time budget. Software rasterisation costs per pixel, and every
 * `page.evaluate` queues behind a frame: at 960x600 one round trip takes about
 * 533ms, at 480x300 about 166ms, and here about 97ms. A single sort is roughly
 * seventeen round trips, so the whole suite moves by that factor.
 *
 * 1.6 is the same aspect ratio as 960x600, so the camera frames exactly what it
 * frames at any other size and nothing about aiming changes. This is only
 * affordable because the suite makes no claims about pixels: there are no golden
 * images, deliberately, since two software rasterisers do not agree pixel for
 * pixel and a suite that fails on a driver update teaches people to ignore it.
 */
export const VIEWPORT = { width: 320, height: 200 }

function isExecutable(path: string): boolean {
  try {
    accessSync(path, constants.X_OK)
    return true
  } catch {
    return false
  }
}

/**
 * Where the Chromium is, or null to let playwright-core decide.
 *
 * Exported so a test can assert the order rather than take it on trust.
 */
export function findChromium(env: NodeJS.ProcessEnv = process.env): string | null {
  const override = env['SISPR_CHROMIUM']
  if (override !== undefined && override !== '') return override

  const provided = env['PLAYWRIGHT_BROWSERS_PATH']
  if (provided !== undefined && provided !== '' && provided !== '0') {
    const symlink = join(provided, 'chromium')
    if (isExecutable(symlink)) return symlink
  }

  return null
}

/**
 * One browser for a whole test file.
 *
 * Software rasterisation is the only thing available headless, and it has to be
 * asked for twice: `--use-gl=swiftshader` picks it, and
 * `--enable-unsafe-swiftshader` stops Chromium refusing to use it for WebGL.
 * Without both, the canvas comes up and never draws, which reads exactly like a
 * game that failed to start.
 */
export async function launch(): Promise<Browser> {
  const executablePath = findChromium()

  try {
    return await chromium.launch({
      ...(executablePath === null ? {} : { executablePath }),
      args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
    })
  } catch (error) {
    const where = executablePath === null
      ? 'playwright-core\'s own installed browser (run: npx playwright install chromium)'
      : `${executablePath}, chosen by ${process.env['SISPR_CHROMIUM'] === undefined ? 'PLAYWRIGHT_BROWSERS_PATH' : 'SISPR_CHROMIUM'}`
    throw new Error(
      `Could not launch Chromium from ${where}.\n`
      + 'Set SISPR_CHROMIUM to a Chromium binary to override. See e2e/browser.ts.\n'
      + `Underlying error: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

/**
 * A page that fails the test on an uncaught error rather than swallowing it.
 *
 * A game that throws in a requestAnimationFrame callback carries on looking
 * almost right, so a check that only reads the DOM can pass over a broken frame
 * loop. Anything the page throws is collected here and the caller asserts the
 * list is empty at the end.
 */
export async function newPage(browser: Browser): Promise<{ page: Page, errors: string[] }> {
  const errors: string[] = []
  const page = await browser.newPage({ viewport: VIEWPORT })
  page.on('pageerror', (error) => errors.push(error.message))
  return { page, errors }
}

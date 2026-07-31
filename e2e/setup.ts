/**
 * Builds the game and serves it, once, for a whole verification run.
 *
 * Passed to the test runner as `--test-global-setup`, so the build and the
 * server happen a single time no matter how many files run. Each test file
 * launches its own browser in a `before` hook: a browser costs a second or two
 * and files run in separate processes, so there is nothing to share there
 * anyway, and asking for `--test-isolation=none` to save it would trade a real
 * guarantee for a small one.
 *
 * **The build is unconditional.** It takes about a second and a half, and it
 * removes an entire class of confusion in which the suite passes against a
 * bundle from two commits ago. A verification pass that can test stale code is
 * not a verification pass.
 *
 * The URL reaches the tests through an environment variable rather than an
 * export, because the runner starts each file in its own process.
 */

import { build, preview, type PreviewServer } from 'vite'

let server: PreviewServer | null = null

export async function globalSetup(): Promise<void> {
  await build({ logLevel: 'warn' })

  // Port 0 so the operating system picks a free one. A fixed port turns two
  // concurrent runs, or one run and a forgotten `vite preview`, into a failure
  // that looks like a game bug.
  server = await preview({ preview: { port: 0, strictPort: false }, logLevel: 'warn' })

  const url = server.resolvedUrls?.local[0]
  if (url === undefined) throw new Error('the preview server started without a local URL')

  process.env['SISPR_BASE'] = url
}

export async function globalTeardown(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    if (server === null) {
      resolve()
      return
    }
    server.httpServer.close((error) => (error === undefined ? resolve() : reject(error)))
  })
  server = null
}

/** Where the suite should point a browser. Throws rather than guessing. */
export function base(): string {
  const url = process.env['SISPR_BASE']
  if (url === undefined || url === '') {
    throw new Error(
      'SISPR_BASE is not set, so the game is not being served. Run the suite through '
      + '`npm run verify`, which passes --test-global-setup=e2e/setup.ts.',
    )
  }
  return url
}

# Verification

What is checked by driving a real browser, what is not, and what a green run does
not mean.

`npm test` covers pure logic and covers it well. What it cannot cover is anything that is an
interaction between two subsystems over time, and that is where every bug found in v0.4, v0.5 and
v0.6 actually lived:

- `E` during a beat both ended the beat and examined whatever the crosshair was on
- the pointer got re-locked during the ending, because a memory releases about 900ms after it ends
  and the ending starts inside that window
- hovering an option armed Enter on a choice nobody had read
- Escape opened the pause menu twice per keypress
- the prompt live region re-announced itself every frame

None of those is expressible as a unit test. All of them were found by playing the game, with
scripts that lived in a temporary directory and died with it. This suite is those scripts, kept.

## Running it

```
npm test              pure logic, sub-second
npm run verify        the browser suite, a few minutes
npm run verify:full   the whole game from the front door, about eight minutes
```

`npm run verify` builds the game, serves it, and drives it. There is nothing to set up: the browser
is resolved by `e2e/browser.ts`, which tries `SISPR_CHROMIUM`, then a chromium under
`PLAYWRIGHT_BROWSERS_PATH`, then whatever playwright-core installed for itself. In CI that last one
is what runs, after `npx playwright install chromium`.

## What a green fast suite does not mean

**It is not evidence that the game reaches act 2 or act 3.** Most checks jump in with `?act=2` or
`?act=3`, because sitting through act 1 for every one of them would put the suite out of reach of
running on a push. `?act=` deliberately sets no flag an earlier act was supposed to set, so the flat
it produces is the flat that act really begins in, which makes it a fair starting line and not a
cheat. But a starting line is not a road.

One check plays act 1 to its gate honestly, packing ten objects one at a time through the real verb
table. Everything else about getting from the front door to dawn is proved by `verify:full`, which
runs on a schedule rather than on a push.

**It says nothing about how the game looks.** There are no golden images, deliberately: two software
rasterisers do not agree pixel for pixel, and a suite that fails on a driver update teaches people to
ignore it. Use `e2e/tools/look.mjs` and your own eyes.

That includes layout, which is not the same claim as "the type got bigger". A suite can measure a
font size and a scroll width; it cannot see that a line has crept under the goal text or that a card
now ends half a sentence early. `e2e/tools/read.mjs` photographs every screen with words on it at a
given text size, and both ends of `TEXT_SCALE_RANGE` are read by eye before a text change ships. Two
of the four bugs below were found that way and neither was expressible as an assertion until after
somebody had seen it.

**The suite runs at 320x200.** A software rasteriser charges by the pixel twice over, once to draw
and once to read back, so the viewport is as small as the game will tolerate. Any check about layout
has to say so and set its own viewport: at 320x200 with the text size at 2 the document panel is
smaller than its own footer, which is a fact about the harness and not about the game.

**It says nothing about performance.** A software rasteriser cannot produce a frame-rate baseline.

## What is checked

| File | Checks | What it protects |
|---|---|---|
| `e2e/opening.test.ts` | 4 | The advisory, the title screen, the section 8.1 beat, and the shape of the dev handle |
| `e2e/acts.test.ts` | 4 | Each act's gate and its discovery chain, and the section 8.3 desk scene |
| `e2e/ending.test.ts` | 3 | The section 8.4 sequence, take-one-thing, and landing on the resources |
| `e2e/access.test.ts` | 11 | v0.5's guarantees plus v0.8's: no pointer needed, focus, announcements, the volume and text-size controls, and the orientation key |
| `e2e/rule9.test.ts` | 8 | **Hard Rule 9 from eight different moments**, including mid-ending |
| `e2e/save.test.ts` | 3 | The checkpoint round trip, and what it refuses to restore |
| `e2e/full/playthrough.test.ts` | 1 | The whole game, from the front door, with no dev parameters |

`e2e/tools/` holds three things that are explicitly **not** tests. They assert nothing and never fail.
`look.mjs` puts a frame on disk from any room and angle; `reach.mjs` reports how visible an object is
from a grid of standing positions; `read.mjs` photographs every screen that has words on it at a
given text size. All three exist because looking is how several of the hardest bugs were found, and
because a measurement from one spot measures its own choice of spot.

`read.mjs` earned its place immediately. See "what the suite found" below: v0.8's own suite passed
while the text size was reaching neither the advisory nor the title, and while the instruction for
closing a document was scrolling off the bottom of it.

## Rules the suite holds itself to

**Nothing waits for a duration.** Headless Chromium on a software rasteriser renders at about two
frames a second and the engine clamps `delta`, so wall-clock and game time come apart by roughly five
to one. Any number tuned against one machine is a coin flip on another. Every wait is
`page.waitForFunction` on something the page can be asked about, and where a check needs elapsed
*game* time it winds the clock through the dev handle instead of sleeping.

There are exactly two exceptions and both carry their reason in a comment: one in `rule9.test.ts`
and one in `access.test.ts`. Both are the same shape, and it is the shape that has no alternative:
the claim is that *nothing* happens, and nothing happening has no event to wait on. `e2e/tools/` is
outside this rule, because a tool that puts a frame on disk has to let the frame arrive.

**Nothing touches the mouse.** `e2e/game.ts` drives the game entirely by keyboard, so every check
exercises the keyboard path rather than only the accessibility one. `access.test.ts` instruments
`page.mouse` and asserts the count is zero.

**Every check has been made to fail.** A check that has never failed is a check nobody has tested.
Each one in this suite was proved by breaking the thing it protects, watching it fail, and putting it
back. Six were found to be worthless that way and were rewritten:

- the act 3 chain check walked the chain in the right order but never asserted the order was
  *enforced*, and passed happily with the gate removed
- the checkpoint check asserted a storage key was absent that had never been present, and passed with
  `clearCheckpoint()` commented out
- the chooser-preselection check could not be broken at all, because `highlight()` is never called
  when the chooser opens, which is *why* nothing is preselected: the break had to be built before the
  check meant anything
- the playthrough's phone step threw away the result of aiming, so a step that never found the phone
  looked exactly like a step that ran
- the playthrough's walk read `Take` as if it were `Examine` and spent the second pass collecting the
  flat instead of looking at it, which left the phone unplugged three rooms later
- the volume check took the first Comfort slider, which is look sensitivity, and read a working
  volume control as broken

Three of those six were only visible because a check was made to explain itself rather than merely
pass or fail. Instrumentation is part of the method, not a debugging detour.

A seventh, from v0.8, is a different failure and worth keeping separate: the text-size check was not
wrong, it was *narrow*. It proved the setting changed the type, from inside a session, and every word
of that was true while the setting reached neither of the two screens drawn before a session exists.
A check can be honest about what it measures and still leave most of the claim unmeasured. The
lesson is the one about scope rather than the one about rigour: ask where the thing you are checking
is *not* in force, and go and look there.

**A check that cannot fail is worse than no check.** Three of v0.8's checks would have passed
vacuously in some state, so each one asserts its own precondition first and says so: the through-a-
wall check counts how many things it actually hid and fails at zero, the document check asserts the
note really is taller than the panel before asking whether the hint survived, and the orientation
scan asserts nothing is being pointed at before parsing a line that assumes it.

**One place knows how to drive the game.** `e2e/game.ts`. The scripts this suite came from each
re-invented `state()`, `press()` and `pack()` with small differences, and that duplication, not the
scripts, is what makes a harness rot.

## What the suite found

Four real bugs in the game, all invisible to unit tests, and seven checks of my own that did not
check what they said they did. The second number is the more useful one: it is what the discipline
below actually costs and actually buys.

**`v0.7.5`: the act did not turn over at the chime.** The act was evaluated only after a sort or an
examine, because those are the only two things a player does that can open a gate. The charge is the
exception: it fills while nobody is doing anything. So the chime rang into a flat that was still act
2, with act 2's lighting, no bag by the door, and a checkpoint saying act 2, until the player
happened to touch something. Standing still after the chime left the night stuck.

**`v0.7.11`: the pause menu did not pause.** Every beat ran on plain `setTimeout` with nothing
holding it. Pausing during the ending got about six seconds from the voicemail to the support
resources underneath the menu, and then replaced the menu with them. The advisory promises "You can
pause any time. The flat will wait." The menu itself says the flat will wait. Neither was true.

**`v0.8.10`: the text size did not reach the advisory.** The custom property was set in
`applySettings`, which runs when a session starts. The advisory and the title screen are drawn before
one exists, so a player who had turned the type up got it everywhere except the two screens they meet
first, one of which is the content advisory. Found by `read.mjs`, not by the suite: the check that
was supposed to protect this measures a font size from inside a session, so it was true and useless
at the same time. It now sets the setting, reloads, and reads the advisory before pressing anything.

**`v0.8.12`: at the largest text size the way out of a document scrolled off the bottom of it.**
Lena's note at twice the size is half again as tall as the panel, and the last two things in it are
her signature and the line "Escape to put it down". Escape still worked. But the only on-screen
instruction saying so was below the fold for exactly the player who had turned the type up to read
it, and there was nothing to indicate the note continued. The hint is now pinned to the bottom of the
panel with the text fading out underneath it, so the way out is always visible and the fade says
there is more. Also found by looking rather than by asserting.

## What is known and not fixed

**The reach raycast has never been stopped by a wall.** `createTargeting` is handed the props and the
furniture and never `flat.group`, so `Tab` has always been able to land on an object through a wall.
Standing in the entry hall, six objects in three other rooms are inside the 2.4-metre reach. This
contradicts `src/interaction/reach.ts`'s own header, which says cycling "offers nothing the player
could not already have found by turning their head".

It is v0.5's, not v0.8's, and fixing it means changing what the crosshair can hit for the mouse as
well, because the hit loop deliberately passes through anything that is not a known object. Rolling
that into an access pass would be a quiet change to how the whole game aims. So v0.8's orientation
key works around it instead: it filters what it names by `flat.roomAt`, and
`e2e/access.test.ts` proves that at all nine standing positions in the entry hall, using the floor
plan rather than the game's own answer. Removing the filter fails the check with the six names it
would otherwise have said out loud.

**`setMuted` in `src/audio/audio.ts` has had no caller since v0.1.22**, though its own comment
describes pausing as going quiet. Pausing currently leaves the rain running. That is a decision about
how the game feels when paused rather than a defect, and it is still open.

## What was dropped

The suite came from 57 scripts. Twenty-odd earned a place; the rest were deleted, and that was the
point of the pass rather than a shortcut through it.

A script earned a place only if it would **fail** when something broke, rather than merely print, and
if what it checked was not already covered by a unit test. Everything else was a one-shot probe
written to answer a single question during development: `probe.mjs`, `probe2.mjs`,
`probe-open3.mjs`, `hit.mjs`, `res.mjs`, `pos.mjs`, `menuhit.mjs`, `openingdebug.mjs` and their
neighbours. Keeping them would have been hoarding, and a suite nobody trusts is worse than no suite.

Several were dropped for the better reason that the thing they investigated is now checked properly
somewhere else: `drawer.mjs` and `kitchenwalk.mjs` became the nine-position scan inside
`e2e/game.ts`'s `aimAt`, and `opening.time.mjs` became a wait on state rather than a measurement of
wall clock.

## Adding a check

1. Put it in the file for the thing it protects, or start a new one if there is no such file.
2. Drive the game through `e2e/game.ts`. If you need something it does not do, add it there rather
   than reaching into the page from a test, or the next file will reach into the page differently.
3. Wait on state, never on a duration. If you genuinely cannot, say why in a comment.
4. **Break the thing it protects and watch it fail.** Then put it back. If it did not fail, the check
   is not checking what you think it is, and that has already happened twice here.

# Someone Is Still Paying the Rent

A first-person narrative game built in Three.js. One flat. One night. One friend.

Eight months after his best friend Niko died, the player spends one last night in his flat,
packing his life into boxes before the lease ends.

## Status

The game is finishable. Advisory, title, front door, three acts, the ending, the support
resources. Around forty minutes if you look at everything.

What exists today:

- Every piece of narrative content from the lore bible, extracted into typed data under `data/`.
- TypeScript definitions for the object schema, memory fragments, keystone texts, and state flags.
- A content validator that enforces the ten hard rules in section 0 of the bible, plus the
  house writing style, and fails CI on any violation.
- The content advisory screen, a title screen, and a pause menu that reaches the support
  resources from anywhere, which is what Hard Rule 9 requires.
- The flat itself: six rooms built from `data/floorplan.json`, furniture, all fifty-one objects
  placed on named surfaces, per-room lighting, rain, and procedural audio.
- Walking, looking, examining, and reading, with second-look text resolving against the state
  flags.
- The opening beat from section 8.1: black, the key in the lock, the title card, and a fade up.
- Sorting, per section 4.1. Carry one thing at a time to the three boxes and choose SHIP TO
  LENA, DONATE, or LET GO. No scoring, and no undo.
- All twelve memory fragments from section 6, every one of them reachable. Object, then thought,
  then memory, with the room ducking underneath.
- Both act gates. Act 1 wants ten objects sorted and the phone found; act 2 wants the charger, the
  phone plugged in, and four real minutes.
- Act 2's middle layer: the junk drawer gives up the charger, the under-bed box opens onto the
  Mira thread, and the vinyl shelf gives up the demo.
- The Low Orbit demo, playable on his record player. Unmixed, drums too loud, alive.
- Act 3's chain: the phone thread, the desk scene at section 8.3, your bag by the door, and the
  string lights on the balcony, which are the one thing in the flat you can leave better than you
  found it.
- The ending at section 8.4: the box seals, you take one thing out of it, the voicemail plays, the
  key goes down, the door shuts, and the building is there in the morning.
- An auto-checkpoint written when an act begins, offered from the title screen as
  "Continue from act 3", and cleared when the night is over.

### Act 3 is a chain, not a sandbox

Section 4.5 says so directly, and each link is what unlocks the next.

| Beat | Opens when | Sets |
|---|---|---|
| The phone thread | Act 3 begins. `phone_dead` carries `text_from_act: 3` | `thread_read` |
| The desk scene | The thread has been read | `desk_done` |
| Your bag | Act 3 begins. `pc_bag` carries `act_min: 3` | `receipts_found` |
| The ending | `desk_done` and `receipts_found` both hold | Nothing. It is the end |

The flat stays walkable and sortable underneath all of it. The desk and the bag can be reached in
either order, which is why neither of them starts the ending: `src/game/ending.ts` watches for the
condition instead, the way `src/game/charge.ts` watches the four minutes.

### What ends the game

Act 3 has no `gate_to_next`, because there is no act 4, and the validator fails if one is added.
What it has is `ends_when`, the same shape evaluated by the same `evaluateGate`, required on act 3
and forbidden anywhere else.

There is no sorting quota on it. Whatever is still in the flat at that point is what the player
decided to leave, and the game holds no opinion about it.

### Hard Rule 3 is a scene

The desk scene is the one place in this game where an absence is the payoff. Five blocks, authored
in `data/scenes.json`, ending on one sentence, and nothing follows it but a stage direction saying
that nothing follows it.

The lexicons in the validator already refuse the words. The shape is checked separately, because a
reveal appended after the payoff needs no forbidden vocabulary at all: the validator requires that
last line verbatim, allows exactly one stage direction after it, and fails on a sixth block. There
is no note in this game and none may ever be added, as content or as cut content.

### The last shot, and Hard Rule 10

`src/world/exterior.ts` builds its own scene, its own camera, and its own dawn lighting, because
the flat's lighting is authored in candela for a dark room and its `applyAct` is typed `1 | 2 | 3`.

The framing is the content. The rule is that nothing on any elevated point may carry dark
connotation, and a shot looking up at a balcony from a pavement breaks it however carefully the
words are chosen. So the height is not legible: a 17 degree lens level with the balcony, a camera
that only translates so no vertical leans, under two storeys in frame with the wall running off the
top and the bottom, no roofline, no ground, and the sky beside the building rather than above it.

His window is dark. If the player left the string lights on they are burning, and that is the only
thing in the picture anybody decided.

### Nothing appears before it has been found

An object needs two things to be in the flat: `act_min`, the act it belongs to, and `hidden_until`,
what has to have happened inside that act first.

| Objects | Appear when |
|---|---|
| Most of them | Their act |
| `hoodie_mira`, `photobooth_strip`, `mira_draft`, `dad_lighter` | The under-bed box is opened |
| `demo_cdr` | The vinyl shelf gives up its second look |
| `pc_bag` | Act 3 begins |

`hidden_until` is a flag reference in the same namespace second looks use, so the validator resolves
it for free and refuses anything unreachable: a condition that cannot be met, an object hidden
behind something that appears later than it does, or a second look the named object does not have.

The rule lives in `src/rules/reveal.ts` and is pure. `src/world/placement.ts` holds back what it says
to hold back and reveals it later on request.

### Three decisions the bible does not make

Section 4.2 lists three verbs and does not say which wins. This build resolves it as: **Take beats
Read, once the thing has been read.** Nine of the eleven keystone objects are sortable, and with
Read winning outright they could be read all night and never packed. The cost is that a packable
document is read once. You can stand there and look at it as long as you like, and once you have,
you have to decide what happens to it.

**The record player is not sortable**, which departs from section 4.1's "every portable object can
be sorted". Examining it is what puts the demo on and takes it off again, and a sortable object
stops offering Examine the moment it has been examined once. It is plugged in, and it is the only
thing in the flat that makes a sound he made.

**The junk drawer uses a second look to open.** Section 4.4's second looks are reframes, and a
drawer coming unstuck is not a reframe, but it is mechanically the same thing: one object, two
readings, gated on a condition. The flag namespace gained `act:2` to say so rather than growing a
parallel system for it.

**The desk gets a second look, and the scene runs once.** The authored examine text is a deferral,
"Later", and after section 8.3 has played that is no longer true. So the scene fires once, on the
first look after the thread is read, and every look after it gets a second-look line about a desk
that has been gone through. The line says nothing whatever about what was not in the drawers.

**The key beat reads the state rather than assuming a bowl.** `key_bowl` is sortable, so by the
ending it may be taped inside a carton. There are two versions of the sound and no words in either:
with the bowl, the bowl rings under the key; without it, the key goes down on something bare and
nothing answers.

## Controls

| Key | What it does |
|---|---|
| `W` `A` `S` `D` | Walk |
| Arrow keys, or the mouse | Look |
| `Tab`, `Shift+Tab` | Step the crosshair round what is within reach |
| `E`, or click | Examine, read, take, or sort whatever the crosshair is on |
| `Escape` | Out of whatever is on screen, then the pause menu |

The arrows used to be a second set of movement keys and looking was mouse only,
which meant the game could not be played at all without a mouse: aiming the
crosshair is the only verb section 4.2 has. Rebinding them costs anybody who was
walking with the arrows their habit, and it is still right.

Holding an arrow starts slow and speeds up, so a tap is a fine adjustment and a
hold is a turn. `Tab` exists because even that is not enough: `junk_drawer` is a
thirty-millimetre panel visible from about a third of one percent of the angles
in the kitchen, and nobody should have to land on it by hand.

**`Tab` is not an objective marker**, and section 8.2 forbids one outright. It
reaches only what the raycast already reaches, and every candidate is confirmed
by firing the real ray before the camera settles on it, so it can never point at
anything the player could not have found by turning their head where they are
standing. It removes the precision from searching, not the searching.

## Accessibility

- Playable with the keyboard alone, start to finish. Nothing needs a pointer,
  including the advisory, the title screen, the sort chooser and the
  take-one-thing list at the ending.
- The prompt, the carry line and the goal line are live regions, so what the
  crosshair is on, what is in your hands and what the game wants are all spoken.
  The reticle is not: it is a dot.
- Every beat that takes the screen reads itself out a line at a time, in step
  with the pacing. That is why `src/ui/sequence.ts` keeps a separate announcer
  rather than making the beat a live region: all the lines are in the document
  from the start so the block cannot jump, and a live region would announce the
  desk scene's last line minutes before the scene reaches it.
- Opening a document moves focus into it and closing one puts focus back.
- A volume slider in Comfort, down to silence. The rain and the fridge run for
  the whole game and section 8.2's chime is a gate signal, so this is not a
  nicety.
- Head bob follows `prefers-reduced-motion` and can be switched off regardless.

Two things it does not do. There is no text scaling yet. And nothing helps a
player who cannot see find their way across a room: `Tab` solves aiming, not
navigation, and audio beacons or spoken room descriptions would be a design
conversation rather than a setting.

## Requirements

Node 24. The version is pinned in `.nvmrc`.

```
nvm use
npm install
```

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server on port 5173 |
| `npm run build` | Production build into `dist/` |
| `npm run typecheck` | `tsc --noEmit` in strict mode |
| `npm run validate` | Content validator: schema, references, hard rules, writing style |
| `npm test` | Node's test runner over the pure logic. No dependencies |
| `npm run verify` | Drives a real browser through the game. A few minutes |
| `npm run verify:full` | The whole game from the front door, no shortcuts. About twenty minutes |

`npm run validate` runs the validator directly through Node, with no loader and no
dependencies. Node 24 strips TypeScript types natively, which is why every type annotation in
this repository has to be erasable: union types and `const` objects instead of `enum`, no
`namespace`, no constructor parameter properties. The `erasableSyntaxOnly` compiler flag
enforces this at typecheck time, so a change that would break the validator fails the build
first.

`npm run verify` builds the game, serves it, and plays it. See
[`docs/VERIFICATION.md`](docs/VERIFICATION.md) for what it checks, what it deliberately does not,
and how to add a check. The short version of the caveat: **most of its checks jump into an act with
a dev parameter, so a green run is not evidence that the game reaches act 2 or act 3.** Only
`verify:full` proves that, and it runs on a schedule rather than on every push.

## Dev parameters

`?room=<id>` starts the camera in the middle of that room rather than at the front door, using the
room ids in `data/rooms.json`. `?yaw=<degrees>` turns it clockwise from north and
`?pitch=<degrees>` tilts it, negative looking down.

`?act=2` or `?act=3` starts in that act, with its lighting, its rain, and its objects. What it does
not do is reveal anything hidden behind a discovery, or set a flag an earlier act was supposed to
set, because that is the whole point of hiding it. Starting in act 3 puts you in a flat where the
thread is readable and the desk still says "Later", which is exactly where the act begins. To look
at the Mira thread or the desk scene for content review, set the flag it waits on through the dev
handle.

Any of these also sets the session to dev mode, which skips the opening beat. A headless pass
inspecting the flat should not have to sit through the front door.

They exist so the flat can be screenshotted in a headless browser without pointer lock, and they
are how the verification pass checks that each room reads the way `data/rooms.json` says it
should. `?room=bedroom&yaw=180&pitch=-28` looks at the bed.

Any of them also attaches `__dev` to the canvas. That started as a console convenience and is now
what `npm run verify` drives the game through, so it is load-bearing: `e2e/opening.test.ts` asserts
its shape, and removing a field from it fails there by name rather than as a dozen unrelated
timeouts elsewhere.

## Saves

One slot, in `localStorage` under `sispr.checkpoint`, written when an act begins. There is no
manual save and no way to rewind inside an act: sorting has no undo, and a save system that
quietly gave it one would take the weight out of the only decision the game asks you to make.

Reading it is deliberately unforgiving. A save whose version does not match the build is dropped
whole, object ids that no longer exist in `data/objects.json` are discarded rather than restored,
and `sorted_count` is recomputed from the objects rather than believed. A save that half-restores
is worse than no save at all, because it looks like it worked. The version is at 2, so v0.3
checkpoints are dropped on read: the state grew a field for the object taken at the end.

The checkpoint is cleared when the night finishes. A title screen still offering "Continue from
act 3" would be offering to walk back into an ending that is over.

## Layout

```
data/       narrative content, the single source of truth for anything the player reads
docs/       the lore bible, the content rules checklist, the resources guide
scripts/    the content validator
src/
  content/  the loader, the schema, the state flags
  core/     renderer, scene, camera, render loop
  world/    the flat, furniture, props, placement, lighting, rain, textures, the exterior
  player/   the controller and collision
  interaction/  raycast targeting and the outline
  rules/    pure logic: gates, reveals, second looks, effects, sorting, verbs, pacing
  game/     the session, screens, carrying, acts, the charge, the ending, checkpoints
  ui/       hud, overlays, the chooser, and the four beats that take the screen
  audio/    synthesis and the mixer
tests/      node --test over the pure logic in rules/, player/, interaction/ and game/
```

Anything in `src/rules/` is pure and takes its data as arguments, so it runs under `node --test`
with no renderer and no browser. Anything that touches the DOM, the scene graph, or the clock
lives outside it. Two modules outside `rules/` follow the same rule for the same reason:
`src/player/look.ts` and `src/interaction/reach.ts` hold the arithmetic behind the arrow keys and
the `Tab` ring. Neither can be measured in a browser, because a headless run on a software
rasteriser renders at about two frames a second and the engine clamps `delta`, so wall-clock time
and game time come apart by a factor of five. Pulling the sums out found a real bug: the camera
turned nearly ten percent faster at fifteen frames a second than at sixty.

Four things take the screen: the opening beat, a memory, the desk scene, and the ending. They look
nothing like each other and are the same mechanism underneath, so the mechanism is
`src/ui/sequence.ts` and each of them is a render function over it. It owns the timers, the fade,
the release callback, and the rule that Escape always works.

Who has the pointer and the HUD is `src/game/screens.ts`, in one place rather than four that have
to agree. Its two calls are `hold`, meaning something other than the flat is on screen, and
`release`, meaning give it back. `release` refuses while the pause menu is up or while something
else has taken the screen, because every beat releases a second after it ends and the next one is
routinely already running by then.

Narrative lives in data, not in code. Section 12 of the bible asks for this directly, and it is
what makes the validator possible: every player-facing string sits in a file the validator can
read.

## Content rules

Read `docs/CONTENT_RULES.md` before writing or generating any content for this project. It
carries the ten hard rules and the seven questions the game must never answer, in an operational
form, along with which of them the validator can check automatically and which need a human.

The short version: this game is about a suicide and it never depicts the act, the method, or the
death. It gives no cause and reaches no verdict. If you are adding content and you are not sure
whether something crosses a line, it does.

## No binary assets

There are none, by design. Geometry comes from Three.js primitives, textures are drawn to a
canvas at runtime, and audio is synthesised with the Web Audio API. Cloning the repository is
enough to run it.

## Conventions

Commit messages are `vX.N.A: <description>`, one version stamp per commit, patch incrementing.
Many small commits rather than a few large ones. No co-author, session, or model trailers.

No em-dashes and no emoji anywhere: source, docs, data, commit messages, examples. The validator
checks the tracked files, and the `commit-msg` hook checks the messages.

To install the hook:

```
git config core.hooksPath .githooks
```

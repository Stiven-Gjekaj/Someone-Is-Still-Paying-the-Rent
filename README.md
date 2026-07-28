# Someone Is Still Paying the Rent

A first-person narrative game built in Three.js. One flat. One night. One friend.

Eight months after his best friend Niko died, the player spends one last night in his flat,
packing his life into boxes before the lease ends.

## Status

Acts 1 and 2 are playable, start to finish. The build ends on the chime.

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
- All twelve memory fragments from section 6, eleven of which are now reachable. Object, then
  thought, then memory, with the room ducking underneath.
- Both act gates. Act 1 wants ten objects sorted and the phone found; act 2 wants the charger, the
  phone plugged in, and four real minutes.
- Act 2's middle layer: the junk drawer gives up the charger, the under-bed box opens onto the
  Mira thread, and the vinyl shelf gives up the demo.
- The Low Orbit demo, playable on his record player. Unmixed, drums too loud, alive.
- An auto-checkpoint written when an act begins, offered from the title screen as
  "Continue from act 2".

What does not exist yet: act 3. The phone thread, the desk scene, `pc_bag`, and the ending.

### Where the build stops, on purpose

The chime is the end. It plays, `phone_on` is set, a checkpoint is written, and **the act stays
at 2**, held there by `stop_after` in `src/game/acts.ts`.

Advancing would be worse than stopping. `phone_dead` carries `text_from_act: 3`, so entering act 3
makes the phone thread readable, and behind the thread are the desk scene that Hard Rule 3 is built
around and the ending. Reading the last thing Niko sent and then finding nothing after it is the one
failure this content cannot absorb. The gate itself is proven open by `tests/charge.test.ts`; only
the bound holds the night here.

### Nothing appears before it has been found

An object needs two things to be in the flat: `act_min`, the act it belongs to, and `hidden_until`,
what has to have happened inside that act first.

| Objects | Appear when |
|---|---|
| Most of them | Their act |
| `hoodie_mira`, `photobooth_strip`, `mira_draft`, `dad_lighter` | The under-bed box is opened |
| `demo_cdr` | The vinyl shelf gives up its second look |

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

`npm run validate` runs the validator directly through Node, with no loader and no
dependencies. Node 24 strips TypeScript types natively, which is why every type annotation in
this repository has to be erasable: union types and `const` objects instead of `enum`, no
`namespace`, no constructor parameter properties. The `erasableSyntaxOnly` compiler flag
enforces this at typecheck time, so a change that would break the validator fails the build
first.

## Dev parameters

`?room=<id>` starts the camera in the middle of that room rather than at the front door, using the
room ids in `data/rooms.json`. `?yaw=<degrees>` turns it clockwise from north and
`?pitch=<degrees>` tilts it, negative looking down.

`?act=2` or `?act=3` starts in that act, with its lighting, its rain, and its objects. What it does
not do is reveal anything hidden behind a discovery, because that is the whole point of hiding it.
To look at the Mira thread for content review, set the flag it waits on through the dev handle.

Any of these also sets the session to dev mode, which skips the opening beat. A headless pass
inspecting the flat should not have to sit through the front door.

They exist so the flat can be screenshotted in a headless browser without pointer lock, and they
are how the verification pass checks that each room reads the way `data/rooms.json` says it
should. `?room=bedroom&yaw=180&pitch=-28` looks at the bed.

## Saves

One slot, in `localStorage` under `sispr.checkpoint`, written when an act begins. There is no
manual save and no way to rewind inside an act: sorting has no undo, and a save system that
quietly gave it one would take the weight out of the only decision the game asks you to make.

Reading it is deliberately unforgiving. A save whose version does not match the build is dropped
whole, object ids that no longer exist in `data/objects.json` are discarded rather than restored,
and `sorted_count` is recomputed from the objects rather than believed. A save that half-restores
is worse than no save at all, because it looks like it worked.

## Layout

```
data/       narrative content, the single source of truth for anything the player reads
docs/       the lore bible, the content rules checklist, the resources guide
scripts/    the content validator
src/
  content/  the loader, the schema, the state flags
  core/     renderer, scene, camera, render loop
  world/    the flat, furniture, props, placement, lighting, rain, textures
  player/   the controller and collision
  interaction/  raycast targeting and the outline
  rules/    pure logic: gates, second looks, sorting, verbs, fragment pacing
  game/     the session, carrying, acts, checkpoints
  ui/       hud, overlays, the chooser, memories, the opening, menus
  audio/    synthesis and the mixer
tests/      node --test over everything in rules/ and game/save.ts
```

Anything in `src/rules/` is pure and takes its data as arguments, so it runs under `node --test`
with no renderer and no browser. Anything that touches the DOM, the scene graph, or the clock
lives outside it.

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

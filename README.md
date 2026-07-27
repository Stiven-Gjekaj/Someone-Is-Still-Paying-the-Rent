# Someone Is Still Paying the Rent

A first-person narrative game built in Three.js. One flat. One night. One friend.

Eight months after his best friend Niko died, the player spends one last night in his flat,
packing his life into boxes before the lease ends.

## Status

Act 1 is playable, start to finish. It ends where act 2 begins.

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
- All twelve memory fragments from section 6, nine of which are reachable in act 1. Object, then
  thought, then memory, with the room ducking underneath.
- The act 1 gate: ten objects sorted and the phone found. The light steps down and the rain gets
  heavier when it opens.
- An auto-checkpoint written when an act begins, offered from the title screen as
  "Continue from act 2".

What does not exist yet: act 2's unlocks, the phone charging, the desk scene, and the ending.

### The act boundary, on purpose

When act 1 ends, the flat does not repopulate. It keeps act 1's objects.

All four things the under-bed box is supposed to reveal are placed on the `under_bed` surface at
`act_min` 2. Spawning act 2's object set at the boundary would lay them out under the bed with the
box still shut, which gives away the Mira thread that section 5 spends the whole act building
toward. Act 2's contents arrive with act 2's systems.

So v0.2 ends with the flat gone darker, the rain heavier, and the goal line still reading that the
charger was not with the phone.

### Two decisions the bible does not make

Section 4.2 lists three verbs and does not say which wins. This build resolves it as: **Take beats
Read, once the thing has been read.** Nine of the eleven keystone objects are sortable, and with
Read winning outright they could be read all night and never packed. The cost is that a packable
document is read once. You can stand there and look at it as long as you like, and once you have,
you have to decide what happens to it.

The wardrobe is still modelled as a closed box while `wardrobe_shelf` holds the invoice folder.
That is an act 2 object, so it does not bite yet, but the wardrobe has to be modelled open before
act 2 ships.

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

`?act=2` or `?act=3` starts in that act, with its lighting and its rain, and spawns the objects
belonging to it as well. That last part is the only thing in the build that does so: playing
through to act 2 deliberately does not repopulate the flat, so this is the only way to look at
the later objects for content review.

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

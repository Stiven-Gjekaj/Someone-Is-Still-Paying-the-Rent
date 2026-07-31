<div align="center">

# Someone Is Still Paying the Rent

### A first-person narrative game about one night packing a friend's flat

_One flat. One night. One friend._

<p align="center">
  <img src="https://img.shields.io/badge/Three.js-0.185-000000?style=for-the-badge&logo=three.js&logoColor=white" alt="Three.js 0.185"/>
  <img src="https://img.shields.io/badge/TypeScript-7.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript 7.0"/>
  <img src="https://img.shields.io/badge/Node-24-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node 24"/>
</p>

<p align="center">
  <a href="https://github.com/Stiven-Gjekaj/Someone-Is-Still-Paying-the-Rent/actions/workflows/validate.yml"><img src="https://github.com/Stiven-Gjekaj/Someone-Is-Still-Paying-the-Rent/actions/workflows/validate.yml/badge.svg" alt="The validate workflow"/></a>
  <img src="https://img.shields.io/badge/tests-244_passing-427819?style=flat-square" alt="244 tests passing: 209 unit, 34 browser, 1 whole playthrough"/>
  <img src="https://img.shields.io/badge/dependencies-1_(28),_5_dev-007ec6?style=flat-square" alt="One runtime dependency, 28 packages in the tree, and 5 development dependencies"/>
  <img src="https://img.shields.io/badge/binary_assets-none-8a8272?style=flat-square" alt="No binary assets: geometry, textures and audio are all generated at runtime"/>
</p>

<p align="center">
  <a href="#the-night"><b>The night</b></a> |
  <a href="#controls"><b>Controls</b></a> |
  <a href="#accessibility"><b>Accessibility</b></a> |
  <a href="#running-it"><b>Running it</b></a> |
  <a href="#documentation"><b>Documentation</b></a>
</p>

</div>

---

## Content advisory

**This game is about losing a friend to suicide.** It contains grief and depictions of depression.
It does not depict the act, the method, or the death itself.

The game says this on its own first screen before anything else, and this file does the same for the
same reason. Support resources are reachable from the pause menu at every single moment the game is
running, including the middle of the ending, which is Hard Rule 9 and is checked eight separate
ways by the test suite.

If you are adding content, read [`docs/CONTENT_RULES.md`](docs/CONTENT_RULES.md) first. The short
version: the game gives no cause and reaches no verdict, and if you are not sure whether something
crosses a line, it does.

---

## Overview

Eight months after his best friend Niko died, the player spends one last night in his flat, packing
his life into boxes before the lease ends. Six rooms, fifty-one objects, three acts, and one
decision repeated over and over: for each thing you pick up, ship it to his sister, donate it, or
let it go. There is no score, no timer, no fail state, and no undo.

The game is finishable end to end. Advisory, title screen, front door, three acts, the ending, the
support resources. Around forty minutes if you look at everything.

Everything the player reads lives in `data/`, extracted from the lore bible into typed JSON, and a
content validator enforces the ten hard rules of section 0 against it on every push. Nothing is
loaded from disk at runtime: geometry is Three.js primitives, textures are drawn to a canvas, and
audio is synthesised with the Web Audio API.

```
data/objects.json     what is in the flat and what it says when you look at it
data/scenes.json      the acts, their gates, the goal lines, and the authored beats
data/texts.json       the eleven documents you can pick up and read
data/fragments.json   the twelve memories
scripts/validate-content.ts   refuses any of it that breaks section 0
```

---

## The night

<table>
<tr>
<td width="50%" valign="top">

### What you do

- Walk six rooms, examine anything, read what can be read
- Carry one thing at a time to the three boxes and choose SHIP TO LENA, DONATE, or LET GO
- Look twice at the right things and get a different sentence back
- Find twelve memories: object, then thought, then memory, with the room ducking underneath
- Play his band's unmixed demo on his record player, drums too loud, alive
- Turn the string lights on, which is the one thing in the flat you can leave better than you found it
- Take exactly one thing back out of the sealed box at the end, or take nothing, which is a real answer

</td>
<td width="50%" valign="top">

### What the flat does

- Three acts, each with a gate: ten things sorted and the phone found, then the charger and four real minutes
- Objects that do not exist until something reveals them, per `act_min` and `hidden_until`
- Per-room lighting authored in candela that shifts as the night goes on, plus rain on every window
- A middle layer opening in act 2: the junk drawer, the under-bed box, the vinyl shelf
- An act 3 chain rather than a sandbox: the thread, then the desk scene, with your bag beside them
- A checkpoint written when an act begins, offered back as "Continue from act 3", cleared at dawn
- A last shot of the building at dawn, framed so the height of the balcony is not legible

</td>
</tr>
</table>

For how any of that is put together, and the five decisions this build made that the bible does not,
see [`docs/DESIGN_NOTES.md`](docs/DESIGN_NOTES.md).

---

## Controls

| Key | What it does |
|---|---|
| `W` `A` `S` `D` | Walk |
| Arrow keys, or the mouse | Look |
| `Tab`, `Shift+Tab` | Step the crosshair round what is within reach |
| `E`, or click | Examine, read, take, or sort whatever the crosshair is on |
| `R` | Say the room, what is within reach, and which way the game is asking you to go |
| `Escape` | Out of whatever is on screen, then the pause menu |

The arrows used to be a second set of movement keys and looking was mouse only, which meant the game
could not be played at all without a mouse: aiming the crosshair is the only verb section 4.2 has.
Rebinding them costs anybody who was walking with the arrows their habit, and it is still right.

Holding an arrow starts slow and speeds up, so a tap is a fine adjustment and a hold is a turn.
`Tab` exists because even that is not enough: `junk_drawer` is a thirty-millimetre panel visible from
about a third of one percent of the angles in the kitchen, and nobody should have to land on it by
hand.

**`Tab` is not an objective marker**, and section 8.2 forbids one outright. It reaches only what the
raycast already reaches, and every candidate is confirmed by firing the real ray before the camera
settles on it, so it can never point at anything the player could not have found by turning their
head where they are standing. It removes the precision from searching, not the searching.

---

## Accessibility

| Promise | How |
|---|---|
| Playable with the keyboard alone, start to finish | Nothing needs a pointer, including the advisory, the title screen, the sort chooser, and the take-one-thing list at the ending. The browser suite instruments `page.mouse` and fails if the count is not zero |
| What the crosshair is on, what is in your hands, and what the game wants are all spoken | Three live regions. The reticle is not one: it is a dot |
| Every beat that takes the screen reads itself out | A line at a time, in step with the pacing, from an announcer outside the `aria-hidden` block it speaks for |
| Documents can be read and left | Opening one moves focus into it, closing one puts focus back |
| Silence is available | A volume slider in Comfort, down to zero. The rain and the fridge run for the whole game and section 8.2's chime is a gate signal, so this is not a nicety |
| The words can be made bigger | A text size in Comfort, from 0.85 to 2 |
| Motion can be switched off | Head bob follows `prefers-reduced-motion` and can be turned off regardless |

The text size is a multiplier on whatever the browser is already set to rather than a size of its
own, so a player who has turned their own default up keeps it and this compounds with it. It is
applied before the advisory is drawn rather than when a game starts, because the advisory is the
first thing anybody reads and the screen the setting most matters on.

`R` says where you are: the room by name, what is within reach, and one bearing and distance to
whatever the game is currently asking for. That last part is the goal line repeated in a different
form rather than a new piece of information, and section 8.2 forbids an objective marker, so it
never points at something the player has not been told about. While something is in your hands the
answer is always the boxes.

**It still does not make the game playable without sight.** A room is wider than two reaches, so `R`
narrows the search to the right room and the right direction and then leaves you walking around it.
Finding a small object inside that room is still a matter of sweeping `Tab` while you move. Audio
beacons, which are the other half of what would close this, are a design conversation about how the
flat sounds rather than a setting, and this pass deliberately did not open it.

---

## Running it

Node 24. The version is pinned in `.nvmrc`, and there is nothing else to install but the packages.

```
nvm use
npm install
npm run dev
```

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server on port 5173 |
| `npm run build` | Production build into `dist/` |
| `npm run typecheck` | `tsc --noEmit` in strict mode |
| `npm run validate` | Content validator: schema, references, hard rules, writing style |
| `npm test` | Node's test runner over the pure logic. No dependencies |
| `npm run verify` | Drives a real browser through the game. A few minutes |
| `npm run verify:full` | The whole game from the front door, no shortcuts. About eight minutes |

`npm run validate` runs the validator directly through Node, with no loader and no dependencies.
Node 24 strips TypeScript types natively, which is why every type annotation in this repository has
to be erasable: union types and `const` objects instead of `enum`, no `namespace`, no constructor
parameter properties. The `erasableSyntaxOnly` compiler flag enforces this at typecheck time, so a
change that would break the validator fails the build first.

### Dev parameters

`?room=<id>` starts the camera in the middle of that room rather than at the front door, using the
room ids in `data/rooms.json`. `?yaw=<degrees>` turns it clockwise from north and `?pitch=<degrees>`
tilts it, negative looking down. `?room=bedroom&yaw=180&pitch=-28` looks at the bed.

`?act=2` or `?act=3` starts in that act, with its lighting, its rain, and its objects. What it does
not do is reveal anything hidden behind a discovery, or set a flag an earlier act was supposed to
set, because that is the whole point of hiding it. Starting in act 3 puts you in a flat where the
thread is readable and the desk still says "Later", which is exactly where the act begins. To look
at the Mira thread or the desk scene for content review, set the flag it waits on through the dev
handle.

Any of these also sets the session to dev mode, which skips the opening beat, and attaches `__dev`
to the canvas. That started as a console convenience and is now what `npm run verify` drives the
game through, so it is load-bearing: `e2e/opening.test.ts` asserts its shape, and removing a field
from it fails there by name rather than as a dozen unrelated timeouts elsewhere.

### Saves

One slot, in `localStorage` under `sispr.checkpoint`, written when an act begins. There is no manual
save and no way to rewind inside an act: sorting has no undo, and a save system that quietly gave it
one would take the weight out of the only decision the game asks you to make.

Reading it is deliberately unforgiving. A save whose version does not match the build is dropped
whole, object ids that no longer exist in `data/objects.json` are discarded rather than restored,
and `sorted_count` is recomputed from the objects rather than believed. A save that half-restores is
worse than no save at all, because it looks like it worked.

The checkpoint is cleared when the night finishes. A title screen still offering "Continue from act
3" would be offering to walk back into an ending that is over.

---

## Project structure

Content is authored as data, validated as data, and loaded into a scene that is built entirely at
runtime. Nothing between the repository and the flat is a file anybody has to ship.

| Layer | Where | Lines | Responsibility |
|---|---|---|---|
| **Content** | `data/`, `src/content/` | 2886 | The narrative as typed JSON, its schema, its loader, and the state flags |
| **World** | `src/world/` | 2806 | The flat, furniture, props, placement, lighting, rain, textures, and the exterior |
| **Interface** | `src/ui/` | 1687 | HUD, overlays, the chooser, and the four beats that take the screen |
| **Session** | `src/game/` | 1454 | Carrying, acts, the charge, the ending, screens, and checkpoints |
| **Audio** | `src/audio/` | 1137 | Synthesis and the mixer. No files, no samples |
| **Rules** | `src/rules/` | 607 | Pure logic: gates, reveals, second looks, effects, sorting, verbs, pacing |
| **Input** | `src/player/`, `src/interaction/` | 887 | The controller, collision, raycast targeting, and the `Tab` ring |
| **Engine** | `src/core/` | 153 | Renderer, scene, camera, render loop |
| **Bootstrap** | `src/main.ts` and its neighbours | 1354 | The three screens before the front door, settings, and the stylesheet |
| **Validation** | `scripts/` | 3001 | The content validator and the reviewed corpus it checks against |
| **Tests** | `tests/`, `e2e/` | 5312 | Pure logic under `node --test`, and a real browser playing the game |
| **Documentation** | `docs/` | 1553 | The bible, the content rules, the review, the design notes, the verification |
| **Build** | config and the lockfile | 2056 | Vite, TypeScript, two workflows, and the commit hook |
| **Total** | **109 files** | **24895** | Text, all of it. No binary assets at any point |

```
data/       narrative content, the single source of truth for anything the player reads
docs/       the lore bible, content rules, the content review, design notes, verification
scripts/    the content validator and the reviewed corpus
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
tests/      node --test over the pure logic
e2e/        a real browser, plus three tools that assert nothing and never fail
```

---

## Testing

```
npm test          # 209 unit tests, no browser, about a second
npm run verify    # 34 checks in a real browser, a few minutes
npm run validate  # the content, against section 0 and the house style
```

`npm run verify` builds the game, serves it, and plays it with the keyboard. See
[`docs/VERIFICATION.md`](docs/VERIFICATION.md) for what it checks, what it deliberately does not,
and how to add a check.

The caveat is worth reading before trusting a green run: **most of its checks jump into an act with
a dev parameter, so a green run is not evidence that the game reaches act 2 or act 3.** Only
`verify:full` proves that, and it runs on a schedule rather than on every push because four of its
eight minutes are the act 2 charge being waited out at its real length.

**Every check in the suite has been made to fail on purpose.** Break the thing it protects, watch it
fail, put it back. Seven checks were found to be worthless or too narrow that way and were rewritten,
which is documented case by case, because that number is what the discipline actually costs and
actually buys.

Three tools in `e2e/tools/` assert nothing and never fail, on purpose. `look.mjs` puts a frame on
disk from any room and angle, `reach.mjs` reports how visible an object is from a grid of standing
positions, and `read.mjs` photographs every screen with words on it at a given text size. Several of
the hardest bugs in this project were found by looking, and none of them was expressible as an
assertion until after somebody had seen it.

---

## Documentation

<table>
<tr>
<td align="center" width="25%" valign="top">
<h3>The source</h3>
<p>Every rule, room, object<br/>and line, as authored</p>
<a href="docs/LORE_BIBLE.md"><b>Lore bible</b></a>
</td>
<td align="center" width="25%" valign="top">
<h3>Before you write</h3>
<p>The ten hard rules in<br/>operational form</p>
<a href="docs/CONTENT_RULES.md"><b>Content rules</b></a>
</td>
<td align="center" width="25%" valign="top">
<h3>What was read</h3>
<p>All 274 player-facing<br/>strings, with verdicts</p>
<a href="docs/CONTENT_REVIEW.md"><b>Content review</b></a>
</td>
<td align="center" width="25%" valign="top">
<h3>How it is built</h3>
<p>Mechanisms, and decisions<br/>the bible does not make</p>
<a href="docs/DESIGN_NOTES.md"><b>Design notes</b></a>
</td>
</tr>
<tr>
<td align="center" width="25%" valign="top">
<h3>What is proved</h3>
<p>And what a green run<br/>does not mean</p>
<a href="docs/VERIFICATION.md"><b>Verification</b></a>
</td>
<td align="center" width="25%" valign="top">
<h3>Support</h3>
<p>The resources the game<br/>shows, and why those</p>
<a href="docs/resources.md"><b>Resources</b></a>
</td>
<td align="center" width="25%" valign="top"></td>
<td align="center" width="25%" valign="top"></td>
</tr>
</table>

---

## Content rules

Read [`docs/CONTENT_RULES.md`](docs/CONTENT_RULES.md) before writing or generating any content for
this project. It carries the ten hard rules and the seven questions the game must never answer, in
an operational form, along with which of them the validator can check automatically and which need
a human.

Every player-facing string in the game has been read against six passes and recorded with a verdict
in `scripts/content-review.ts`. The validator refuses a new one that has no row, so content cannot
enter this repository without somebody having read it. 274 strings, 19 of which needed an argument.

The short version: this game is about a suicide and it never depicts the act, the method, or the
death. It gives no cause and reaches no verdict. If you are adding content and you are not sure
whether something crosses a line, it does.

---

## No binary assets

There are none, by design. Geometry comes from Three.js primitives, textures are drawn to a canvas
at runtime, and audio is synthesised with the Web Audio API. Cloning the repository is enough to run
it, and the whole tracked tree is text.

This is enforced rather than assumed: image extensions are ignored by `.gitignore`, because six
screenshots were committed by accident in v0.6.10 and sat under this exact paragraph for two passes
before anybody noticed.

---

## Conventions

Commit messages are `vX.N.A: <description>`, one version stamp per commit, patch incrementing. Many
small commits rather than a few large ones. No co-author, session, or model trailers.

No em-dashes and no emoji anywhere: source, docs, data, commit messages, examples. The validator
checks the tracked files, and the `commit-msg` hook checks the messages.

```
git config core.hooksPath .githooks
```

---

## License

Not released under an open source licence. `package.json` says `UNLICENSED` and there is no LICENSE
file, so all rights are reserved. The lore bible in `docs/` is the authored work this repository
exists to build, and it is not offered for reuse.

<div align="center">
<sub>Built with Three.js, and nothing else you have to download. Start with the <a href="docs/LORE_BIBLE.md">lore bible</a>.</sub>
</div>

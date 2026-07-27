# Someone Is Still Paying the Rent

A first-person narrative game built in Three.js. One flat. One night. One friend.

Eight months after his best friend Niko died, the player spends one last night in his flat,
packing his life into boxes before the lease ends.

## Status

Foundation only. There is no runtime game yet.

What exists today:

- Every piece of narrative content from the lore bible, extracted into typed data under `data/`.
- TypeScript definitions for the object schema, memory fragments, keystone texts, and state flags.
- A content validator that enforces the ten hard rules in section 0 of the bible, plus the
  house writing style, and fails CI on any violation.
- The content advisory screen, rendered from data. This is the one screen that has to exist
  before anything else does, because Hard Rule 9 requires it.

What does not exist yet: the renderer, the flat, the player controller, interaction, sorting,
memory fragments, the phone, the acts, or the ending.

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

They exist so the flat can be screenshotted in a headless browser without pointer lock, and they
are how the verification pass checks that each room reads the way `data/rooms.json` says it
should. `?room=bedroom&yaw=180&pitch=-28` looks at the bed.

## Layout

```
data/       narrative content, the single source of truth for anything the player reads
docs/       the lore bible, the content rules checklist, the resources guide
scripts/    the content validator
src/        types, the content loader, the advisory screen
```

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

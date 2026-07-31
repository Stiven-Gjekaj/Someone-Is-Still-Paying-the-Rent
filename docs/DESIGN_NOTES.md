# Design notes

Decisions this build made that the lore bible does not make, and the mechanisms behind the parts of
the night that are more than they look. The README is the front page; this is the part that needs
paragraphs.

Everything here is about how the game is put together. `docs/CONTENT_RULES.md` is about what may be
written, and it is the one to read first if you are adding content.

---

## Act 3 is a chain, not a sandbox

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

---

## What ends the game

Act 3 has no `gate_to_next`, because there is no act 4, and the validator fails if one is added.
What it has is `ends_when`, the same shape evaluated by the same `evaluateGate`, required on act 3
and forbidden anywhere else.

There is no sorting quota on it. Whatever is still in the flat at that point is what the player
decided to leave, and the game holds no opinion about it.

---

## Hard Rule 3 is a scene

The desk scene is the one place in this game where an absence is the payoff. Five blocks, authored
in `data/scenes.json`, ending on one sentence, and nothing follows it but a stage direction saying
that nothing follows it.

The lexicons in the validator already refuse the words. The shape is checked separately, because a
reveal appended after the payoff needs no forbidden vocabulary at all: the validator requires that
last line verbatim, allows exactly one stage direction after it, and fails on a sixth block. There
is no note in this game and none may ever be added, as content or as cut content.

---

## The last shot, and Hard Rule 10

`src/world/exterior.ts` builds its own scene, its own camera, and its own dawn lighting, because
the flat's lighting is authored in candela for a dark room and its `applyAct` is typed `1 | 2 | 3`.

The framing is the content. The rule is that nothing on any elevated point may carry dark
connotation, and a shot looking up at a balcony from a pavement breaks it however carefully the
words are chosen. So the height is not legible: a 17 degree lens level with the balcony, a camera
that only translates so no vertical leans, under two storeys in frame with the wall running off the
top and the bottom, no roofline, no ground, and the sky beside the building rather than above it.

His window is dark. If the player left the string lights on they are burning, and that is the only
thing in the picture anybody decided.

---

## Nothing appears before it has been found

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

---

## Five decisions the bible does not make

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

---

## Where the code is allowed to be pure

Anything in `src/rules/` takes its data as arguments, so it runs under `node --test` with no renderer
and no browser. Anything that touches the DOM, the scene graph, or the clock lives outside it.

Two modules outside `rules/` follow the same rule for the same reason: `src/player/look.ts` and
`src/interaction/reach.ts` hold the arithmetic behind the arrow keys and the `Tab` ring. Neither can
be measured in a browser, because a headless run on a software rasteriser renders at about two
frames a second and the engine clamps `delta`, so wall-clock time and game time come apart by a
factor of five. Pulling the sums out found a real bug: the camera turned nearly ten percent faster
at fifteen frames a second than at sixty.

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

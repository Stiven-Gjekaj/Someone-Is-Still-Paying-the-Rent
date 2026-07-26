# Content rules

Operational form of sections 0 and 9 of `LORE_BIBLE.md`. Read this before writing or generating
any content for this project, including examine text, fragment lines, second-look text, and
anything an AI-assisted pass produces.

The bible is the authority. This file only says how the rules are enforced and where the
judgment calls sit.

## The ten hard rules, and who checks them

| # | Rule | Checked by |
|---|---|---|
| 1 | The method of death is never named, shown, implied, or hinted at | Validator, then a human |
| 2 | The death did not happen in the flat | Validator, then a human |
| 3 | There is no suicide note, and none may ever be added | Validator, then a human |
| 4 | No single cause is ever given or implied | Human only |
| 5 | Struggles are always interleaved with plans, humor, and care | Human only |
| 6 | The bathroom contains no medication objects | Validator |
| 7 | The word "suicide" appears on the advisory screen only | Validator |
| 8 | The game never answers whether the player could have prevented it | Human only |
| 9 | The advisory and support resources exist and are reachable | Validator |
| 10 | Nothing on the balcony carries dark connotation | Validator, then a human |

"Validator" means `npm run validate` fails the build. "Human only" means nothing mechanical can
catch a violation, so it has to be caught in review. Four of the ten are human only, and they are
the four that matter most, so do not read a passing validator as a passing content review.

### What the validator actually does

It scans every player-facing string in `data/` and `src/` against banned lexicons. A lexicon hit
is a hard failure with the file, the object id, and the matched term. The lexicons cover means and
method (rules 1 and 2), notes left behind (rule 3), medication (rule 6), and dark connotation on
the balcony (rule 10). It checks that the literal word "suicide" appears nowhere in the object,
fragment, text, or scene data, and that the advisory and at least one resource entry exist and are
non-empty.

Lexicons catch the obvious. They do not catch implication, which is the actual risk. A sentence
can violate rule 1 without containing a single banned word.

## The ambiguity ledger

Seven questions the game must never answer. Each is listed with the content that touches it, so
that a change to any of these objects gets checked against the question it is near.

| # | Question | Content that touches it |
|---|---|---|
| 1 | What the unsent draft was going to say | `phone_dead`, `desk` |
| 2 | When Mira's letter was written, and why they ended | `mira_draft`, `mug_blue`, `hoodie_mira`, `photobooth_strip`, `underbed_box` |
| 3 | Who the second concert ticket was for | `concert_tickets` |
| 4 | Whether the 4 a.m. entries were his worst nights or ordinary insomnia | `notebook_4am`, `corkboard`, `alarm_clock` |
| 5 | Why he never called the referral number | `referral_letter`, `appt_card`, `zlatan_plant` |
| 6 | Whether anyone could have changed anything | `pc_bag`, `phone_dead`, `boots_muddy`, `team_photo`, and every second-look string |
| 7 | "Why" | The whole flat |

The failure mode to watch for is not a sentence that answers one of these outright. It is a
sentence that makes an answer feel available. Second-look text is the most dangerous surface in
the game for exactly this reason: its whole job is to reframe, and reframing is one short step
from explaining.

**The second-look rule:** reframe, never confirm. Grief sees patterns. The game refuses to verify
them.

## Writing style

No em-dashes. No emoji. Both are enforced by the validator across every tracked file, and by the
`commit-msg` hook across commit messages.

Ambient examine text is in the player character's voice: dry, precise, feeling more than it says.
When in doubt, cut the last sentence. The bible's own examples do most of their work by declining
to comment.

## Recorded deviations from the bible

Every place the data departs from `LORE_BIBLE.md`, and why. The normalized bible in this
repository already carries these corrections.

### One circular dependency, resolved

Section 5 gated the `vinyl_shelf` second look on `demo_cdr`, and also said `demo_cdr` is found
via the `vinyl_shelf` second look. Neither object could ever unlock.

`vinyl_shelf` is now gated on `bass_case`. It is the other Low Orbit object, it is the same act,
and its fragment F-10 puts the band back in the player's head immediately before the shelf gives
up the demo. The chain reads better than the original intent and it terminates.

### Five objects promoted to their own entries

The bible mentioned these by id inside another object's notes, which leaves them unaddressable.
Anything the player can look at needs its own id.

- `team_photo`, mentioned inside `fridge_photos`, and used as the `boots_muddy` second-look gate.
- `hoodie_mira`, `photobooth_strip`, `mira_draft`, and `dad_lighter`, all mentioned inside
  `underbed_box`. `mira_draft` carries keystone text and `dad_lighter` triggers F-08, so both
  had to be addressable regardless.

Their descriptions come from the bible's own parentheticals where it gave any.

### One object moved rooms

`demo_cdr` is indexed under Bedroom in section 5, alongside the other Low Orbit objects, but the
same entry says it is found behind a misfiled record on the `vinyl_shelf`, which is in the living
room. Its `room` is `living_room`, because that is where the player is standing when it appears
and where the world builder has to place it. The Low Orbit grouping in the bible is thematic, not
spatial.

### Section cross-references corrected

The bible was renumbered at some point and several references were left pointing one section
past their target. Corrected in the normalized copy:

| Location | Was | Now |
|---|---|---|
| Hard Rule 3 | §9.3 | §8.3 |
| Hard Rule 4 | §10 | §9 |
| §4.3 | §8 | §6 |
| §4.4 | §8.2 | inline in §5 |
| §4.5, Act 3 | §9.3 and §9.4 | §8.3 and §8.4 |
| §5, `desk` | §9.3 | §8.3 |
| §6, footer | §10 | §9 |

### What act_min means

`act_min` is the earliest act in which the player can interact with the object at all, which is
not always the act the bible's section 5 index lists. The index column says when an object
becomes its full self. Two objects are interactive well before that, because section 5 gives them
earlier text itself:

| Object | Section 5 column | `act_min` | Why |
|---|---|---|---|
| `desk` | Act 3 | 1 | Section 5 supplies act 1 examine text for it: "His desk. Paper everywhere. Later." The scripted scene still waits for act 3. |
| `junk_drawer` | Act 2 | 1 | Section 5 supplies the jammed-shut examine text for before act 2. The charger still waits for act 2. |

`phone_dead` and `pc_bag` look like the same case and are not. The phone is listed "Act 1 (found)
/ Act 3 (read)" and its `act_min` is 1. The bag is listed "Act 3 (locked before)" and its
`act_min` is 3, because it genuinely cannot be touched earlier.

### Second-look gating widened

Section 12 documents `second_look.requires_flag` as a single string naming a state flag, but most
of the pairs in section 5 gate on having examined another object instead. The field keeps its
documented shape and the flag namespace grew to cover the other cases. See `src/content/flags.ts`.

### Resources split across two files

Section 11 says `docs/resources.md` holds the entries. The advisory screen needs typed data, so
`data/resources.json` is the machine-readable source and `docs/resources.md` became the operator
guide covering the format and the verification requirement.

## Authored content

The bible gives verbatim examine text for some objects and only a description for others, and
gives a one-line beat per fragment rather than the three to six monologue lines it calls for. The
missing strings were authored against these rules.

Anything carrying a `section` field is verbatim from the bible. Anything without one was authored
and is fair game to rewrite.

# The content read

**This is not the human read. It is the preparation for one.** Four of the ten hard rules are
human-only by their own definition, which means nothing mechanical can discharge them and this
document does not either. What it does is produce the corpus, the reasoning, and a verdict per
string, so that a person can audit an argument instead of re-deriving it from nothing. A reader who
disagrees with a verdict here should change it. That is the document working.

The second caveat is the one that matters more. **I wrote most of these strings.** A review of your
own work agrees with itself by default, and "I read it and it seemed fine" is worth nothing. The
method below exists to make that harder, not to prove it did not happen.

---

## What was read

262 player-facing strings, which is everything `scripts/validate-content.ts` collects: object names,
examine text, second looks, fragment beats and lines, keystone titles and blocks, scene title cards
and blocks, goal lines, the advisory, and the region resource entries.

The 77 geometry names the validator also scans are identifiers rather than prose and are out of
scope for a rules read. The 19 design notes in `data/objects.json` are out of scope on purpose: a
design note is the author's intent, the rule is about what a player receives, and reading the two
together lets intent excuse effect.

The strings were read from a dump ordered by act and room, apart from the data files they live in,
for the same reason.

## The method

Five countermeasures, and they are the method rather than decoration.

1. **One rule at a time, over the whole corpus.** Six passes, not one. A string read for "does this
   name a cause?" and "does this imply it was preventable?" at the same time is read for neither.
2. **Adversarial framing.** Every argued row states the strongest case *against* the string before
   the verdict. A review that starts from "is this okay" ends at "yes".
3. **A recorded verdict per string per rule.** In `scripts/content-review.ts`, not here. See below.
4. **Strings read apart from their design notes.**
5. **The cumulative read done separately**, last, because rules 4, 5 and 8 are emergent and the
   other five passes produce the map that makes it possible.

### Where the rows live, and why they are not in this document

The plan for this pass asked for a visible row per string here. That was the wrong shape and the
deviation is written down rather than made quietly.

A table of 262 rows reading "pass" is the rubber stamp the pass exists to prevent. It makes the
review look thorough while burying the seventeen rows that matter, and nobody scrolls it. So the rows
live in `scripts/content-review.ts`, where `npm run validate` enforces three things the table could
only claim:

- a player-facing string with no entry fails the build,
- an entry for a string that no longer exists fails the build,
- **an entry whose recorded text has drifted from the data fails the build.**

The third is the point. A verdict is about particular words. Change the words and the verdict is a
leftover, and a leftover verdict is worse than no verdict, because it looks like somebody checked.

Every argued row is reproduced in full below. The unargued ones are one line each in that file.

---

## Pass 1: Hard Rule 4, no single cause

> No single cause is ever given or implied. Multiple threads (money, sleep, the breakup, old grief)
> exist; none resolves into "the reason."

Two questions: does any string assert or imply one thread is the reason, and does any thread resolve
rather than sit?

**No string asserts a cause.** The explicit forms of causal language were swept mechanically in
v0.6.1 (`CAUSE_AND_VERDICT` in the validator): six hits in the corpus, all judged legitimate and
allowlisted with reasons. Four strings were argued by hand and all four pass. They are
`alarm_clock`, `notebook_4am`, `photo_dad` and `referral_letter` block 1, reproduced below.

**The threads are not equally weighted, and that is fine.** Counted by string:

| thread | strings |
|---|---|
| the breakup | 18 |
| sleep | 16 |
| money | 10 |
| old grief | 9 |
| the unused referral | 7 |
| *the player's own guilt* | *32* |

Rule 4 asks that none resolves into the reason, not that they be equal. The distribution has no
dominant thread. The striking number is the last one: **the player's own guilt outweighs any single
thread of Niko's, and outweighs money, old grief and the referral combined.** That is a structural
defence against Rule 4 that no individual string is doing. The game is more about the player's
avoidance than about anything that happened to Niko, and a corpus shaped that way struggles to
converge on a cause even if a reader wants it to.

Of the 262 strings, 60 (23%) are on one of Niko's struggle threads, 32 (12%) are the player's guilt,
and 170 (65%) are neither.

## Pass 2: Hard Rule 5, struggles interleaved with plans, humour and care

> Every "middle layer" discovery sits near evidence of a future he was still building.

That is a claim about adjacency, and the data knows what is next to what, so this pass became a
check rather than a reading. `A_FUTURE_HE_WAS_BUILDING` in the validator names 21 objects that count
as evidence of a future, each showing its working: eighteen quote the object's own words verbatim,
and the three that cannot are balcony objects, warm by Hard Rule 10 rather than by any sentence.
Every object from act 2 down that is not on that list must have one of them in its room or its
reveal group.

The default is suspicion on purpose. A list of struggles instead would pass silently the day
somebody adds an object and forgets to classify it, and silence is what this rule cannot afford.

**It found one gap: `appt_card`.** Recorded in full below and printed on every validate run. It is
not fixed, because the fix available to me was to move the card onto the warm list, and
reclassifying an object to make a failure go away is not a fix.

## Pass 3: Hard Rule 8, no verdict on preventability

> The game never answers whether the player could have prevented it. No text may state or imply
> either verdict.

Both directions. A string saying "you could not have known" violates this as squarely as one saying
"you should have seen it", and the reassuring direction is the one a self-review skips, because it
feels safe.

Five strings argued, all reproduced below. The one I am least sure of is `F-04 line 3`, and it leans
kind.

**The surface the plan named as the danger turned out to be the safest.** Second looks exist to
reframe, so they were expected to be where a verdict slips in. There are 13 of them, and only three
touch the middle layer at all (`corkboard`, `concert_tickets`, `mug_blue`). Two of those three *open*
a question rather than closing one: "Now you wonder which side of sleep this was on", and "You will
never get to ask who the second one was for". The reframing surface reframes toward uncertainty.

## Pass 4: Section 9, the seven questions

| # | the question | where it is answered, or refused |
|---|---|---|
| 1 | What the unsent draft was going to say | Refused. Stops on "also wanted to say", and the timestamp is explicitly unrecoverable. |
| 2 | When Mira's letter was written, and exactly why they ended | Refused, more tightly than expected. See the `mira_draft` row. |
| 3 | Who the second concert ticket was for | Refused by name, in the text: "You will never get to ask." |
| 4 | Whether the 4 a.m. entries were his worst nights or ordinary insomnia | Refused, and this is the best-built refusal in the game. |
| 5 | Why he never called, and what would have happened if he had | Refused. Neither is stated, and no other string picks the thread up. |
| 6 | Whether anyone could have changed anything | Covered by pass 3. |
| 7 | "Why." | The word *why* does not appear anywhere in the 262 strings. |

Question 4's defence is worth naming because it is a design move rather than a silence. The examine
text reads "He wrote the times but never the dates." Without dates the entries cannot be aligned
against March, against the breakup, or against each other. The game removed the evidence rather than
declining to comment on it, which is the only kind of refusal that survives a determined reader.

## Pass 5: Section 10, what Niko is not

> Not a mystery to be solved. Not a cautionary tale. Not a saint. Not defined by his death. The
> player should leave knowing his *laugh*, not his diagnosis.

**Not a mystery**: the desk scene handles this head-on. "Most people don't leave one. You knew that.
You looked anyway." The game says out loud that there is nothing to solve.

**Not a saint**: three of the bible's four flaws are in the corpus. Late constantly (F-07: "He is
late. He is jogging up the street with his coat open, apologising before he is close enough to be
heard"). Ducked hard conversations (the unsent draft; "You never asked him about it" cuts both
ways). Let invoices rot (`finances_folder`). The fourth, alphabetizing the vinyl during an argument
to win it by attrition, is **not** in the corpus, and it is the only one of the four where he is
actively unkind to somebody. Recorded as a gap in the `vinyl_shelf` row; not fixed, because filling
it means writing new prose to patch a hole I found in my own work.

**His laugh, not his diagnosis**: nine of the twelve fragments are purely him being alive, and
carry the whole comic register (F-02 "enthusiastic, which is a different thing and much louder";
F-03 "Zlatan deserves stemware"; F-05 "Best call of that year"; F-06 "The speech was deliberately
too long"; F-10 "Tomi was and remains a liar"; F-11 "Somebody in another flat applauded"). The
guardrail also lands structurally rather than only numerically: **the last thing the player hears
of him is the voicemail, and he is laughing in it.** He signs off "bring cash. see you Wednesday."

## Pass 6: The cumulative read

Rules 4, 5 and 8 are emergent. No string names a cause; the question is whether the set converges on
one.

A hostile reader can build the chain: the studio downsized, money got tight, he could not sleep, the
relationship ended, a doctor gave him a referral and he never called, and in March he died. Every
link is true and in the game. But any set of true details about a person's last year assembles into
a narrative, and Rule 4 asks whether the *game* implies a cause, not whether a determined player can
compose one. The multiplicity is the defence, and the game actively declines to rank the threads in
three separate places.

### The finding

**Four of the five threads hang open. One closes.**

| thread | the last thing the player reads on it |
|---|---|
| money | "keep it. they should know who's showing up." |
| sleep | "didn't. tuesday then." |
| the breakup | "Never sent. Never thrown out either." |
| old grief | "You never asked him about it." |
| **the referral** | **"He never called."** |

This is not a Rule 4 violation. No string ranks the threads, and nothing says this was the reason.
But the shape of the corpus ranks them whether or not a sentence does, and a reader looking for the
answer takes the one thread that is shaped like an answer.

**Two independent checks converged on the same room.** The Hard Rule 5 adjacency check found
`appt_card` stranded in a bathroom with no evidence of a future near it. This pass found the
referral thread to be the only one with a closing clause. Both say the mental-health material is the
thinnest and the most terminal part of the game, and they found it from opposite directions. That is
the first thing a human reviewer should look at.

Nothing was changed. Both are recorded as open calls below.

### Two findings against rules that were not on the list

The cumulative read is the pass where cross-rule problems surface, and it surfaced two.

- **Hard Rule 10** and the balcony. `F-11 line 1` is a man going over backwards on a balcony, and
  "they held" two lines later. No lexicon can catch it, because every word in it is innocent. It
  passes, on register and on the fact that the bible wrote it at line 206 in the same document that
  writes Rule 10 at line 26. Recorded because "the bible wrote it" is a reason to believe a reading,
  not a reason to skip making it.
- **Hard Rule 3** and the phone draft. There is no note in this game. There is an unsent draft that
  stops mid-sentence, addressed to the player, with the timestamp explicitly removed. Removing the
  timestamp serves ledger question 1, but it also removes the only thing that would rule out the
  draft having been written at the end. It passes, and it is a judgement call.

---

## What the read changed

Three fixes, one commit each.

| commit | what | why |
|---|---|---|
| `v0.6.3` | Goal text is now scanned against the lexicons | `goal.text` goes to the screen in `src/ui/goal.ts:54` and into the live region a screen reader speaks. No Hard Rule 1 check had ever seen it. The six strings there today are clean; that was luck rather than process. |
| `v0.6.4` | Block failures name which field they are about | A block carries a time, a label, a sender and a text. All four were collected under one label, so a failure named a place holding four strings and pointed at none. |
| `v0.6.6` | A string that outruns its verdict fails the build | See above. |

**No authored prose was changed.** Every finding in this document is either a structural fix, or a
judgement call left alone. Rewriting a line because I think it leans is exactly the overreach the
human-only designation exists to prevent.

## What a human still has to decide

Four things, in the order I would look at them.

### 1. `appt_card` has no future near it

The cancelled counselling card is the one middle-layer discovery with nothing forward-looking in its
room. The bathroom holds it plus the cologne, the spare towel and the toothbrush, and all three of
those are the player's grief rather than his life. Hard Rule 6 makes this the mental-health room on
purpose and keeps it sparse, so the two rules meet here and the second one is not satisfied.

Against that: the card is three years old rather than recent, "He kept it anyway" is not nothing,
and the spare towel he kept folded for you is arguably the care the rule asks for.

Recommendation: something of his that points forwards belongs in that room. No existing object can
move into it without taking the warmth out of the room it leaves, so this needs an authoring
decision rather than a placement edit.

### 2. The referral is the only thread that closes

See the cumulative read above. Same room as finding 1, reached from a different direction.

Recommendation: if either of these is acted on, act on both, and re-read the whole bathroom
afterwards against all six passes rather than only the rule that prompted the change.

### 3. F-04 line 3 leans kind

> You assumed there would be another one. Everyone assumes that. It is how a week gets made.

Universalising a failure is absolution, and Rule 8 forbids both verdicts. Of everything in the
corpus this is the line I would most want a second reader on, because I cannot tell whether I am
defending it or excusing it.

### 4. The vinyl argument is missing

The sharpest not-a-saint detail in the bible is the one the corpus does not carry. Whether that
matters is a characterization judgement, not a rules question.

---

## The argued rows

Reproduced in full from `scripts/content-review.ts`, which is the enforced copy. Each states the
case against the string before the verdict.

### Hard Rule 4

**`object alarm_clock examine`** | "Blinking 00:00 since a power cut nobody reset. Time has been
optional here for a while."

*Against:* "Time has been optional here for a while" gives a decline a duration. It is the narrator
asserting that his relationship to days and nights had come apart, and it puts a length on it.
Paired with the 4 a.m. notebook that is a sleep thread with a timeline, which is most of the way to a
cause. *For:* a clock blinking since a power cut is a fact about every flat anybody has ever lived
in, and the line is wry rather than clinical. It attributes nothing and diagnoses nothing. *Verdict:*
pass. It is the closest thing in the corpus to a decline marker with a clock on it, and it survives
because it is funny.

**`object notebook_4am examine`** | "A cheap notebook on the bedside table, three entries in and
blank after that. He wrote the times but never the dates."

*Against:* "blank after that" invites one reading, which is that he stopped writing because it got
worse. A record that ends is a record that means something by ending. *For:* cheap notebooks are
three entries long for everybody, and the sentence says so by calling it cheap. *Verdict:* pass.

**`object photo_dad examine`** | "Tucked into the mirror frame, not displayed, not hidden. Kept at
the exact distance he could stand."

*Against:* "the exact distance he could stand" asserts an interior state and measures it. The
narrator is claiming to know how much of his father he could take, which makes eight-year-old grief a
live wound with a gauge on it. *For:* it is a claim about the photograph's position, which is a thing
the player can see, and the bible deliberately puts the father's anniversary in July so nothing about
the timing lines up with March. Nothing anywhere in the corpus connects the father to the death.
*Verdict:* pass. The de-alignment is doing the work and it is doing it in the bible rather than in
the string, which is worth a human knowing.

**`text referral_letter block 1 text`** | "(The folds have been opened and closed enough times that
the paper has gone soft. He never called.)"

*Against:* this is the last clause of the last block of the document, and it is the only closing
clause on any thread in the game. Terminal position is emphasis. A reader looking for the reason
finds the one sentence shaped like an ending and takes it. *For:* it states a fact and stops. No
reason is offered, no consequence is drawn, and the sentence before it establishes that he kept going
back to the letter, which is the opposite of dismissal. *Verdict:* pass as a string; see the
cumulative read, where it does not pass as cleanly.

### Hard Rule 5

**`object appt_card examine`** | "A counselling service, three years old. CANCELLED written across it
in his hand. He kept it anyway."

The one gap the adjacency check found. Recorded as `OPEN_TO_A_HUMAN` in the validator and printed on
every run. Not fixed: the fix available to me was to reclassify the card as warm, which is making a
failure go away rather than answering it.

### Hard Rule 8

**`object boots_muddy second_look`** | "The mud is from a Wednesday in March. He played four days
before. Everyone said he was man of the match, and nobody can bear that it's true."

*Against:* "He played four days before" is the no-warning-signs move, and no warning signs is a
verdict. It says there was nothing to catch, which answers the question Rule 8 forbids answering, in
the direction that comforts. *For:* the sentence is about him being alive four days earlier, not
about what anybody could see, and the bible fixes the detail in section 2.3. Nothing here says anyone
looked, or that looking would have shown something. *Verdict:* pass, and it is the tightest pass in
the corpus. The clause that saves it is "nobody can bear that it's true", which turns the reader back
toward grief before the inference can finish.

**`text phone_thread block 3 text`** | "(Seen. No reply was sent. The thread ends.)"

*Against:* this is the sharpest object in the game and it exists to show the player the last thing
they did not do. Putting it on screen at all leans toward one verdict. *For:* read the grammar. "No
reply was sent" is passive with no agent, where "you never replied" was available and is what the
sentence means. The passive is the guardrail, and it is deliberate: every other second-person string
in the corpus uses "you" without flinching, so the one place it is dropped is the one place naming
the actor would be a verdict. Nothing anywhere says the reply would have mattered. *Verdict:* pass,
on the strength of one grammatical choice. **Anybody rewriting this line should know that is what is
holding it up.**

**`text mira_draft block 1 text`** | "I keep starting this and it turns into a list of things I should
have said in October, so here is the shortest version. None of it was your fault, and most of it was
good. The blue mug is yours whenever you want it."

*Against:* "None of it was your fault" is the verdict, in the dead man's own words, and the reader is
a player who has spent the whole game being called "you". Every other second-person string in the
corpus addresses the player. This one does not, and it is the one that would matter most if it did.
*For:* the addressee is established twice before the line is reached. The overlay renders the
document title "Mira's unsent letter" above the blocks (`src/ui/overlay.ts:227`), and block 0 is
"M,". A player reaches this sentence having already read who it is to. The block is also verbatim
from the bible, section 7.4, so the ambiguity is authored rather than introduced. *Verdict:* pass,
and it depends on the overlay rendering the title. **If a future change ever drops the document
title, this line loses one of its two disambiguators and should be re-read.**

**`fragment F-04 line 3`** | "You assumed there would be another one. Everyone assumes that. It is how
a week gets made."

The strongest Rule 8 candidate in the corpus, and it leans the direction a self-review does not
check, because it is the kind one. *Against:* "Everyone assumes that" universalises the thing the
player did. Universalising a failure is absolution, and Rule 8 forbids both verdicts, not just the
cruel one. A line that exists to make the player feel better about a specific omission is answering
the question. *For:* what is universalised is the assumption that there will be another good night,
and the line never connects that assumption to the death. It is about how time feels when nothing has
happened yet. Nothing here says the last level would have changed anything, or that anything would
have. *Verdict:* judgement call, nothing changed.

**`text pc_receipts block 1 text`** | "Eight receipts. What you were paying for was the door staying
shut."

The most accusatory writing in the game, and a careless read flags it. *Against:* the game is
convicting the player, in the second person, of avoidance. That is a verdict. *For:* it is a verdict
about eight months *after* the death, not about anything before it. Rule 8 is specifically about
prevention. The receipts thread never reaches backwards, and it cannot, because the player only
started paying once there was nothing left to prevent. *Verdict:* pass, and the distinction is worth
stating because it is the line a future edit is most likely to blur. **Guilt about the aftermath is
the game's subject. Guilt about the death is the thing it must not adjudicate.**

### Section 9

**`object concert_tickets second_look`** | Ledger question 3, refused in the text itself: "You will
never get to ask." The game closes the question by name rather than by omission, which is the
strongest form of refusal available to it and the only place in the corpus that uses it.

**`object notebook_4am examine`** | Ledger question 4. "He wrote the times but never the dates" is the
defence, and it is a good one: without dates the entries cannot be aligned against March, against the
breakup, or against each other. The game removed the evidence rather than declining to comment on it.
*Verdict:* pass, and this is the single best-built refusal in the corpus.

**`text mira_draft block 1 text`** | Ledger question 2. *Against:* "October" is the only month named on
the Mira thread, and the concert tickets bound the ending from the other side, so the corpus lets a
player narrow it. *For:* October is when the unsaid things belonged, not when the letter was written,
and the letter is undated. Why they ended is never stated by anyone. "Most of it was good" is a
refusal to give a reason dressed as a summary. *Verdict:* pass, tighter than expected.

**`text referral_letter block 1 text`** | Ledger question 5. The block answers neither half. It does not
speculate, and no other string picks the thread back up. *Verdict:* pass.

### Section 10

**`object vinyl_shelf examine`** | The missing argument anecdote. See "What a human still has to
decide", item 4.

**`fragment F-02 line 2`** | "He was not good. He was enthusiastic, which is a different thing and much
louder." Recorded as the load-bearing string for "not a saint", so that anybody trimming the
goalkeeping fragment knows what else goes with it. The corpus has exactly one line that says plainly
he was bad at something he loved, and this is it. Everything else in the not-a-saint column is a
failure of admin or nerve rather than of ability.

**`scene desk_scene block 3 text`** | "Most people don't leave one. You knew that. You looked
anyway." Where the corpus does the "not a mystery to be solved" work out loud. The game states
plainly that there is nothing to find and that the player knew it before they started looking, which
forecloses the search the desk scene would otherwise invite. Nothing else in the corpus says this,
so a change here has nowhere to fall back to.

**`scene voicemail block 3 text`** | "that's it, that's the whole message. bring cash. see you
Wednesday." Where "his laugh, not his diagnosis" lands structurally rather than only by word count:
the last the player hears of him, in his own voice, making a plan for Wednesday. Anything that
displaces the voicemail from that position weakens the guardrail no matter how much warm material is
elsewhere in the flat.

### The cumulative read

**`text referral_letter block 1 text`** and **`fragment F-11 line 1`** and **`text phone_thread block 5
text`** are argued in the cumulative section above.

---

## Reproducing this

```
npm run validate      # the lexicons, the Rule 5 adjacency check, the completeness and drift checks
```

The validator prints the section 9 ledger and any open Hard Rule 5 questions on every successful
run, because a passing validator is not a passing content review and the output should keep saying
so.

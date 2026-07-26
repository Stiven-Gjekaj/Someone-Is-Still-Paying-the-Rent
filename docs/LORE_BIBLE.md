# SOMEONE IS STILL PAYING THE RENT
### Lore Bible and Content Design, v1.0
*A first-person narrative game built in Three.js. One flat. One night. One friend.*

**Logline:** Eight months after your best friend Niko died by suicide, you spend one last night in his flat, packing his life into boxes before the lease ends, and finding, piece by piece, both who he was and what you've been avoiding.

**Genre / references:** first-person walking sim + object-sorting narrative. Tonal references: *Unpacking* (mechanic), *Gone Home* (structure), *What Remains of Edith Finch* (restraint). Reference these for feel only. Do not copy content.

**Tone words:** tender, quiet, unflinching, warm-dark. The game is sad, never cruel. Humor is allowed. Niko was funny, and grief includes laughing.

---

## 0. HARD RULES: Content and Responsibility (NON-NEGOTIABLE)

These are design constraints, not suggestions. Any implementation (including AI-assisted code/content generation) must respect all of them:

1. **The method of death is never named, shown, implied, or hinted at** by any object, text, or environment detail. No object in the flat relates to means in any way.
2. **The death did not happen in the flat.** It happened elsewhere; the game never specifies further. The flat is his *life*, not his death.
3. **There is no suicide note in this game, and none may ever be added.** The mid-game desk scene (§8.3) is built around its absence. Never draft one, even as cut content.
4. **No single cause is ever given or implied.** Multiple threads (money, sleep, the breakup, old grief) exist; none resolves into "the reason." See Ambiguity Ledger (§9).
5. **Niko's struggles are always interleaved with plans, humor, and care.** Every "middle layer" discovery sits near evidence of a future he was still building.
6. **The bathroom contains no medication objects.** Mental-health history is conveyed via an appointment card and a referral letter only.
7. **The word "suicide" appears on the advisory screen only.** In-game documents talk around it, the way people actually do.
8. **The game never answers whether the player could have prevented it.** No text may state or imply either verdict.
9. **Title screen carries a content advisory + support resources** (§11), region-configurable. A "pause any time" affordance is always available.
10. **Nothing on the balcony (or any elevated point) may carry dark connotation.** The balcony is exclusively a place of warm memory (§5, Balcony).

---

## 1. PREMISE

You were his emergency contact. That's why you got the call in March, and it's part of why the guilt sits where it sits.

His sister Lena flew in for one week afterward. She took their father's watch and the photo albums, and couldn't do more. His mother never came up the stairs. Everyone assumed the landlord was "being flexible" about the flat. He wasn't. **You have been quietly paying Niko's rent for eight months**, because as long as the flat existed, some version of him did too.

Now the landlord has new tenants arriving on the 1st. It's a cold, rainy night in November. You let yourself in with the spare key you've had since you were seventeen, and you do the thing you've been paying not to do: you pack.

**Playtime target:** 90-120 minutes. **Structure:** three acts across one night (23:00 → ~03:00 → dawn).

---

## 2. CHARACTERS

### 2.1 Niko Marku (the friend), deceased, age 27
*(Surname is placeholder-flexible; "Niko" is fixed.)*

**Who he was (surface layer, the player must fall for him first):**
- Motion designer & illustrator. Worked at a small studio until it downsized ~18 months ago; freelanced after.
- Ex-bassist of **Low Orbit**, a band that existed ages 21-25 and never quite finished mixing its one demo.
- Fixed thrift-store film cameras for fun. Half-repaired bodies and envelopes of developed photos everywhere.
- Named his plants. The monstera is **Zlatan**. Zlatan is the only survivor of many.
- Wrote reminders on the back of his left hand. Alphabetized his vinyl and absolutely nothing else.
- Hated the fridge hum so much he wedged a folded towel under it. (This is an audio gag with a payoff. See §5 Kitchen.)
- Remembered everyone's birthday. Terrible at replying to texts; excellent at showing up in person.
- Played goalkeeper, voluntarily, in the Wednesday five-a-side group. Wore bib **#1** with total unearned confidence.
- Running joke: the kebab place that gave the whole team food poisoning in year one, and which they kept returning to "because of the sauce."

**Timeline:**
- Age 15: meets the player character (PC) at school. Instant, permanent friendship.
- Age 19: his father dies suddenly (heart attack). At the hospital, Niko lists the PC as his emergency contact: *"so Mum never gets a call like that again."* (Fragment F-09.)
- Age 20: first annual hike with PC: same spot, every year, one photo. Seven photos exist.
- Age 21-25: Low Orbit years.
- Age 23: moves into the flat.
- ~18 months before death: studio downsizes; goes freelance. Money gets slowly tighter (a thread, not the cause).
- ~10 months before: starts seeing **Mira**. It's quiet and good.
- ~2 months before (early winter): a GP hands him a referral letter for counselling. He keeps it by the bed. The envelope is worn from being opened and refolded many times. He never calls.
- ~5 weeks before: he and Mira end. Gently, unclearly, the way real things end.
- Mid-March: dies, away from the flat. Never specified further. **His father's anniversary is in July, deliberately unaligned with March.** Nothing about the timing is allowed to look like an answer.

**The middle layer (what he carried), always interleaved with forward motion:**
sleep trouble (the 4 a.m. notebook) · money stress (a folder of polite-then-final invoices) · the unused referral · the Mira ending · **and beside all of it:** two concert tickets for a show dated the month *after* he died, a freshly repotted Zlatan, a half-edited job application, a new sketchbook with three dated pages, library books due in April.

### 2.2 The Player Character ("you"), unnamed, 27
Grew up with Niko. Works a demanding job that hit crunch in March, which is why his last ordinary text sat on "seen." Has had the spare key for a decade. Has been paying the rent in secret and telling everyone the landlord was being kind. Speaks only through interaction text and memory fragments, never a face, never a name.

### 2.3 Supporting cast (appear only through objects)
- **Lena Marku**, 31. Niko's older sister, lives abroad. Practical, wrecked, kind. Her note (§7.1) opens the game and quietly teaches its rules.
- **Mira**, 26. Bookseller. Seven months with Niko. Her thread lives in the under-bed box. What exactly ended, and when he wrote his unsent draft to her, is never resolved.
- **Vera Marku**. Niko's mother, working abroad. Warm, slightly out-of-touch letters. A recipe card in her handwriting lives in the kitchen.
- **Tomi**. Low Orbit's drummer. Exists via a flyer, a CD-R labeled *"we'll fix the mix later,"* and a tin of broken bass strings.
- **Mr. Rako**. Ground-floor landlord. His note sets the clock. Niko once fixed his radio and refused payment.
- **The Wednesday team**. A bib, muddy boots, one team photo. He played four days before he died.

---

## 3. THE FLAT

One-bedroom, third floor, older building. Radiators that tick as they warm. Rain on the windows all night; city light through half-open blinds. Moving boxes (flat-packed and assembled) staged in the living room.

| Room | Mood / lighting | Function |
|---|---|---|
| Entry hall | Dim; one warm bulb | Tutorial space; Lena's note; the clock (landlord note) |
| Living room | Lamplight pools; the sorting hub | Boxes, vinyl, plant corner, desk by the window |
| Kitchen | Cold fluorescent until player switches to counter lamp | Domestic texture; the junk drawer (charger) |
| Bedroom | Darkest room; bedside lamp only | The phone; the under-bed box; the heaviest intimacy |
| Bathroom | Small, honest light | Smell-memory and the two mental-health paper objects |
| Balcony | String lights (they still work) | **Warm memories only**: two chairs, the caps jar |

Lighting evolves per act: Act 1 warm and dim → Act 2 deeper night, rain heavier → Act 3 stillest hour → ending in grey-gold dawn.

---

## 4. SYSTEMS OVERVIEW

**4.1 Sorting.** Three destinations in the living room: **SHIP TO LENA** (keep), **DONATE**, **LET GO** (discard). Every portable object can be sorted. No scoring, no wrong answers; the game tracks counts and shows the sealed Lena box in the ending.

**4.2 Interaction.** Raycast from center-screen; soft outline highlight; one context action (Examine / Read / Take). Readables open a paper/phone overlay with diegetic typography.

**4.3 Memory fragments.** 12 key objects trigger fragments: ambient audio dips, a slow vignette, 3-6 lines of PC interior monologue (text overlay, no voice acting required). Full list §6.

**4.4 Second Look.** After certain discoveries, already-examined objects gain new examine text (flagged `secondlook_*`). The player literally experiences hindsight. Pairs listed inline in §5. **Rule:** second-look text may reframe, but must never *confirm*. Grief sees patterns; the game refuses to verify them.

**4.5 Acts & gates.**
- **Act 1, "Boxes" (surface).** Free exploration and sorting. Gate to Act 2: the player has sorted ≥10 objects AND found the **dead phone** (bedside). Finding it sets goal text: *"His phone. Dead. The charger wasn't with it."*
- **Act 2, "Under Things" (middle).** The **junk drawer** (kitchen) now yields the charger; the **under-bed box** becomes discoverable; middle-layer readables unlock. Gate to Act 3: phone charging for a few real minutes while the player keeps sorting (build dread through waiting), then the chime.
- **Act 3, "The Phone" (deep).** The text thread, the unsent draft, the desk scene (§8.3), your bag by the door unlocks (rent receipts), then the ending sequence (§8.4).

**4.6 The clock.** No timer, no fail state. Time passes only through scripted lighting/audio shifts at act boundaries.

---

## 5. OBJECT INDEX (by room)

Format: `object_id` | **Name** | Type | Act | beat and notes.
Types: **A** = ambient (examine text only) · **R** = readable (overlay document) · **M** = memory fragment trigger · **K** = keystone (verbatim text in §7) · *(2L)* = has Second-Look state.

### Entry hall
- `lena_note` | **Lena's note** | K/R | Act 1 | On the entry table, weighted with the spare-key bowl. Opens the game; teaches the sorting philosophy. Text §7.1.
- `rako_note` | **Mr. Rako's note** | K/R | Act 1 | Slipped through the mail slot. Sets the clock. Text §7.2.
- `key_bowl` | **Key bowl** | A | Act 1 | Chipped ceramic, made by Mira. Examine: "You've dropped keys in it a hundred times without looking at it. You look at it."
- `boots_muddy` | **Muddy football boots** | A *(2L)* | Act 1 | By the door, mud long dried. 2L after `team_photo`: "The mud is from a Wednesday in March. He played four days before. Everyone said he was man of the match, and nobody can bear that it's true."
- `team_bib` | **Bib #1** | M | Act 1 | Fragment F-02 (the volunteer keeper).
- `corkboard` | **Corkboard** | A *(2L)* | Act 1 | Takeaway menus, a five-a-side schedule, a 5:45 a.m. gym class circled in pen. 2L after `notebook_4am`: "The 5:45 class, circled. You never once knew him to be up before nine. Now you wonder which side of sleep this was on."
- `pc_bag` | **Your bag** | K | Act 3 (locked before) | You brought it in and put it down without thinking. Contains the rent receipts. §7.8.

### Living room
- `sorting_boxes` | **The three boxes** | system | Act 1 | SHIP TO LENA / DONATE / LET GO.
- `vinyl_shelf` | **Vinyl shelf** | A *(2L)* | Act 1 | Perfectly alphabetized, one record out of place. 2L after `bass_case`: reveals the Low Orbit demo hidden behind the misfiled record; the player may re-shelve it (tiny agency beat, no prompt).
- `record_player` | **Record player** | A | Act 1 | Functional. If the player puts a record on, let it actually play, quietly, for the rest of the night.
- `zlatan_plant` | **Zlatan (monstera)** | M *(2L)* | Act 1 | Fragment F-03. Freshly repotted; the soil is still dark. 2L after `referral_letter`: "Repotted within his last month. He was taking care of things. You fill a glass and water it."
- `photo_hike_framed` | **Framed hike photo (year one)** | K/M | Act 1 | Fragment F-01; caption text §7.6.
- `photo_hike_box` | **Shoebox of hike photos (years 2-7)** | K/R | Act 2 | Backs captioned in his hand. §7.6.
- `concert_tickets` | **Two concert tickets** | A *(2L)* | Act 1 | For a show dated the month after he died. 2L after Act 3 phone thread: "Two tickets. You assumed Mira, but the date is after they ended. You will never get to ask who the second one was for."
- `library_books` | **Library books** | A | Act 1 | Three, due in April. One bookmarked two-thirds through.
- `sketchbook_new` | **New sketchbook** | A *(2L)* | Act 2 | Three pages used, all dated within his last month. 2L after `job_application`: "Starting again. Or trying to. Both are true."
- `game_controller` | **Second controller** | M | Act 1 | Fragment F-04 (the co-op save you never finished; his save slot is named `NIKO_DO_NOT_DELETE`).
- `desk` | **The desk** | scripted | Act 3 | The no-note scene. Script §8.3. Before Act 3, examine: "His desk. Paper everywhere. Later."
- `job_application` | **Cover letter draft** | K/R | Act 2 | Printout on the desk pile with red-pen edits. Text §7.5.
- `finances_folder` | **Invoice folder** | R | Act 2 | Wardrobe top shelf, but sorted at the desk. Polite reminders becoming final notices, and a hand-drawn budget on the back of a flyer that almost balances. No totals shown; the shape of it is enough.
- `blanket_sofa` | **Sofa blanket** | A | Act 1 | "It still smells like the flat. The flat still smells like him."

### Kitchen
- `fridge_photos` | **Fridge magnets & photos** | A | Act 1 | A curling photo-booth strip corner peeking from behind the team photo (foreshadows Mira).
- `team_photo` | **The team photo** | A | Act 1 | Held to the fridge by a magnet shaped like a slice of watermelon. Eleven people, one of them mid-blink. He is the only one in gloves.
- `fridge_towel` | **Towel under the fridge** | M *(2L)* | Act 1 | Fragment F-05. After reading, the fridge-hum audio bed actually gets quieter (he wins, posthumously). 2L text: "It works. It always worked. You just never noticed the quiet."
- `junk_drawer` | **Junk drawer** | system | Act 2 | Batteries, takeaway chopsticks, forty pen caps, **the phone charger**. Before Act 2: jammed shut; examine: "Stuck. Everything in it is a monument to 'later.'"
- `mug_chipped` | **The chipped mug** | M | Act 1 | Fragment F-06. It's *your* mug, designated years ago, chipped by you, kept anyway.
- `mug_blue` | **The blue mug** | A *(2L)* | Act 1 | 2L after the under-bed box: "Hers. He kept it where it had always gone, like the cupboard hadn't heard yet."
- `recipe_card` | **Vera's recipe card** | K/R | Act 1 | Grease-spotted, in his mother's handwriting. §7.4 includes her letter; the card cross-references it.
- `calendar_wall` | **Wall calendar** | A | Act 1 | Still on March. The player cannot turn the page. Examine: "You could turn it. You don't."
- `cuttings_jar` | **Plant cuttings jar** | A | Act 1 | On the windowsill, roots visible. Still alive. "He was propagating. Plural. Plans, plural."

### Bathroom
- `cologne` | **Almost-empty cologne** | M | Act 1 | Fragment F-07 (smell memory; the strongest and shortest fragment).
- `spare_towel` | **The spare towel** | A | Act 1 | "Yours. For the nights that ended here. It's been folded on this shelf for eight months."
- `appt_card` | **Old appointment card** | R | Act 2 | Three years old, a counselling service, "CANCELLED" in his writing, kept anyway. No commentary text; the object is the text.
- `toothbrush_cup` | **Toothbrush cup** | A | Act 1 | One toothbrush. "The single most ordinary object in the world, and you have to hold the sink for a second."

### Bedroom
- `phone_dead` | **His phone** | K/system | Act 1 (found) / Act 3 (read) | Face-down on the bedside table, where the police returned it. Dead. The Act-1 discovery that creates the game's engine. Thread text §7.7.
- `referral_letter` | **The referral letter** | K/R | Act 2 | Bedside drawer. Envelope soft and grey from being opened and refolded many times. He read it over and over. He never called. Interaction offers no judgment; text §7.3 note.
- `notebook_4am` | **The 4 a.m. notebook** | K/R | Act 2 | Bedside. Three short entries. Text §7.3.
- `underbed_box` | **The under-bed box** | system | Act 2 | Contains the Mira thread: `hoodie_mira`, `photobooth_strip`, `mira_draft` (K, §7.4), and his father's lighter (`dad_lighter`).
- `hoodie_mira` | **The hoodie** | A | Act 2 | Not his size. Washed and folded, which is the part that gets you.
- `photobooth_strip` | **Photo-booth strip** | A | Act 2 | Four frames. Both of them laughing by frame three, and neither is looking at the camera after that.
- `mira_draft` | **Mira's unsent letter** | K/R | Act 2 | Folded many times. Text §7.4.
- `dad_lighter` | **His father's lighter** | M | Act 2 | Fragment F-08. He didn't smoke. He just kept fire in his pocket.
- `wardrobe` | **Wardrobe** | A | Act 1 | The Low Orbit tour shirt that never toured; a winter coat with two ticket stubs and a receipt in the pocket; the finances folder on the top shelf (moves to desk).
- `bass_case` | **Bass case** | M | Act 2 | Corner. Inside: the bass, and a mint tin of broken strings labeled in marker: `evidence`. Fragment F-10.
- `demo_cdr` | **Low Orbit demo CD-R** | R | Act 2 | Found via `vinyl_shelf` 2L. Sharpie: *"we'll fix the mix later."* If played on the laptop-less flat's old stereo: one song, unmixed, drums too loud, alive.
- `alarm_clock` | **Alarm clock** | A | Act 1 | Blinking 00:00 since a power cut nobody reset. "Time has been optional here for a while."
- `photo_dad` | **Photo of his dad** | A | Act 2 | Tucked into the mirror frame, not displayed, not hidden. "Kept at the exact distance he could stand."

### Balcony *(warm memories only, Hard Rule 10)*
- `two_chairs` | **Two folding chairs** | M | Act 1 | Fragment F-11 (the nights out here; the leaning-back-too-far incident).
- `caps_jar` | **Jar of bottle caps** | A | Act 1 | Years of them. "An archive of good evenings, kept in glass."
- `string_lights` | **String lights** | system | Act 1 | They still work. Turning them on is optional; if on, they're visible from the street in the final shot.
- `empty_pots` | **Stack of empty pots** | A *(2L)* | Act 1 | 2L after `zlatan_plant` 2L: "He was getting back to it. The pots were waiting. So was everything."

---

## 6. FRAGMENT LIST (memory overlays)

| ID | Trigger object | Act | Beat (3-6 lines of PC interior monologue) |
|---|---|---|---|
| F-01 | `photo_hike_framed` | 1 | Year one. His idea. It rained the whole way up and he called it perfect: "nobody else gets the view when it rains." |
| F-02 | `team_bib` | 1 | Nobody wants to play keeper. He raised his hand every single week like it was an honor. |
| F-03 | `zlatan_plant` | 1 | The naming ceremony. He watered it with a wine glass because "Zlatan deserves stemware." |
| F-04 | `game_controller` | 1 | The co-op save at 83%. You were saving the last level "for a good night." |
| F-05 | `fridge_towel` | 1 | The war with the fridge, dramatized. He lost for years. The towel was his masterpiece. |
| F-06 | `mug_chipped` | 1 | You chipped it the first month he lived here. He declared it legally yours at a small ceremony. |
| F-07 | `cologne` | 1 | Shortest fragment. Smell is the fastest road back. One image: him late, jogging to meet you, smelling like this. |
| F-08 | `dad_lighter` | 2 | He didn't smoke. He carried his father's fire in his pocket for eight years and lit other people's birthdays with it. |
| F-09 | `phone_dead` (on pickup) | 1 | The hospital, age 19. Him printing your name in the emergency contact line: "so Mum never gets a call like that again." You signed witness like it was nothing. It was not nothing. |
| F-10 | `bass_case` | 2 | Low Orbit's one real gig. The broken string mid-set, and him finishing the song anyway, laughing, on three strings. |
| F-11 | `two_chairs` | 1 | Summer nights out here. The time he leaned back too far and grabbed the string lights and they held. The whole street heard you both. |
| F-12 | `pc_bag` receipts | 3 | Eight envelopes in your handwriting. What you told everyone. What you were actually buying: a door that stayed closed. Text §7.8. |

**Second-Look pairs** are defined inline in §5 (marked *2L*). Global rule: 2L text reframes, never confirms (Hard Rule 4, §9).

---

## 7. KEYSTONE TEXTS (verbatim, in-game)

### 7.1 `lena_note` | Lena's note (entry table)
> I took Dad's watch and the albums from the big shelf. I couldn't do more. I'm sorry.
> Whatever you keep of his, keep it because it's *him*, not because it hurts to put it down. He would hate that.
> Ship me the keep box, I'll pay for it. Call me when you're done.
> Please don't do this alone.
> L.

*(The player is, of course, doing it alone. No text points this out.)*

### 7.2 `rako_note` | Mr. Rako's note (mail slot)
> Sorry to write again. The new tenants come on the 1st, I cannot move it more.
> Leave the key in the bowl like always, I will come up after.
> He was a good boy. He fixed my radio and would not take money for it.
> E. Rako

### 7.3 `notebook_4am` | the 4 a.m. notebook (bedside)
Three entries, times only, no dates:
> **04:10**
> toast again. the fridge won tonight. need a thicker towel.
>
> **03:40**
> rewatched the semifinal. we were so loud that night the neighbors banged on the wall and Dad banged back. still the funniest thing I've ever seen him do.
>
> **04:55**
> tired of being tired. gym tomorrow.
> *(beneath, in different ink:)* didn't. tuesday then.

*(Design note: exhausted, honest, self-aware, and pointed at tomorrow. No ideation, no plans, ever. The referral letter (`referral_letter`) carries no additional text: the worn envelope IS the writing.)*

### 7.4 Letters
**`recipe_card` companion, Vera's letter (kitchen drawer):**
> My Niko. I am sending the proper recipe because whatever you are making from memory is wrong, I can feel it from here. Double the lemon. Are you eating? Send a photo of the plant, not the sky this time.
> Your mother.

**`mira_draft`, Mira's unsent letter (under-bed box, folded many times):**
> M,
> I keep starting this and it turns into a list of things I should have said in October, so here is the shortest version. None of it was your fault, and most of it was good. The blue mug is yours whenever you want it.
> *(unsigned, unfinished)*

*(Never dated. Whether he wrote it the week they ended or much later is Ambiguity #2.)*

### 7.5 `job_application` | cover letter draft (desk, red-pen edits)
> ...seven years across motion and illustration, most recently freelance. I work best on small teams, and I am trying to work smaller and slower on purpose...
> *(red pen, margin:)* too honest?
> *(red pen, lower:)* keep it. they should know who's showing up.

### 7.6 Hike photo captions (backs, his handwriting)
- Year 1 (framed): *"first one. your idea actually. it rained the whole way and you said good. nobody else gets the view when it rains."* *(He credits the PC; F-01 remembers it as his idea. Neither is corrected. Grief and memory disagree politely.)*
- Year 3: *"same spot. you were late. documented for the record."*
- Year 5: *"same spot. we look 12. we have always looked 12."*
- Year 7 (last): *"same spot. brought the film camera, lost the light, kept the blur one anyway. best one."*

### 7.7 `phone_dead` | the thread (Act 3, phone overlay)
Last exchange, timestamps visible:
> **Niko, Thu 23:42:** [photo: hike, year one] found this backing up the drive. year one. we look 12
> **Niko, Thu 23:42:** same spot in spring? i'll bring the good camera this time
> **You, Fri 08:15:** haha we do. crunch is killing me, will reply properly tonight
> *(Seen. No reply was sent. The thread ends.)*

In the message box, an unsent draft, saved by the phone, timestamp unrecoverable:
> **Draft:** yeah spring works. also wanted to say

*(It ends there. It is an ordinary text, interrupted by something as small as a kettle or as large as anything. What he wanted to say is Ambiguity #1, and the game never speculates.)*

### 7.8 `pc_bag` | the rent receipts (Act 3)
Eight envelopes, your handwriting, one per month. On examine:
> You told Lena the landlord was being flexible. You told yourself it was practical, someone had to deal with the flat eventually.
> Eight receipts. What you were paying for was the door staying shut.
> Tonight you stopped.

---

## 8. ACT BEATS & SCRIPTED SCENES

### 8.1 Opening (Act 1)
Black screen. Rain. Key in lock, the specific loose-cylinder sound of a door you've opened a thousand times. Interior title card: *"November. The lease ends Sunday."* First interactables: light switch, `lena_note`, `rako_note`.

### 8.2 The chime (Act 2 → 3)
The phone charges in real time (~4 min) while the player keeps sorting. The chime is quiet and lands mid-task, wherever the player is. Everything about the sound design should make the player stop on their own. No forced camera.

### 8.3 The desk scene (Act 3): *the no-note beat*
After reading the thread, `desk` activates. Interaction becomes rapid: drawers open in sequence, papers lift, the PC's monologue shortens to fragments: *"invoices... warranty... sketches... nothing... nothing..."*. Drawer sounds get faster, then stop. Long silence on the last empty drawer. Then, one line:
> Most people don't leave one. You knew that. You looked anyway.

Nothing else. No music sting. The rain continues. *(Hard Rule 3: this absence is the scene. It must never be "fixed.")*

### 8.4 Ending sequence
1. The **SHIP TO LENA** box seals (tape sound, printed label with her address).
2. Prompt: **"Take one thing."** The player picks any single object from the keep box. No commentary on the choice; it slides into your bag beside the eight envelopes.
3. Your own phone buzzes softly, not a call; you open **Saved voicemails**, one entry, two years old:
   > *(street noise, wind)* okay so, update... Beni says if we win tonight he's naming the sauce after us... *(laughing, losing it)*... that's it, that's the whole message. bring cash. see you Wednesday. *(click)*
4. Key in the bowl. String lights off, unless the player left them on, in which case they stay on, visible from the street below in the final exterior shot.
5. Door. Stairwell. Grey-gold morning. Rain stopped.
6. Final card, small type: *"If you're carrying something like this, you don't have to sort it alone."* → resources screen (§11).

---

## 9. AMBIGUITY LEDGER: questions the game must NEVER answer

1. What the unsent draft was going to say.
2. When Mira's letter was written, and exactly why they ended.
3. Who the second concert ticket was for.
4. Whether the 4 a.m. entries were his worst nights or ordinary insomnia.
5. Why he never called the referral number, and what would have happened if he had.
6. Whether anyone, including the player, could have changed anything. *(Hard Rule 8.)*
7. "Why." The game's answer to why is the whole flat, and the whole flat is not an answer.

Any generated content (second-look text, ambient examines, future additions) must be checked against this ledger.

---

## 10. WHAT NIKO IS NOT: characterization guardrails

Not a mystery to be solved. Not a cautionary tale. Not a saint (he was late constantly, ducked hard conversations, let invoices rot, once alphabetized the vinyl during an argument to win it by attrition). Not defined by his death. The player should leave knowing his *laugh*, not his diagnosis. He is a whole person who was also struggling. Both, always, in the same frame.

---

## 11. ADVISORY & RESOURCES (title screen + ending)

**Advisory (before main menu):**
> This game is about losing a friend to suicide. It contains grief and depictions of depression. It does not depict the act, the method, or the death itself.
> Play gently. You can pause any time. The flat will wait.
> If you or someone you love is struggling, support is real and reachable: **[local crisis line, see docs/resources.md]** · **findahelpline.com**

**Implementation:** `docs/resources.md` holds region-configurable resource entries; default international pointer is findahelpline.com. **Verify any local numbers (e.g., for an Albanian release) against current official sources before shipping. Do not hardcode unverified numbers.** Resources screen is reachable from the pause menu at all times.

---

## 12. IMPLEMENTATION NOTES (for Claude Code)

**Suggested repo docs:** this file at `docs/LORE_BIBLE.md`. Generate `data/objects.json` from §5 (schema below) so narrative lives in data, not code.

```json
{
  "id": "zlatan_plant",
  "name": "Zlatan (monstera)",
  "room": "living_room",
  "type": ["memory"],
  "act_min": 1,
  "sortable": false,
  "fragment": "F-03",
  "examine": "Freshly repotted. The soil is still dark.",
  "second_look": {
    "requires_flag": "referral_read",
    "text": "Repotted within his last month. He was taking care of things. You fill a glass and water it."
  }
}
```

**State flags:** `act`, `sorted_count`, `phone_found`, `charger_found`, `phone_charging_started_at`, `phone_on`, `underbed_found`, `referral_read`, `mira_read`, `thread_read`, `desk_done`, `receipts_found`, `lights_on`, `record_playing`, plus per-object `examined` / `sorted_to`.

**Tech beats already implied by design:** raycast interaction + outline highlight; paper/phone UI overlays; real-time charge timer; audio state machine (rain bed, fridge hum → muffled hum, radiator ticks, optional record); lighting states per act; a save system is optional (single-sitting game) but auto-checkpoint per act is kind.

**Content-generation guardrails for any AI-assisted pass:** re-read §0 and §9 first. Never add: a note, a method reference, a medication object, a cause, a verdict, or dark balcony content. When generating filler ambient examines, keep them in the PC's voice: dry, precise, feeling more than it says.

*End of bible v1.0. Niko throughout. The flat will wait.*

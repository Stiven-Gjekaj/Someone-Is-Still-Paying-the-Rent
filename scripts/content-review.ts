/**
 * The v0.6 content read, as data.
 *
 * `docs/CONTENT_REVIEW.md` carries the arguments. This carries the row set: one
 * entry per player-facing string, so that a string nobody read is a build
 * failure rather than an omission somebody has to notice.
 *
 * Two things are enforced by `scripts/validate-content.ts`:
 *
 * 1. **Completeness.** Every string the validator collects must have an entry
 *    here, and every entry here must correspond to a string. The plan for this
 *    pass asked for a visible row per string in the review document. A table of
 *    262 rows reading "pass" is the rubber stamp the pass exists to prevent, and
 *    nobody would scroll it. This is the same guarantee, made by a check instead
 *    of by a reader's diligence, and the deviation is written down in the review
 *    document rather than made quietly.
 * 2. **Drift.** `text` is the string as it was read. Editing the string without
 *    editing this file fails the build, because the verdict was about the words.
 *
 * An entry with no `notes` means read, with nothing to argue. That is most of
 * them, and it should be: the corpus is largely a dead man's plants and mugs and
 * five-a-side bib. The entries with notes are the ones worth a human's attention,
 * and they are reproduced in full in the review document.
 */

/** The six passes of the read. See `docs/CONTENT_REVIEW.md`. */
export type Pass =
  | 'rule4'
  | 'rule5'
  | 'rule8'
  | 'section9'
  | 'section10'
  | 'cumulative'

export interface Verdict {
  /** The string as it was read. A change here means the verdict is stale. */
  text: string
  /**
   * What a pass had to argue about this string. Present only where there was an
   * argument: the adversarial case first, then why the verdict came out where it
   * did. Absent means the pass read it and had nothing to say.
   */
  notes?: Partial<Record<Pass, string>>
}

/** Keyed by the same `where` label the validator uses, in the same order. */
export const READ: Record<string, Verdict> = {
  "object lena_note name": { text: "Lena's note" },
  "object lena_note examine": { text: "Weighted down with the key bowl so it would be the first thing you saw. Her handwriting gets smaller toward the bottom of the page." },
  "object rako_note name": { text: "Mr. Rako's note" },
  "object rako_note examine": { text: "Pushed through the mail slot, face down on the mat. You already know what it says. You read it anyway." },
  "object key_bowl name": { text: "Key bowl" },
  "object key_bowl examine": { text: "Chipped ceramic, made by Mira. You've dropped keys in it a hundred times without looking at it. You look at it." },
  "object boots_muddy name": { text: "Muddy football boots" },
  "object boots_muddy examine": { text: "By the door, where he kicked them off. The mud dried a long time ago." },
  "object boots_muddy second_look": {
    text: "The mud is from a Wednesday in March. He played four days before. Everyone said he was man of the match, and nobody can bear that it's true.",
    notes: {
      rule8:
        'Against: "He played four days before" is the no-warning-signs move, and no '
        + 'warning signs is a verdict. It says there was nothing to catch, which answers '
        + 'the question Rule 8 forbids answering, in the direction that comforts. '
        + 'For: the sentence is about him being alive four days earlier, not about what '
        + 'anybody could see, and the bible fixes the detail in section 2.3. Nothing '
        + 'here says anyone looked, or that looking would have shown something. '
        + 'Verdict: pass, and it is the tightest pass in the corpus. The clause that '
        + 'saves it is "nobody can bear that it\'s true", which turns the reader back '
        + 'toward grief before the inference can finish.',
    },
  },
  "object team_bib name": { text: "Bib #1" },
  "object team_bib examine": { text: "Number one. Nylon, stretched at the neck from six years of being pulled on over a coat." },
  "object corkboard name": { text: "Corkboard" },
  "object corkboard examine": { text: "Takeaway menus, a five-a-side schedule, a 5:45 a.m. gym class circled in pen." },
  "object corkboard second_look": { text: "The 5:45 class, circled. You never once knew him to be up before nine. Now you wonder which side of sleep this was on." },
  "object pc_bag name": { text: "Your bag" },
  "object pc_bag examine": { text: "You brought it in and put it down without thinking, the way you have every month for eight months." },
  "object sorting_boxes name": { text: "The three boxes" },
  "object sorting_boxes examine": { text: "SHIP TO LENA. DONATE. LET GO. You wrote the labels yourself, in marker, standing up." },
  "object vinyl_shelf name": { text: "Vinyl shelf" },
  "object vinyl_shelf examine": {
    text: "Alphabetized, rigorously, by a man who alphabetized nothing else in his life. One record is out of place.",
    notes: {
      section10:
        'A gap rather than a violation. Section 10 lists four things that keep Niko '
        + 'off a pedestal: he was late constantly, ducked hard conversations, let '
        + 'invoices rot, and once alphabetized the vinyl during an argument to win it by '
        + 'attrition. Three of the four are in the corpus (F-07 for the lateness, the '
        + 'unsent draft for the ducking, finances_folder for the invoices). The fourth '
        + 'is not: this string carries the trait but not the anecdote, and the anecdote '
        + 'is the only one of the four where he is actively unkind to somebody. '
        + 'Not fixed. Writing the missing anecdote means writing new prose to fill a '
        + 'hole I found in my own work, which is the overreach the human-only '
        + 'designation exists to prevent. Recorded so a person can decide.',
    },
  },
  "object vinyl_shelf second_look": { text: "The record out of place is not out of place. There is a paper sleeve behind it, filed where nobody tidying up would ever look." },
  "object record_player name": { text: "Record player" },
  "object record_player examine": { text: "Lid up. Still plugged in. The needle is sitting where he left it." },
  "object record_player second_look": { text: "You lift the needle off. The room goes back to the rain, and it takes a second to notice how much smaller it got." },
  "object zlatan_plant name": { text: "Zlatan (monstera)" },
  "object zlatan_plant examine": { text: "Freshly repotted. The soil is still dark." },
  "object zlatan_plant second_look": { text: "Repotted within his last month. He was taking care of things. You fill a glass and water it." },
  "object photo_hike_framed name": { text: "Framed hike photo (year one)" },
  "object photo_hike_framed examine": { text: "Year one. The only one he ever framed. Both of you soaked through and grinning about it." },
  "object photo_hike_box name": { text: "Shoebox of hike photos (years 2-7)" },
  "object photo_hike_box examine": { text: "Six more, loose in a shoebox, in order. He wrote on the back of every one of them." },
  "object concert_tickets name": { text: "Two concert tickets" },
  "object concert_tickets examine": { text: "Two of them, paper, for a show in April. He bought them in February." },
  "object concert_tickets second_look": {
    text: "Two tickets. You assumed Mira, but the date is after they ended. You will never get to ask who the second one was for.",
    notes: {
      section9:
        'Ledger question 3, who the second ticket was for, refused in the text itself: '
        + '"You will never get to ask." The game closes the question by name rather than '
        + 'by omission, which is the strongest form of refusal available to it and the '
        + 'only place in the corpus that uses it. '
        + 'Verdict: pass.',
    },
  },
  "object library_books name": { text: "Library books" },
  "object library_books examine": { text: "Three of them, due back in April. One has a receipt shoved in two-thirds through, holding his place." },
  "object sketchbook_new name": { text: "New sketchbook" },
  "object sketchbook_new examine": { text: "Barely used. Three pages, each dated in the corner, all of them inside his last month." },
  "object sketchbook_new second_look": { text: "Starting again. Or trying to. Both are true." },
  "object game_controller name": { text: "Second controller" },
  "object game_controller examine": { text: "The second one. Yours, functionally, for about nine years. The left stick still drifts." },
  "object desk name": { text: "The desk" },
  "object desk examine": { text: "His desk. Paper everywhere. Later." },
  "object desk second_look": { text: "You went through all of it. The paper is back in roughly the wrong order, and it is a desk again." },
  "object job_application name": { text: "Cover letter draft" },
  "object job_application examine": { text: "A printout near the top of the desk pile, marked up in red pen. He was arguing with himself and losing generously." },
  "object finances_folder name": { text: "Invoice folder" },
  "object finances_folder examine": { text: "Polite reminders at the front, final notices at the back, in order. On the back of a gig flyer, a budget in his handwriting that almost balances." },
  "object demo_cdr name": { text: "Low Orbit demo CD-R" },
  "object demo_cdr examine": { text: "A paper sleeve, one line of Sharpie across it: we'll fix the mix later." },
  "object blanket_sofa name": { text: "Sofa blanket" },
  "object blanket_sofa examine": { text: "It still smells like the flat. The flat still smells like him." },
  "object fridge_photos name": { text: "Fridge magnets and photos" },
  "object fridge_photos examine": { text: "Other people's weddings, a postcard from his mother, a magnet from a town neither of you has been to. Something glossy is peeking out from behind the team photo." },
  "object team_photo name": { text: "The team photo" },
  "object team_photo examine": { text: "Eleven of them squinting into the sun, one caught mid-blink. He is the only one in gloves, and the only one who looks certain about anything." },
  "object fridge_towel name": { text: "Towel under the fridge" },
  "object fridge_towel examine": { text: "Folded into quarters and wedged under the front left corner. Engineering, of a kind." },
  "object fridge_towel second_look": { text: "It works. It always worked. You just never noticed the quiet." },
  "object junk_drawer name": { text: "Junk drawer" },
  "object junk_drawer examine": { text: "Stuck. Everything in it is a monument to 'later.'" },
  "object junk_drawer second_look": { text: "It gives on the third pull, the way it always did. Batteries, takeaway chopsticks, forty pen caps, and his charger, coiled the way he coiled things." },
  "object mug_chipped name": { text: "The chipped mug" },
  "object mug_chipped examine": { text: "Yours, by a designation he took more seriously than most legal documents. The chip is on the left, where you drink from." },
  "object mug_blue name": { text: "The blue mug" },
  "object mug_blue examine": { text: "Second shelf, front left, handle turned out. You have never once seen him drink from it." },
  "object mug_blue second_look": { text: "Hers. He kept it where it had always gone, like the cupboard hadn't heard yet." },
  "object recipe_card name": { text: "Vera's recipe card" },
  "object recipe_card examine": { text: "Grease-spotted, in his mother's handwriting, propped against the tin where he could see it while he cooked. There is a letter folded behind it." },
  "object calendar_wall name": { text: "Wall calendar" },
  "object calendar_wall examine": { text: "Still on March. You could turn it. You don't." },
  "object cuttings_jar name": { text: "Plant cuttings jar" },
  "object cuttings_jar examine": { text: "On the windowsill, roots visible through the glass. Still alive. He was propagating. Plural. Plans, plural." },
  "object cologne name": { text: "Almost-empty cologne" },
  "object cologne examine": { text: "A centimetre left in the bottom of it. You take the cap off without deciding to." },
  "object spare_towel name": { text: "The spare towel" },
  "object spare_towel examine": { text: "Yours. For the nights that ended here. It's been folded on this shelf for eight months." },
  "object appt_card name": { text: "Old appointment card" },
  "object appt_card examine": {
    text: "A counselling service, three years old. CANCELLED written across it in his hand. He kept it anyway.",
    notes: {
      rule5:
        'The one gap the adjacency check found, and it is recorded in full as '
        + 'OPEN_TO_A_HUMAN in scripts/validate-content.ts, printed on every validate '
        + 'run. In short: this is a middle-layer discovery in a room whose other three '
        + 'objects are the player\'s grief rather than his life, so there is no evidence '
        + 'of a future he was still building anywhere near it. Hard Rule 6 keeps the '
        + 'bathroom sparse on purpose, so two rules meet here and the second one loses. '
        + 'Not fixed. The fix available to me was to reclassify the card as warm, which '
        + 'is making a failure go away rather than answering it.',
    },
  },
  "object toothbrush_cup name": { text: "Toothbrush cup" },
  "object toothbrush_cup examine": { text: "One toothbrush. The single most ordinary object in the world, and you have to hold the sink for a second." },
  "object phone_dead name": { text: "His phone" },
  "object phone_dead examine": { text: "Face-down on the bedside table, where they put it back. Dead. The charger wasn't with it." },
  "object phone_dead second_look": { text: "You plug it in behind the table, where the socket has always been. Nothing happens for a while, the way nothing happens for a while." },
  "object referral_letter name": { text: "The referral letter" },
  "object referral_letter examine": { text: "In the bedside drawer, on top. The envelope is soft and grey along the folds, the way paper gets when it is opened and put away and opened again." },
  "object notebook_4am name": { text: "The 4 a.m. notebook" },
  "object notebook_4am examine": {
    text: "A cheap notebook on the bedside table, three entries in and blank after that. He wrote the times but never the dates.",
    notes: {
      rule4:
        'Against: "blank after that" invites one reading, which is that he stopped '
        + 'writing because it got worse. A record that ends is a record that means '
        + 'something by ending. '
        + 'For: cheap notebooks are three entries long for everybody, and the sentence '
        + 'says so by calling it cheap. '
        + 'Verdict: pass.',
      section9:
        'Ledger question 4 is whether the 4 a.m. entries were his worst nights or '
        + 'ordinary insomnia. "He wrote the times but never the dates" is the defence, '
        + 'and it is a good one: without dates the entries cannot be aligned against '
        + 'March, against the breakup, or against each other. The game removed the '
        + 'evidence rather than declining to comment on it. '
        + 'Verdict: pass, and this is the single best-built refusal in the corpus.',
    },
  },
  "object underbed_box name": { text: "The under-bed box" },
  "object underbed_box examine": { text: "A shoebox pushed to the far side, against the wall, where you would have to be looking to find it." },
  "object hoodie_mira name": { text: "The hoodie" },
  "object hoodie_mira examine": { text: "Not his size. Washed and folded before it went into the box, which is the part that gets you." },
  "object photobooth_strip name": { text: "Photo-booth strip" },
  "object photobooth_strip examine": { text: "Four frames. They behave for the first two. By the third they are laughing, and after that neither of them looks at the camera again." },
  "object mira_draft name": { text: "Mira's unsent letter" },
  "object mira_draft examine": { text: "Folded and refolded until the creases went soft. Never sent. Never thrown out either." },
  "object dad_lighter name": { text: "His father's lighter" },
  "object dad_lighter examine": { text: "Brass, worn smooth on one side from eight years in a pocket. It still has fuel in it." },
  "object wardrobe name": { text: "Wardrobe" },
  "object wardrobe examine": { text: "The Low Orbit tour shirt, for a tour that never happened. A winter coat with two ticket stubs and a receipt in the pocket. A folder on the top shelf that you will get to." },
  "object bass_case name": { text: "Bass case" },
  "object bass_case examine": { text: "Upright in the corner, latches still done up. Inside: the bass, and a mint tin of broken strings labeled in marker. Evidence." },
  "object alarm_clock name": { text: "Alarm clock" },
  "object alarm_clock examine": {
    text: "Blinking 00:00 since a power cut nobody reset. Time has been optional here for a while.",
    notes: {
      rule4:
        'Against: "Time has been optional here for a while" gives a decline a '
        + 'duration. It is the narrator asserting that his relationship to days and '
        + 'nights had come apart, and it puts a length on it. Paired with the 4 a.m. '
        + 'notebook that is a sleep thread with a timeline, which is most of the way to '
        + 'a cause. '
        + 'For: a clock blinking since a power cut is a fact about every flat anybody '
        + 'has ever lived in, and the line is wry rather than clinical. It attributes '
        + 'nothing and diagnoses nothing. '
        + 'Verdict: pass. It is the closest thing in the corpus to a decline marker '
        + 'with a clock on it, and it survives because it is funny.',
    },
  },
  "object photo_dad name": { text: "Photo of his dad" },
  "object photo_dad examine": {
    text: "Tucked into the mirror frame, not displayed, not hidden. Kept at the exact distance he could stand.",
    notes: {
      rule4:
        'Against: "the exact distance he could stand" asserts an interior state and '
        + 'measures it. The narrator is claiming to know how much of his father he could '
        + 'take, which makes eight-year-old grief a live wound with a gauge on it. '
        + 'For: it is a claim about the photograph\'s position, which is a thing the '
        + 'player can see, and the bible deliberately puts the father\'s anniversary in '
        + 'July so nothing about the timing lines up with March. Nothing anywhere in the '
        + 'corpus connects the father to the death. '
        + 'Verdict: pass. The de-alignment is doing the work and it is doing it in the '
        + 'bible rather than in the string, which is worth a human knowing.',
    },
  },
  "object two_chairs name": { text: "Two folding chairs" },
  "object two_chairs examine": { text: "Two. Never one, never three. Angled slightly toward each other, the way you both left them." },
  "object caps_jar name": { text: "Jar of bottle caps" },
  "object caps_jar examine": { text: "Years of them. An archive of good evenings, kept in glass." },
  "object string_lights name": { text: "String lights" },
  "object string_lights examine": { text: "Strung corner to corner, the same way for six summers. Still, against all odds, working." },
  "object empty_pots name": { text: "Stack of empty pots" },
  "object empty_pots examine": { text: "Terracotta, four of them, stacked and clean and waiting for spring." },
  "object empty_pots second_look": { text: "He was getting back to it. The pots were waiting. So was everything." },
  "fragment F-01 beat": { text: "Year one. His idea. It rained the whole way up and he called it perfect: \"nobody else gets the view when it rains.\"" },
  "fragment F-01 line 0": { text: "His idea, the first one. He had it in a kebab shop at one in the morning." },
  "fragment F-01 line 1": { text: "It rained from the car park to the top." },
  "fragment F-01 line 2": { text: "You said something about turning back. He kept walking." },
  "fragment F-01 line 3": { text: "There was no view up there at all, just white, and he called it perfect. Nobody else gets the view when it rains." },
  "fragment F-01 line 4": { text: "You took the photo to make him stop talking." },
  "fragment F-02 beat": { text: "Nobody wants to play keeper. He raised his hand every single week like it was an honor." },
  "fragment F-02 line 0": { text: "Nobody wants to go in goal." },
  "fragment F-02 line 1": { text: "Every Wednesday, eleven grown men studying their own shoes, and his hand already up." },
  "fragment F-02 line 2": {
    text: "He was not good. He was enthusiastic, which is a different thing and much louder.",
    notes: {
      section10:
        'Recorded as the load-bearing string for "not a saint", so that anybody '
        + 'trimming the goalkeeping fragment knows what else goes with it. The corpus '
        + 'has exactly one line that says plainly he was bad at something he loved, and '
        + 'this is it. Everything else in the not-a-saint column is a failure of '
        + 'admin or nerve rather than of ability. '
        + 'Verdict: pass, and it is carrying more than its length suggests.',
    },
  },
  "fragment F-02 line 3": { text: "He kept the bib in his own bag so the job could never be given to anyone else." },
  "fragment F-03 beat": { text: "The naming ceremony. He watered it with a wine glass because \"Zlatan deserves stemware.\"" },
  "fragment F-03 line 0": { text: "The naming took forty minutes and involved a shortlist." },
  "fragment F-03 line 1": { text: "You argued for something ordinary. You lost, on the grounds that ordinary plants die." },
  "fragment F-03 line 2": { text: "He watered it out of a wine glass that first night, because Zlatan deserves stemware." },
  "fragment F-03 line 3": { text: "Every green thing he owned before this one died. He never mentioned them again, out of respect." },
  "fragment F-04 beat": { text: "The co-op save at 83%. You were saving the last level \"for a good night.\"" },
  "fragment F-04 line 0": { text: "Eighty-three percent, and his save slot named so that nobody could delete it by accident." },
  "fragment F-04 line 1": { text: "You were saving the last level for a good night." },
  "fragment F-04 line 2": { text: "There was no shortage of good nights. That was never the problem." },
  "fragment F-04 line 3": {
    text: "You assumed there would be another one. Everyone assumes that. It is how a week gets made.",
    notes: {
      rule8:
        'The strongest Rule 8 candidate in the corpus, and it leans the direction a '
        + 'self-review does not check, because it is the kind one. '
        + 'Against: "Everyone assumes that" universalises the thing the player did. '
        + 'Universalising a failure is absolution, and Rule 8 forbids both verdicts, not '
        + 'just the cruel one. A line that exists to make the player feel better about a '
        + 'specific omission is answering the question. '
        + 'For: what is universalised is the assumption that there will be another good '
        + 'night, and the line never connects that assumption to the death. It is about '
        + 'how time feels when nothing has happened yet. Nothing here says the last '
        + 'level would have changed anything, or that anything would have. '
        + 'Verdict: judgement call, nothing changed. Of everything in the corpus this '
        + 'is the line I would most want a second reader on, because I cannot tell '
        + 'whether I am defending it or excusing it.',
    },
  },
  "fragment F-05 beat": { text: "The war with the fridge, dramatized. He lost for years. The towel was his masterpiece." },
  "fragment F-05 line 0": { text: "The fridge hummed in a key he described, seriously, as hostile." },
  "fragment F-05 line 1": { text: "Two years of shims. A folded envelope. A paperback he had not enjoyed." },
  "fragment F-05 line 2": { text: "Then the towel, quartered, wedged under the front left corner." },
  "fragment F-05 line 3": { text: "He called you at eleven at night to listen to nothing. You listened to nothing for a full minute. Best call of that year." },
  "fragment F-06 beat": { text: "You chipped it the first month he lived here. He declared it legally yours at a small ceremony." },
  "fragment F-06 line 0": { text: "You chipped it on the tap, first month he lived here." },
  "fragment F-06 line 1": { text: "There was a ceremony. There was a speech. The speech was deliberately too long." },
  "fragment F-06 line 2": { text: "From then on it was your mug, and guests were informed." },
  "fragment F-06 line 3": { text: "He never drank from it again. It was yours, and he was strict about it." },
  "fragment F-07 beat": { text: "Shortest fragment. Smell is the fastest road back. One image: him late, jogging to meet you, smelling like this." },
  "fragment F-07 line 0": { text: "He is late." },
  "fragment F-07 line 1": { text: "He is jogging up the street with his coat open, apologising before he is close enough to be heard." },
  "fragment F-07 line 2": { text: "He smells like this." },
  "fragment F-08 beat": { text: "He didn't smoke. He carried his father's fire in his pocket for eight years and lit other people's birthdays with it." },
  "fragment F-08 line 0": { text: "He never smoked a day in his life." },
  "fragment F-08 line 1": { text: "He carried it for eight years anyway. Right-hand pocket, always the right-hand pocket." },
  "fragment F-08 line 2": { text: "Other people's candles. Other people's cigarettes, outside, in the cold, while he stood there not smoking." },
  "fragment F-08 line 3": { text: "You never asked him about it. It seemed like the kind of thing you did not ask about." },
  "fragment F-09 beat": { text: "The hospital, age 19. Him printing your name in the emergency contact line: \"so Mum never gets a call like that again.\" You signed witness like it was nothing. It was not nothing." },
  "fragment F-09 line 0": { text: "The hospital, the year his father died. A clipboard, a biro on a string." },
  "fragment F-09 line 1": { text: "He printed your name into the emergency contact line without asking whether you minded." },
  "fragment F-09 line 2": { text: "So Mum never gets a call like that again." },
  "fragment F-09 line 3": { text: "You signed underneath as the witness, in the corridor, standing up." },
  "fragment F-09 line 4": { text: "You were nineteen. It took four seconds. You did not think about it once in eight years, and then you thought about nothing else." },
  "fragment F-10 beat": { text: "Low Orbit's one real gig. The broken string mid-set, and him finishing the song anyway, laughing, on three strings." },
  "fragment F-10 line 0": { text: "One real gig. Forty people, most of them related to somebody on stage." },
  "fragment F-10 line 1": { text: "The string went in the second song. You heard it go from the back of the room." },
  "fragment F-10 line 2": { text: "He finished on three, laughing, and not one person out there could tell." },
  "fragment F-10 line 3": { text: "Tomi still says they were tight that night. Tomi was and remains a liar." },
  "fragment F-11 beat": { text: "Summer nights out here. The time he leaned back too far and grabbed the string lights and they held. The whole street heard you both." },
  "fragment F-11 line 0": { text: "Summer. Both chairs out, the door propped open with a boot." },
  "fragment F-11 line 1": {
    text: "He tipped his chair back one time too many and caught the lights on the way.",
    notes: {
      cumulative:
        'The second finding against a rule that was not one of the six passes. Hard '
        + 'Rule 10: nothing on the balcony, or any elevated point, may carry dark '
        + 'connotation. '
        + 'Against: a man going over backwards on a balcony, and the word "held" two '
        + 'lines later, is a near-fall from height in a game about a man who died. The '
        + 'lexicon cannot catch it because every word in it is innocent. '
        + 'For: the register is entirely comic and stays that way through the applause '
        + 'from another flat, and the fragment is verbatim from the bible at line 206, '
        + 'written by the same document that writes Rule 10 at line 26. The author of '
        + 'the rule did not read this as dark. '
        + 'Verdict: pass, and it is the sharpest object on the balcony by a distance. '
        + 'Recorded because "the bible wrote it" is a reason to believe the reading, not '
        + 'a reason to skip making it.',
    },
  },
  "fragment F-11 line 2": { text: "They held. Of course they held. He had put them up himself, with a great deal more hardware than the job needed." },
  "fragment F-11 line 3": { text: "You both made a noise the whole street heard. Somebody in another flat applauded." },
  "fragment F-12 beat": { text: "Eight envelopes in your handwriting. What you told everyone. What you were actually buying: a door that stayed closed. Text 7.8." },
  "fragment F-12 line 0": { text: "Eight envelopes. Your handwriting on every one of them." },
  "fragment F-12 line 1": { text: "You told Lena the landlord was being flexible. You told Mr. Rako you were handling the estate." },
  "fragment F-12 line 2": { text: "You told yourself it was practical, and practical is an excellent place to keep something you would rather not look at." },
  "fragment F-12 line 3": { text: "What you were buying, every month, on time, was a door that stayed shut." },
  "text lena_note title": { text: "Lena's note" },
  "text lena_note block 0 text": { text: "I took Dad's watch and the albums from the big shelf. I couldn't do more. I'm sorry." },
  "text lena_note block 1 text": { text: "Whatever you keep of his, keep it because it's him, not because it hurts to put it down. He would hate that." },
  "text lena_note block 2 text": { text: "Ship me the keep box, I'll pay for it. Call me when you're done." },
  "text lena_note block 3 text": { text: "Please don't do this alone." },
  "text lena_note block 4 text": { text: "L." },
  "text rako_note title": { text: "Mr. Rako's note" },
  "text rako_note block 0 text": { text: "Sorry to write again. The new tenants come on the 1st, I cannot move it more." },
  "text rako_note block 1 text": { text: "Leave the key in the bowl like always, I will come up after." },
  "text rako_note block 2 text": { text: "He was a good boy. He fixed my radio and would not take money for it." },
  "text rako_note block 3 text": { text: "E. Rako" },
  "text notebook_4am title": { text: "The 4 a.m. notebook" },
  "text notebook_4am block 0 text": { text: "toast again. the fridge won tonight. need a thicker towel." },
  "text notebook_4am block 0 time": { text: "04:10" },
  "text notebook_4am block 1 text": { text: "rewatched the semifinal. we were so loud that night the neighbors banged on the wall and Dad banged back. still the funniest thing I've ever seen him do." },
  "text notebook_4am block 1 time": { text: "03:40" },
  "text notebook_4am block 2 text": { text: "tired of being tired. gym tomorrow." },
  "text notebook_4am block 2 time": { text: "04:55" },
  "text notebook_4am block 3 text": { text: "didn't. tuesday then." },
  "text notebook_4am block 3 where": { text: "beneath, in different ink" },
  "text referral_letter title": { text: "The referral letter" },
  "text referral_letter block 0 text": { text: "A date, a service, and a number to call." },
  "text referral_letter block 1 text": {
    text: "(The folds have been opened and closed enough times that the paper has gone soft. He never called.)",
    notes: {
      rule4:
        'Against: this is the last clause of the last block of the document, and it is '
        + 'the only closing clause on any thread in the game. Terminal position is '
        + 'emphasis. A reader looking for the reason finds the one sentence shaped like '
        + 'an ending and takes it. '
        + 'For: it states a fact and stops. No reason is offered, no consequence is '
        + 'drawn, and the sentence before it establishes that he kept going back to the '
        + 'letter, which is the opposite of dismissal. '
        + 'Verdict: pass as a string. See the cumulative note, where it does not pass '
        + 'as cleanly.',
      section9:
        'Ledger question 5 is why he never called and what would have happened if he '
        + 'had. The block answers neither. It does not speculate, and no other string '
        + 'in the corpus picks the thread back up. '
        + 'Verdict: pass.',
      cumulative:
        'Read against the other four threads this is the finding of the whole pass. '
        + 'Money ends on "keep it. they should know who\'s showing up." Sleep ends on '
        + '"didn\'t. tuesday then." The breakup ends on "Never sent. Never thrown out '
        + 'either." Old grief ends on "You never asked him about it." All four hang '
        + 'open. This one closes. '
        + 'Hard Rule 4 is not violated, because no string ranks the threads and the '
        + 'game never says this was the reason. But the shape of the corpus ranks them '
        + 'whether or not a sentence does, and a hostile reading takes the closed thread '
        + 'because it is the only one shaped like an answer. '
        + 'This is a judgement call and nothing is being changed. It is also the second '
        + 'independent finding pointing at the mental-health material as the thinnest '
        + 'and most terminal part of the game: the Hard Rule 5 adjacency check found the '
        + 'other one at appt_card, from a completely different direction. Two checks '
        + 'converging on the same room is the thing a human should look at first.',
    },
  },
  "text vera_letter title": { text: "Vera's letter" },
  "text vera_letter block 0 text": { text: "My Niko. I am sending the proper recipe because whatever you are making from memory is wrong, I can feel it from here. Double the lemon. Are you eating? Send a photo of the plant, not the sky this time." },
  "text vera_letter block 1 text": { text: "Your mother." },
  "text mira_draft title": { text: "Mira's unsent letter" },
  "text mira_draft block 0 text": { text: "M," },
  "text mira_draft block 1 text": {
    text: "I keep starting this and it turns into a list of things I should have said in October, so here is the shortest version. None of it was your fault, and most of it was good. The blue mug is yours whenever you want it.",
    notes: {
      rule8:
        'Against: "None of it was your fault" is the verdict, in the dead man\'s own '
        + 'words, and the reader is a player who has spent the whole game being called '
        + '"you". Every other second-person string in the corpus addresses the player. '
        + 'This one does not, and it is the one that would matter most if it did. '
        + 'For: the addressee is established twice before the line is reached. The '
        + 'overlay renders the document title "Mira\'s unsent letter" above the blocks '
        + '(src/ui/overlay.ts:227), and block 0 is "M,". A player reaches this sentence '
        + 'having already read who it is to. The block is also verbatim from the bible, '
        + 'section 7.4, so the ambiguity is authored rather than introduced. '
        + 'Verdict: pass, and it depends on the overlay rendering the title. If a future '
        + 'change ever drops the document title, this line loses one of its two '
        + 'disambiguators and should be re-read.',
      section9:
        'Ledger question 2 is when the letter was written and exactly why they ended. '
        + 'Against: "October" is the only month named on the Mira thread, and the '
        + 'concert tickets bound the ending from the other side, so the corpus lets a '
        + 'player narrow it. '
        + 'For: October is when the unsaid things belonged, not when the letter was '
        + 'written, and the letter is undated. Why they ended is never stated by anyone. '
        + '"Most of it was good" is a refusal to give a reason dressed as a summary. '
        + 'Verdict: pass, tighter than expected.',
    },
  },
  "text mira_draft block 2 text": { text: "(unsigned, unfinished)" },
  "text job_application title": { text: "Cover letter draft" },
  "text job_application block 0 text": { text: "...seven years across motion and illustration, most recently freelance. I work best on small teams, and I am trying to work smaller and slower on purpose..." },
  "text job_application block 1 text": { text: "too honest?" },
  "text job_application block 1 where": { text: "red pen, margin" },
  "text job_application block 2 text": { text: "keep it. they should know who's showing up." },
  "text job_application block 2 where": { text: "red pen, lower" },
  "text hike_caption_year_one title": { text: "Year one, on the back" },
  "text hike_caption_year_one block 0 text": { text: "first one. your idea actually. it rained the whole way and you said good. nobody else gets the view when it rains." },
  "text hike_caption_year_one block 0 label": { text: "Year 1" },
  "text hike_captions_box title": { text: "The rest of them, on the backs" },
  "text hike_captions_box block 0 text": { text: "same spot. you were late. documented for the record." },
  "text hike_captions_box block 0 label": { text: "Year 3" },
  "text hike_captions_box block 1 text": { text: "same spot. we look 12. we have always looked 12." },
  "text hike_captions_box block 1 label": { text: "Year 5" },
  "text hike_captions_box block 2 text": { text: "same spot. brought the film camera, lost the light, kept the blur one anyway. best one." },
  "text hike_captions_box block 2 label": { text: "Year 7" },
  "text phone_thread title": { text: "The thread" },
  "text phone_thread block 0 text": { text: "[photo: hike, year one] found this backing up the drive. year one. we look 12" },
  "text phone_thread block 0 sender": { text: "Niko" },
  "text phone_thread block 1 text": { text: "same spot in spring? i'll bring the good camera this time" },
  "text phone_thread block 1 sender": { text: "Niko" },
  "text phone_thread block 2 text": { text: "haha we do. crunch is killing me, will reply properly tonight" },
  "text phone_thread block 2 sender": { text: "You" },
  "text phone_thread block 3 text": {
    text: "(Seen. No reply was sent. The thread ends.)",
    notes: {
      rule8:
        'Against: this is the sharpest object in the game and it exists to show the '
        + 'player the last thing they did not do. Putting it on screen at all leans '
        + 'toward one verdict. '
        + 'For: read the grammar. "No reply was sent" is passive with no agent, where '
        + '"you never replied" was available and is what the sentence means. The passive '
        + 'is the guardrail, and it is deliberate: every other second-person string in '
        + 'the corpus uses "you" without flinching, so the one place it is dropped is '
        + 'the one place naming the actor would be a verdict. Nothing anywhere says the '
        + 'reply would have mattered. '
        + 'Verdict: pass, on the strength of one grammatical choice. Anybody rewriting '
        + 'this line should know that is what is holding it up.',
    },
  },
  "text phone_thread block 4 text": { text: "(In the message box, an unsent draft the phone saved for him. The timestamp is unrecoverable.)" },
  "text phone_thread block 5 text": {
    text: "yeah spring works. also wanted to say",
    notes: {
      section9:
        'Ledger question 1 is what the unsent draft was going to say. It stops on '
        + '"also wanted to say", which is maximally open, and block 4 adds that the '
        + 'timestamp is unrecoverable. '
        + 'Verdict: pass.',
      cumulative:
        'A finding against a rule that was not one of the six passes, surfaced by '
        + 'reading the corpus whole. Hard Rule 3 says there is no suicide note in this '
        + 'game and none may ever be added. There is not one. There is an unsent draft '
        + 'that stops mid-sentence, addressed to the player, with the timestamp '
        + 'explicitly removed. '
        + 'Against: taking the timestamp away serves ledger question 1, but it also '
        + 'removes the only thing that would rule out the draft having been written at '
        + 'the end. A player who wants it to be the note is not contradicted. '
        + 'For: Rule 3 forbids a note existing, not a player imagining one, and it has '
        + 'no "or implied" clause where Rule 1 does. The draft answers an ordinary text '
        + 'about a hike in spring. Unanswerable has to include unanswerable in this '
        + 'direction too, or the game is quietly ruling something out and that is a '
        + 'verdict of its own. '
        + 'Verdict: judgement call, nothing changed. Flagged because a reviewer should '
        + 'reach it deliberately rather than by accident.',
    },
  },
  "text phone_thread block 5 sender": { text: "Draft" },
  "text phone_thread block 6 text": { text: "(It ends there.)" },
  "text pc_receipts title": { text: "The rent receipts" },
  "text pc_receipts block 0 text": { text: "You told Lena the landlord was being flexible. You told yourself it was practical, someone had to deal with the flat eventually." },
  "text pc_receipts block 1 text": {
    text: "Eight receipts. What you were paying for was the door staying shut.",
    notes: {
      rule8:
        'The most accusatory writing in the game, and a careless read flags it. '
        + 'Against: the game is convicting the player, in the second person, of '
        + 'avoidance. That is a verdict. '
        + 'For: it is a verdict about eight months after the death, not about anything '
        + 'before it. Rule 8 is specifically about prevention. The receipts thread never '
        + 'once reaches backwards, and it cannot, because the player only started paying '
        + 'once there was nothing left to prevent. '
        + 'Verdict: pass, and the distinction is worth stating because it is the line '
        + 'a future edit is most likely to blur. Guilt about the aftermath is the '
        + 'game\'s subject. Guilt about the death is the thing it must not adjudicate.',
    },
  },
  "text pc_receipts block 2 text": { text: "Tonight you stopped." },
  "scene opening title_card": { text: "November. The lease ends Sunday." },
  "scene desk_scene block 0 text": { text: "(Drawers open in sequence. Papers lift. The sounds get faster.)" },
  "scene desk_scene block 1 text": { text: "invoices... warranty... sketches... nothing... nothing..." },
  "scene desk_scene block 2 text": { text: "(The sounds stop. Long silence on the last empty drawer.)" },
  "scene desk_scene block 3 text": { text: "Most people don't leave one. You knew that. You looked anyway." },
  "scene desk_scene block 4 text": { text: "(Nothing else. No music sting. The rain continues.)" },
  "scene voicemail block 0 text": { text: "(street noise, wind)" },
  "scene voicemail block 1 text": { text: "okay so, update... Beni says if we win tonight he's naming the sauce after us..." },
  "scene voicemail block 1 sender": { text: "Niko" },
  "scene voicemail block 2 text": { text: "(laughing, losing it)" },
  "scene voicemail block 3 text": { text: "that's it, that's the whole message. bring cash. see you Wednesday." },
  "scene voicemail block 4 text": { text: "(click)" },
  "scene final_card block 0 text": { text: "If you're carrying something like this, you don't have to sort it alone." },
  "goal pack_the_flat text": { text: "Pack what you can. The lease ends Sunday." },
  "goal find_the_charger text": { text: "His phone. Dead. The charger wasn't with it." },
  "goal wait_for_the_charge text": { text: "It is charging. Keep going." },
  "goal the_phone_is_on text": { text: "It is on." },
  "goal the_desk text": { text: "The desk. You have been leaving it until later all night." },
  "goal nothing_left_to_find text": { text: "There is nothing else to look for. Finish up." },
  "advisory lead_in": { text: "If you or someone you love is struggling, support is real and reachable:" },
  "advisory line 0": { text: "This game is about losing a friend to suicide. It contains grief and depictions of depression. It does not depict the act, the method, or the death itself." },
  "advisory line 1": { text: "Play gently. You can pause any time. The flat will wait." },
  "region international entry 0 name": { text: "Find A Helpline" },
  "region international entry 0 detail": { text: "Free, confidential support lines, searchable by country." },
}

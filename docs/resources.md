# Support resources

Section 11 of the lore bible requires a content advisory before the main menu and a resources
screen reachable from the pause menu at all times. This file is the operator guide for the second
half of that. The entries themselves live in `data/resources.json`, because the advisory screen
reads them as typed data.

## The rule that matters

**Do not hardcode an unverified number.**

A crisis line that has been renumbered, merged, restricted to certain hours, or shut down is
worse than no number at all, because someone will dial it at the moment they can least absorb a
failure. The bible says this outright and it is the reason this file exists.

Every entry carries a `source` field describing where the detail was checked and when. An entry
without one fails `npm run validate`. The field is prose, not a URL, and it should say plainly if
something has not been verified.

## What ships today

One entry, in the `international` region: findahelpline.com, which the bible names as the default
international pointer. Its `source` field states that it has not been independently re-verified
here.

There are no local numbers in this repository. None have been added for any specific country,
including Albania, because verifying them was out of scope for this pass and inventing them is
not an option.

## Adding a region

Add a key to `regions` in `data/resources.json`. Use the lowercase ISO 3166-1 alpha-2 country
code so the runtime can match it against a locale later.

```json
"regions": {
  "xx": {
    "label": "Country name",
    "entries": [
      {
        "id": "short_stable_id",
        "name": "What the service calls itself",
        "detail": "Hours, languages, and whether it takes text or chat as well as calls.",
        "url": "https://the-official-page",
        "phone": "the number exactly as a person would dial it locally",
        "source": "Where this was checked, and on what date."
      }
    ]
  }
}
```

`phone` is optional. `id`, `name`, `url`, and `source` are required.

Before adding an entry:

1. Find the service's own official page, not an aggregator and not a search result summary.
2. Confirm the number is current and note the date you checked it.
3. Record the hours. A line that runs 18:00 to 23:00 and says nothing about it will be dialled at
   04:00, which is the hour this game is set in.
4. Note the languages offered.
5. Write all of that into `source` and `detail`.

Re-check every entry before each release. This is not a file that ages gracefully.

## Where it appears

- Before the main menu, as the advisory.
- From the pause menu, at any point, without unloading the flat.
- After the final card at the end of section 8.4.

The advisory text itself is the only place in the entire game where the word "suicide" appears.
Everywhere else, the documents talk around it, the way people actually do. The validator enforces
this.

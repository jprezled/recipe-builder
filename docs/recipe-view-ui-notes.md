# RB-295 — what's actually wrong with the recipe detail page

**Grew beyond its original title.** This started as just the ingredients
and instructions views (Problems 1 and 2 below); the button row, the
Favorite control, and the per-serving cost line turned out to need the same
kind of pass once the page was actually looked at, so they're recorded here
too rather than as untracked side work.

Two problems, both on `RecipeDetailPage.jsx`, both the same root cause: the
Ingredients `<ul>` and the Instructions `<ol>` are the only two lists on the
page with no class name at all. Every other list on this page —
`.nutrition-list`, `.cost-list` — resets the browser's default bullet/number
and lays its rows out with a border between them. These two still use the
browser default.

## Problem 1 — Ingredients looks like a different page

The nutrition and cost panels above it are borderless rows with a thin
divider between entries. The Ingredients list right below them is a plain
bulleted list with the browser's default left indent. Opening the page, a
cook sees three different list styles stacked on top of each other for what
is visually one kind of thing: a line of text in a card.

**The fix:** give it the same `list-style: none` / bordered-row treatment as
`.nutrition-list` and `.cost-list`, so the whole page reads as one design
instead of three.

## Problem 2 — Instructions runs together on a long recipe

Unlike the ingredients, the steps *are* ordered, so the numbering itself is
meaningful and stays. But each step currently only gets the generic
`.detail-section li { margin-bottom: 0.4rem }` rule — there's no border or
spacing to mark where one step ends and the next begins. On a recipe with
six or seven steps, the whole section reads as one paragraph with numbers
sprinkled through it rather than seven distinct instructions.

**The fix:** style each step as its own row, bordered the same way the
nutrition rows are, and give the number a bit more visual weight so it reads
as a step marker rather than a lightly-decorated bullet.

## Problem 3 — the dropdown row wrapped, and the cost line sat inside it

Nutrition Facts, Shopping list, Save/Remove from Favorites, What I need to
buy, and My note were all one `flex-wrap: wrap` row, so on anything but a
wide screen they broke onto a second line in whatever order they happened
to fit. The per-serving cost paragraph was a child of that same row, which
made the wrapping worse and put plain, unstyled text in the middle of a row
of buttons.

**The fix:** `flex-wrap: nowrap` with `overflow-x: auto` on the dropdown
row, so it stays one line and scrolls sideways on a narrow screen instead of
wrapping. The cost paragraph moved out of the row entirely, to its own
centered line below it - bold, a touch larger (0.95rem → 1.1rem), and with
enough margin above it to read as its own line rather than a stray label on
the button row.

## Problem 4 — the Favorite button read as just one more dropdown

Sitting inside the button row, "Save to Favorites" / "Remove from
Favorites" looked like a fifth toggle rather than the one button on the row
that isn't a dropdown at all.

**The fix:** its own row above the dropdowns, styled as a thin single-line
rectangle (`white-space: nowrap`, reduced vertical padding) rather than a
compact pill - and sized to roughly half the row's width, centered, rather
than spanning it edge to edge.

## What this does not touch

No backend change, no data shape change — `recipe.ingredients` and
`recipe.steps` are still plain string arrays. This is CSS, class names, and
one JSX reshuffle (moving two elements out of the button row) throughout.

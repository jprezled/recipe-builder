# RB-277 — % Daily Value on the nutrition panel

**Ported from the sprint 4 reference, adapted to the current page.** RB-277
was originally built against the single-column nutrition panel that existed
before RB-295's rework (ingredients/instructions columns, the dropdown row,
the Favorite button's new position) and RB-291's serving stepper. Its own
behavior is unchanged; what changed is where and how its panel sits inside
the page it's now part of.

## The short version

1. The nutrition panel shows **ten rows**, not six — the ones a printed
   nutrition label actually prints, in the order it prints them.
2. Calories sit **above** the rows in their own block, with no percentage —
   exactly where a real label puts them.
3. Each row carries a **% Daily Value**, except the three a real label
   prints no percentage against: Trans Fat, Total Sugars, and Protein.
4. A row that Spoonacular didn't send is **left off entirely**, not
   printed as a zero.
5. Some rows are **indented** under a parent row — Saturated Fat under
   Total Fat, Dietary Fiber and Total Sugars under Total Carbohydrate,
   Includes Added Sugars further under Total Sugars.
6. The panel ends with the standard footnote, **"* Percent Daily Values are
   based on a 2,000 calorie diet."** — the basis is stated, not implied.

## This reverses a decision RB-204 wrote down

`nutrition-contract.md` (RB-204) ruled percentages out, because the page
would imply a 2,000-calorie assumption it never states. That objection is
right, and this contract answers it: the footnote above states the basis.
The old entry in `nutrition-contract.md` is struck through and points here,
so the two documents do not disagree.

## Why calories stay outside the rows

A printed label's calorie line is its own block — larger type, a bold rule
above and below, no percentage. Treating it as row zero of the list would
make it look like just a bigger row instead of the thing the label leads
with.

## The label-vs-their-name mismatch

Spoonacular's own nutrient names and the words a nutrition label actually
prints differ on four of these rows:

| Spoonacular calls it | The label calls it |
|---|---|
| `Fat` | Total Fat |
| `Carbohydrates` | Total Carbohydrate |
| `Fiber` | Dietary Fiber |
| `Sugar` | Total Sugars |

This is why the mapping is a fixed table (`LABEL_LINES` in `RecipeService`)
rather than a loop over whatever Spoonacular sent, in their own wording.

## Mistake — matching on a prefix instead of the exact name

Spoonacular's list has **both** `Fat` and `Saturated Fat`. Matching
`"Saturated Fat"` with `startsWith` or `contains` finds `"Fat"` first and
hands Saturated Fat the wrong number. The existing RB-204 nutrition code
already had a test for exactly this
(`theLabelRowsArePickedOutByExactNameInPrintedOrder`); the fix is the same
one RB-204 used — compare the whole name with `.equals()`, never a prefix.

## What this reply was already carrying

`percentOfDailyNeeds` was on every nutrient in Spoonacular's reply the whole
time; RB-204 declared `name`, `amount`, and `unit` on `Nutrient` and
dropped the fourth field. Adding it costs no extra quota — it's the same
request, just one more field read off the same reply.

## Adapting it to the current page

- **Layout:** the panel still renders inside the left column's shared slot
  with My Note (see `docs/recipe-view-ui-notes.md`'s RB-295 writeup) — RB-277
  itself didn't touch that structure, only what's inside the panel.
- **Heading kept:** the sprint 4 reference's version of this panel had no
  `<h2>` at all, relying on the toggle button's own text. Every other panel
  on this page has one now (RB-295), so this version keeps
  `<h2>Nutrition Facts</h2>` rather than regressing that consistency for
  the sake of matching the reference exactly.
- **Serving-size stepper (RB-291) does not touch this panel.** The
  contract for RB-291 already settled this: nutrition figures are per
  serving by definition, so they're already correct at any serving count
  without scaling - the same reasoning that keeps the cost panel out of
  the stepper's reach.

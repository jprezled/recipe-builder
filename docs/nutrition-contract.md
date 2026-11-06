# Nutrition facts — what we agreed

**RB-204a.** Every decision here has been built and tested, and every warning
below is something that actually went wrong. **Read this before RB-204b.**

---

## The short version

1. We show **six** figures, not all hundred that Spoonacular sends.
2. We get them by adding **one parameter** to the recipe request.
3. That parameter costs **0.1 points**, and we pay it on every recipe page.
4. The panel is **closed** until someone presses a button.
5. The nutrition data can be **missing**, and that is normal, not an error.

---

## The six figures

| Our field name  | Spoonacular's name | Shown as |
|-----------------|--------------------|----------|
| `calories`      | `Calories`         | `591 kcal` |
| `fat`           | `Fat`              | `13.42g` |
| `saturatedFat`  | `Saturated Fat`    | `5.23g` |
| `carbohydrates` | `Carbohydrates`    | `69.02g` |
| `sugar`         | `Sugar`            | `2.54g` |
| `protein`       | `Protein`          | `18.1g` |

All six are **per serving**. That is how Spoonacular reports them. Do not
multiply by the number of servings.

Spoonacular sends more than a hundred nutrients. We pick out these six in the
service, so the page only ever receives six. Adding a seventh is a change to
the backend, not the frontend.

---

## How we ask for them

```
GET /recipes/{id}/information?includeNutrition=true
```

That is the whole mechanism. There is no separate nutrition endpoint, and
search results never contain nutrition.

---

## Mistake 1 — matching the nutrient name loosely

**This is the one that will bite you.**

Spoonacular's list contains **both** of these, and `Fat` comes first:

```
Fat             13.42 g
Saturated Fat    5.23 g
```

So you must compare the **whole name**:

```java
for (SpoonacularRecipeInformation.Nutrient one : theirs.nutrients()) {
    if (name.equals(one.name())) {      // equals, not startsWith
        return round2(one.amount());
    }
}
```

**What goes wrong if you use `startsWith` or `contains`:** looking for
`"Saturated Fat"` finds `"Fat"` first and returns **13.42** instead of 5.23.

**Why that is hard to spot:** 13.42g of saturated fat in a pasta dish is wrong
but believable. Nothing crashes. No test fails unless a test checks that exact
pair of nutrients.

The test `theSixNutritionFiguresArePickedOutByExactName` exists for this. Its
test data deliberately lists `Fat` before `Saturated Fat`, so a loose match
fails it.

The same trap waits for `Carbohydrates`, because `Net Carbohydrates` is in the
list too.

---

## Mistake 2 — assuming the nutrition block is always there

Spoonacular leaves the block out **completely** when the request did not ask
for it. Not empty — missing. In Java that means `null`.

Two normal situations produce it:

- a reply we cached before this feature existed, still inside its hour
- any code that calls `information` without the parameter

So `nutrition` can be `null` the whole way through, and every piece of code
that reads it must allow for that. The page only draws the button when
`recipe.nutrition` is not null, so a cook looking at a stale cached recipe sees
no button rather than an empty panel or a crash.

The test `aRecipeWithNoNutritionBlockStillConverts` checks this.

---

## What it costs

| Request | Points |
|---|---|
| `information?includeNutrition=false` | 1.0 |
| `information?includeNutrition=true`  | **1.1** |

Measured on 2026-11-06 by reading Spoonacular's own `x-api-quota-request`
response header.

So nutrition costs **0.1 points**, and we spend it on page load whether or not
anyone opens the panel. **The button itself is free.**

That might look wasteful. It is actually the cheap option: Spoonacular decides
what to include when the request arrives, so fetching nutrition later would
mean a **second** 1.1-point request, not a 0.1-point top-up.

Our daily allowance is **50 points**, so nutrition costs the whole team about
four recipe views a day.

---

## On the page

A button beside **Save**, in the same row as *Shopping list* and *What I need
to buy*. Closed to start with — the figures are a detail someone asks for, not
something worth the page's height by default.

The button needs two attributes:

```jsx
aria-expanded={isNutritionOpen}
aria-controls="nutrition-facts"
```

`aria-expanded` tells a screen reader that the button opens something and
whether it is currently open. The little arrow (▼ / ▲) tells everyone else the
same thing, and is marked `aria-hidden` so a screen reader does not read it out
as a character.

---

## Things we chose not to do

**Percentage of daily needs.** Spoonacular sends `percentOfDailyNeeds` and it
is tempting. Left out because a percentage only means something against a
stated daily intake, and the page would be implying a 2,000-calorie assumption
it never tells the reader about.

**All hundred nutrients behind a "show more" link.** Nobody asked for it, and
it turns a panel you can glance at into a table you have to read.

---

## Words used here

- **DTO** — "data transfer object". A small class whose only job is to hold
  data being passed around. We have two sets: `client/dto/` matches
  Spoonacular's JSON exactly, and `dto/` is our own shape.
- **Quota / points** — Spoonacular charges each request a number of points.
  We get 50 free per key per day.

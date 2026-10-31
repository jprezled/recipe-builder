# Recipe detail — the contract between backend and frontend

**RB-174**, the contract subtask of **RB-127**. Agreed before any code, like
`error-shape.md` and `dietary-filter-contract.md` before it. Same arrangement,
which has worked three times now: one document first, then the backend and
frontend halves get built at the same time instead of one waiting for the
other.

Spoonacular's reply for a single recipe has around 37 top-level fields. The
page has six slots. This file is where we decide which goes where, so nobody
discovers it field by field in code.

---

## The endpoint

```
GET /api/recipes/{id}
  -> 200 {
       id, title, imageUrl,
       servings, readyInMinutes,
       ingredients: ["3 cloves of garlic (minced)", ...],
       steps:       ["Boil the water.", ...],
       diets: { vegetarian, vegan, glutenFree, dairyFree }
     }
```

`id` is Spoonacular's — the same id the search returned, and the same one a
favorite is saved under. That is what lets a result card link straight here.

Costs one Spoonacular point the first time a recipe is opened, and nothing for
an hour afterwards (RB-177).

Field names are ours, not theirs. The service maps between the two, which is
the same two-DTO arrangement search already uses: if Spoonacular renames a
field, exactly one file changes.

---

## Andrew's page, filled in

The layout in `frontend/src/pages/RecipeDetailPage.jsx` is the design and it is
already agreed. This story replaces the hardcoded Swiss Bircher Muesli content
and changes nothing else. **If the page looks different afterwards, something
went wrong.**

| Andrew's markup | Comes from |
|---|---|
| `<h1>` | `title` |
| `<img className="detail-image">` | `imageUrl`, with `title` as its `alt` |
| `<p className="detail-description">` | `servings` and `readyInMinutes` |
| `Save to Favorites` button | the existing `FavoriteButton variant="text"` |
| `Ingredients` `<ul>` | each entry in `ingredients` |
| `Instructions` `<ol>` | each entry in `steps` |

And on our side of the wire, where each of those comes from in Spoonacular's
reply:

| Ours | Theirs |
|---|---|
| `title` | `title` |
| `imageUrl` | `image` |
| `servings`, `readyInMinutes` | `servings`, `readyInMinutes` |
| `ingredients` | `extendedIngredients[].original` |
| `steps` | `analyzedInstructions[0].steps[].step` |
| `diets` | `vegetarian`, `vegan`, `glutenFree`, `dairyFree` |

### The description line

Andrew's mockup has real prose. Spoonacular has nothing like it, so the slot is
filled from the clean numbers already in the same response:

> Serves 1 · ready in 45 minutes

### ⚠ We do not render Spoonacular's `summary`

`summary` looks like the answer to the description slot and is not. It is
marketing copy with HTML tags in it:

> `…might be a recipe you should try. This main course has <b>759 calories</b>…`

Rendering it would need React's `dangerouslySetInnerHTML`, which is a genuine
cross-site-scripting hole. The text does not describe the dish anyway.

### ⚠ `instructions` and `analyzedInstructions` are different fields

There are two instruction fields and only one is usable. The plain
`instructions` field is a single HTML string. `analyzedInstructions` is the
structured version — plain text, already split into numbered steps. Use the
structured one.

---

## Empty is not an error

Some recipes come back with no steps, and some with no ingredients. Both are
**successful** responses. Each gets an agreed sentence rather than an error and
rather than a bare empty list:

| When | What the page shows |
|---|---|
| `steps` is empty | `No instructions were provided for this recipe.` |
| `ingredients` is empty | `No ingredients were listed for this recipe.` |

This is the same distinction the results page already makes between a search
that failed and a search that matched nothing.

---

## Failures

Two new rows, both the same `{"message": "..."}` as everything else. They are
repeated in `error-shape.md`, which stays the source of truth for wording.

| Situation | Status | Message |
|---|---|---|
| No recipe with that id | 404 | `That recipe could not be found.` |
| The id in the address is not a number | 400 | `That recipe link is not valid.` |

The 404 matters because `SpoonacularClient.translate` currently folds every
unhandled status into the catch-all 502 — which would tell a cook that *our*
recipe service is unavailable when in fact *their link* was wrong. Search never
hits 404, which is why this only becomes a problem once detail exists.

The 400 matters because Spring cannot convert `abc` into a number and throws
before our code runs. With no handler the browser gets Spring's default error
page — stack trace, timestamp and all — which is the one thing
`error-shape.md` forbids.

---

## ⚠ The diet labels here are not the filter's values

A recipe reports `diets: { vegetarian, vegan, glutenFree, dairyFree }`. The
filter on the results page sends `diet=vegetarian` and friends. They look alike
and they are two different vocabularies — see `dietary-filter-contract.md`.
A recipe can also report categories the filter has no equivalent for. Never
derive one from the other; they break apart the first time they diverge.

These flags arrive in the call the page already makes, so showing them costs
nothing extra. Search results do **not** carry them, which is why result cards
have no badges and this page does.

---

## Status

- **RB-174** (127a) — this document. Done when every part of the page has a
  named source field and both empty cases have agreed sentences.
- **RB-175** (127b) — `getRecipe` on `SpoonacularClient`, their DTO, and the
  404 branch.
- **RB-176** (127c) — our `RecipeDetailDto`, the mapping, and the new address
  `GET /api/recipes/{id}`.
- **RB-177** (127d) — the `recipeDetails` cache.
- **RB-178** (127e) — the real recipe on the page.
- **RB-179** (127f) — the result card's "View Recipe" button becomes a link.
- **RB-180** (127g) — the diet badges.

Changing a message means changing it in `error-shape.md` first.

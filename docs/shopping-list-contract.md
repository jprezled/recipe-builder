# Shopping list — what we agreed

**RB-203a.** Every decision here has been built and tested, and every warning
below is something that actually went wrong. **Read this before RB-203b.**

**This is the contract that cost the most by being skipped.** Nobody wrote it
before building, and the list then got moved once and renamed twice before it
settled. Every decision below was made twice.

---

## The short version

1. Two different Spoonacular replies could feed this list. We use the **recipe**
   reply.
2. That means the list shows **every ingredient**, never a filtered subset.
3. We group by Spoonacular's `aisle` field, but the screen says **"category"**.
4. A blank aisle becomes **"Other"**, and that happens in the service.
5. Group with a JavaScript **`Map`**, not a plain object. Mistake 2 explains why.

---

## Which reply we use, and why it matters

| Reply | Does it know the cook's pantry? | So it can show |
|---|---|---|
| `complexSearch` with `fillIngredients=true` | yes, we told it | only the missing items |
| `/recipes/{id}/information` | no | everything |

**We use the recipe reply**, so our backend always sends the complete list. The
page works out what is missing, because the page is where the pantry is.

That choice is what lets `getRecipe` stay cached on the recipe id by itself, so
two cooks with different pantries share one request. `cost-contract.md` applies
the same reasoning to prices.

---

## Mistake 1 — filtering the list by the pantry

This is what was built wrong the first time.

The pantry lives in the **web address** and follows the cook around the whole
app. That is RB-188 and RB-192 working correctly. So a list that filters by it:

- looks right from a search, where the address holds what was just typed
- is **wrong** from Favourites, where a recipe saved weeks ago has nothing to do
  with today's search

**What it looked like in practice:** a saved recipe whose eggs and milk had
quietly disappeared from its shopping list, because an unrelated search had
left `eggs,milk` sitting in the address.

So the backend reply is always complete. The test
`everyIngredientComesBackWithItsAisle` holds that in place.

The favourites card does offer a pantry comparison, but as an explicit choice
the cook makes (RB-203e), with "Whole recipe" there for the day they do not
want it.

---

## The grouping

We group by Spoonacular's `aisle`, which is the supermarket section. Grouping is
the whole point of the feature: one walk past the produce instead of three.

**The field keeps their word; the screen uses ours.** The Java field is called
`aisle`, because a class that maps an API should match that API. The screen says
**category**, because "aisle" read oddly to anyone not shopping in a US
supermarket.

```
Everything this recipe needs, by category.
```

**A blank aisle becomes `"Other"`, in the service** — not on the page. Their
field is free text and is sometimes empty, and a grouped list needs somewhere to
put the leftovers. Doing it in the service means every screen that reads this
list sees the same thing. The test `anIngredientWithNoAisleLandsInOther` checks
it.

---

## Mistake 2 — grouping with a plain object

```js
const byAisle = new Map()        // not {}
```

Aisle names are **free text that Spoonacular sends us**. We do not control them.

**What goes wrong with `{}`:** every JavaScript object inherits properties from
`Object.prototype` — `constructor`, `toString`, and others. If Spoonacular ever
sends an aisle called `constructor`, then `byAisle["constructor"]` is already
"there" before you put anything in it, and your code starts behaving very
strangely.

A `Map` has no inherited keys, so it cannot happen.

---

## The shape we send

```json
"allIngredients": [
  { "name": "garlic", "line": "3 cloves of garlic (minced)", "aisle": "Produce" }
]
```

Three fields, each with one job:

- `name` — the plain word, for comparing against a pantry
- `line` — the readable phrase, for showing on screen
- `aisle` — the group to sort it into

`name` and `aisle` were already arriving on every recipe and being dropped by
`@JsonIgnoreProperties`. Declaring them costs no extra points.

---

## Where the list appears

| Page | Control | Points |
|---|---|---|
| Recipe detail | *Shopping list* button beside Save | free — came with the recipe |
| Favourites card | collapsible panel (RB-203e) | 1 per card opened |

The favourites version costs a point because a saved recipe holds no
ingredients of its own. **RB-262 removes that cost completely** by storing them
in our database.

Until RB-262 lands, that panel must fetch **when it is opened** and never on
page load. Ten favourites fetched on load would be ten points out of fifty.

---

## Things we chose not to do

**Tick boxes you can check off while shopping.** Needs per-cook state, a table
and an endpoint, for a list most people read once. Out of scope. Revisit if
anyone asks.

**Combining several saved recipes into one shop.** Genuinely useful and
genuinely a different story — it needs quantity arithmetic across different
units, which nothing in this project does yet.

---

## Words used here

- **`@JsonIgnoreProperties(ignoreUnknown = true)`** — tells Jackson to ignore
  JSON fields we have not declared. Without it, Spoonacular's extra fields make
  it throw. With it, a field we forget to declare is silently dropped — which is
  why `name` and `aisle` were missing in the first place.
- **Cache key** — the value Spring uses to decide if it has already answered
  this exact question. See `cost-contract.md`.

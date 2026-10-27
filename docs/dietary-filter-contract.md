# Dietary filter — the contract between backend and frontend

**RB-168.** Agreed before any code, so both halves of RB-151 can be built at the
same time instead of one waiting for the other. Same arrangement as
`error-shape.md`, which has worked twice.

Measured 2026-10-26.

---

## The address

```
/results?ingredients=chicken,garlic,pasta&diet=vegetarian&intolerances=dairy,peanut
```

The restrictions live in the web address, not in an account — **the filter works
without signing in**. Putting them in the address also means a filtered search
can be refreshed, bookmarked and shared, and it makes Apply a plain navigation
rather than a second way to start a search.

| Parameter      | Shape                | Optional?                                |
|----------------|----------------------|------------------------------------------|
| `diet`         | exactly one value    | yes — absent means no diet filter        |
| `intolerances` | comma-separated list | yes — absent means no intolerance filter |

Our own API takes the same two names:

```
GET /api/recipes/search?ingredients=eggs,milk&diet=vegetarian&intolerances=dairy
```

---

## The values

These nine, and nothing else.

| `diet`        | `intolerances` |
|---------------|----------------|
| `vegetarian`  | `dairy`        |
| `vegan`       | `egg`          |
| `gluten free` | `peanut`       |
|               | `tree nut`     |
|               | `shellfish`    |
|               | `soy`          |

Lowercase, and spaces rather than hyphens. `gluten free` and `tree nut` really
do contain a space; URL-encode them.

---

## ⚠ Why a 200 response proves nothing

**Spoonacular accepts any value you send and silently ignores the ones it does
not recognise.** `diet=carnivore` returns HTTP 200 and a full list of meat
recipes. There is no error, no warning, and nothing in the response saying the
filter was dropped.

So status codes cannot be used to check a value. The only way to tell is to
compare the result count against the same search with no filter at all: if the
number is unchanged, the filter was thrown away.

### The measurement

Baseline: `includeIngredients=tomato`, `number=1`, no filter → **781 results**.

| Value                   | totalResults | Verdict     |
|-------------------------|--------------|-------------|
| `vegetarian`            | 319          | accepted    |
| `vegan`                 | 137          | accepted    |
| `gluten free`           | 326          | accepted    |
| `dairy`                 | 369          | accepted    |
| `egg`                   | 682          | accepted    |
| `peanut`                | 771          | accepted    |
| `tree nut`              | 736          | accepted    |
| `shellfish`             | 736          | accepted    |
| `soy`                   | 746          | accepted    |
| `carnivore` *(control)* | **781**      | **ignored** |
| `plutonium` *(control)* | **781**      | **ignored** |

The two controls are the point of the table. They are values Spoonacular
certainly does not support, and they come back identical to the baseline —
which is what proves the method distinguishes anything at all. Without them,
nine numbers that happen to differ prove nothing.

**Adding a value to this list means running that measurement**, not guessing a
spelling. Reproduce it with:

```bash
KEY=$(grep '^SPOONACULAR_API_KEY' .env | cut -d= -f2)
curl -s -G "https://api.spoonacular.com/recipes/complexSearch" \
  --data-urlencode "includeIngredients=tomato" \
  --data-urlencode "number=1" \
  --data-urlencode "diet=<the value>" \
  --data-urlencode "apiKey=$KEY" | python3 -m json.tool | grep totalResults
```

---

## ⚠ So we validate, and never rely on their leniency

Because an unrecognised value is dropped in silence, **the backend checks every
incoming value against the list above and refuses anything else**:

```json
{ "message": "That dietary filter is not one we support." }
```

with **400**. Nothing unrecognised is ever forwarded.

This is not tidiness. A cook who ticks "peanut" and is served peanut recipes
because of a typo in our value list has been actively misled by software that
looked like it was working. For an allergy filter that is a safety problem, not
a cosmetic one.

The cost, accepted: our API is stricter than Spoonacular's. A value they would
have honoured but we have not listed is refused until someone measures it and
adds it. That is the right trade when the alternative is a filter that fails
without telling anyone.

---

## ⚠ Two vocabularies, not one

What you **send** and what a recipe **reports about itself** are different word
lists.

Sending `diet=vegetarian` can return a recipe whose own `diets` field reads
`["dairy free", "lacto ovo vegetarian", "vegan"]`. Those do not round-trip —
`lacto ovo vegetarian` is not a value you can send.

So the filter's values and any badge's labels are separate concerns. Never
derive one from the other, and never compare them.

---

## Behaviour

**A filter that matches nothing is a success, not an error.** Chicken plus
`diet=vegetarian` returns 200 with an empty list, and the page shows "No recipes
found for those ingredients." This is the same distinction the results page
already makes between a failed search and one that matched nothing.

**Blank ingredients are still refused**, filter or no filter.
`?ingredients=&diet=vegetarian` is `400 {"message":"Please enter at least one
ingredient."}` — restrictions do not make an empty search valid.

**Order does not matter.** `intolerances=dairy,peanut` and
`intolerances=peanut,dairy` are the same question and must share one cache
entry, exactly as the ingredient list already does. The allergy list goes
through the same cleaner the ingredients use.

**Ticking a box does not search. Only Apply does.** Each distinct combination is
a separate question to Spoonacular and the cache cannot serve one from another,
so searching on every tick would spend four of the daily 150 to answer one
question — and the three throwaway answers would evict entries someone might
genuinely reuse.

---

## A note on the daily allowance

**150 points a day, per key — and everyone has their own.** There is no shared
pool; see `.env.example`. This measurement cost 14 of mine.

The allowance does **not** reset at local midnight — after today's measuring the
remaining balance was 36.87, not 136. Plan around what the API reports rather
than assuming a fresh 150 each morning. Every test in RB-151 runs against saved
responses and costs nothing, and the measurement above is already recorded
here — re-running it spends your own allowance to learn what the table already
says.

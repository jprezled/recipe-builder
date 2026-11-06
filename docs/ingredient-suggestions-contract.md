# Ingredient suggestions — what we measured

**RB-228a.** Every decision here has been built and tested, and every warning
below is something that actually went wrong. **Read this before RB-228b.**

This one is mostly a **measurement** rather than a decision. Everything the
story does follows from the five facts below, and three of them are not what
you would guess.

Measured against the live API on 2026-11-05 and again on 2026-11-06.

---

## The short version

1. Each lookup costs **0.1 points**, flat — asking for 25 names costs the same
   as 10.
2. Their results are in **relevance order**, not alphabetical. `tomato` is
   **fourth** for `to`.
3. Their matching is **fuzzy**, not a prefix test. `t` returns `twix`.
4. There is **no bulk ingredient list** to download on the free tier.
5. So: we search **our own list first**, and only ask Spoonacular when it finds
   nothing.

---

## What we measured

```
GET /food/ingredients/autocomplete?query=to&number=10
```

The real reply for `to`, in their order:

```
tofu, toast, tonic water, tomato, toffee,
tostadas, tortilla, split pigeon peas, tomatillos, bean curd sheets
```

**`tomato` is fourth.** And `split pigeon peas` is in there, which is what
proves the matching is fuzzy rather than "starts with".

Each result has exactly two fields: `name` and `image`.

`image` is a bare **file name** like `tomato.png`, not a web address. The full
address is:

```
https://img.spoonacular.com/ingredients_100x100/  +  tomato.png
```

We build that in the service, so the page never has to know where Spoonacular
keeps its pictures.

---

## The budget, and why it decides the design

**50 points a day, per key.** Confirmed on 2026-11-05 by a 402 response that
states the number outright. It is **not** the 150 written in sprint 1 to 3
notes — every quota sum written before that date is three times too generous.

50 points is **500 lookups a day**, shared by six teammates and every grader.

One lookup per keystroke means typing `tomato` is **six** of them. A demo plus
a few searches would finish the day.

---

## What follows: our own list first

**About 205 common ingredients ship in the repo and are searched in the
browser. Spoonacular is only asked when that list finds nothing.**

`frontend/src/lib/commonIngredients.js`

Three reasons, in order of importance:

1. **It still works when the quota is gone** — which is the day of the demo.
2. It is free and instant. No network, no waiting, no spinner.
3. It covers what people actually type. It does **not** need to be complete.

Matches that **start** with the typed word rank above matches that merely
contain it, so `on` offers **onion** before *bacon* — but still offers *red
onion*, which a strict "starts with" test would hide.

Keep the file alphabetical. It is the one ordering a human can scan to see what
is missing.

---

## Three guards on the Spoonacular fallback

| Guard | Where it lives | Why |
|---|---|---|
| our list answers first | browser | most words never reach the API at all |
| two-character minimum | **service and component** | one letter matches hundreds of things and is useless on screen |
| 300ms debounce | component | a word typed normally is one call, not one per letter |

The minimum is enforced on the **server as well**, so no keystroke can spend a
point even if some future page asks too early. The test
`oneLetterIsRefusedWithoutCallingSpoonacular` proves nothing was called.

---

## Mistake 1 — caching in the browser instead of the server

```java
@Cacheable(cacheNames = "ingredientSuggestions")
public List<IngredientSuggestionDto> suggest(String query) { ... }
```

With the cache on the **server**, one person typing `tom` warms it for the
whole team and every grader.

**What goes wrong with a browser-only cache:** six browsers each hold their own
copy, so the team spends six points on the same word. This is the single
biggest saving in the story after the local list.

Keyed on the **cleaned** word — trimmed and lowercased — so `"To "` and `"to"`
are one paid question rather than two. The component keeps a small `Map` too,
but that only saves a network round trip, not a point.

> `ingredientSuggestions` must be added to `spring.cache.cache-names` in
> `application.properties`. A cache name that is not listed there is **silently
> never created**, and `@Cacheable` then does nothing at all.

---

## Mistake 2 — sorting their results

Their order is relevance, and it is the thing we paid for. Sorting it
alphabetically throws the ranking away.

A test asserts that `tomato` is **fourth** for `to`, precisely so that a
well-meaning tidy-up fails.

---

## Mistake 3 — trying to call Spoonacular from the browser

The Spoonacular key lives in exactly **one** class on the server
(`SpoonacularClient`). A page calling their autocomplete directly would send
the key to every browser that loads the page, where anyone can read it.

So the lookup goes through us:

```
GET /api/ingredients/suggest?query=to
```

**No sign-in needed.** Suggesting an ingredient name tells nobody anything
about a cook, and requiring an account would give a signed-out visitor a worse
search box for no reason.

A missing or very short `query` answers **200 with `[]`**, not 400. The page
asks as the cook types, so an early call with almost nothing in the box is
normal rather than a mistake.

---

## Mistake 4 — keeping old suggestions on screen while waiting

This shipped wrong. Typing `yuz` kept offering **yogurt** — the local match
from back when only `y` had been typed — for as long as the lookup took, and
permanently if it found nothing.

Clear the list **before** starting the wait:

```js
setSuggestions([])      // then debounce, then fetch
```

Offering a wrong suggestion is worse than offering none.

---

## One more behaviour worth protecting

**Enter with nothing highlighted adds exactly what was typed.** Type `tom`,
press Add, and you get `tom` — not `tomato`. A guess must never quietly
override a deliberate word.

A failed lookup is ignored everywhere. The suggestion box sits on top of a text
field that works perfectly well without it, so there is nothing to tell the
cook about.

---

## Words used here

- **Debounce** — wait until the typing stops before acting. Ours waits 300ms,
  and every new keystroke cancels the previous timer.
- **Autocomplete / type-ahead** — suggesting completions as someone types.
- **402** — the HTTP status Spoonacular returns when the daily points are gone.
- **Flat cost** — the price does not change with the size of the answer.

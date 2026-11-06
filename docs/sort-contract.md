# Sort order — what we agreed

**RB-207a.** Every decision here has been built and tested, and every warning
below is something that actually went wrong. **Read this before RB-207b.**

**This story contains the most dangerous subtask in sprint 4.** It is RB-207c,
the cache key. Read Mistake 1 before writing any code.

---

## The short version

1. **Two** sort values, not the dozen Spoonacular offers.
2. The default sort must produce the **exact same request** we sent before this
   story, so it hits the same cache entry.
3. The sort value **must** go into the cache key. See Mistake 1.
4. The service re-sorts results afterwards, and that must become conditional.
   See Mistake 2.
5. Changing the dropdown searches immediately. The dietary filters do not.

---

## The two values

| In the web address | Sent to Spoonacular | What the cook sees |
|---|---|---|
| nothing, or `max-used-ingredients` | `max-used-ingredients` | most of your ingredients used (the default) |
| `min-missing-ingredients` | `min-missing-ingredients` | fewest extra things to buy |

Two, not more. Spoonacular offers about a dozen sorts; the rest answer
questions this app does not ask, like "healthiness" or "random".

**Nothing in the address means the default.** The frontend adds `sort` to the
request **only** when it is not the default, so an ordinary unsorted search is
byte-for-byte the request it has always been and hits the cache entry it always
hit. RB-173 set that rule for `diet` and `intolerances`; this follows it.

Anything we do not offer is refused before we call Spoonacular:

```json
{ "message": "That sort order is not one we support." }
```

with **400**. The reason is in `dietary-filter-contract.md`: Spoonacular quietly
ignores values it does not recognise, so a typo would serve the default order
while the dropdown claimed otherwise.

---

## Mistake 1 — forgetting the cache key

`IngredientsCacheKeyGenerator` reads the method's arguments **by position**:

```java
String sort = SortOrderCleaner.MOST_USED;
if (params.length > 2 && params[2] instanceof String found) {
    sort = SortOrderCleaner.clean(found);
}
```

**What goes wrong:** you add a third argument to `searchByIngredients` and do
not touch the generator. The generator still builds its key from the first two
arguments, so **both sorts produce the same key**. Whichever search ran first
answers for both.

**Why it is the worst bug in the sprint:** there is no exception, no log line
and no red test. The wrong order simply arrives instantly — which looks exactly
like the cache working properly.

**This already happened once.** RB-171 fixed this same bug for the dietary
filters one sprint ago. It came back because the generator lives in a different
file from the method it serves, and nothing in the code links them.

> **So this file gets one owner for the sprint.**
> `IngredientsCacheKeyGenerator` and the signature of
> `searchByIngredients` change **together or not at all**. This is the one place
> in sprint 4 where "only add, never edit" is not enough, because the change is
> an edit by nature.

`RecipeServiceCacheTest` checks that two sorts produce two cache entries.

---

## Mistake 2 — leaving the existing re-sort running

The service re-orders results by match percentage after mapping them:

```java
if (chosenSort.equals(SortOrderCleaner.MOST_USED)) {
    ourResults.sort(Comparator.comparingInt(RecipeSummaryDto::matchPercent).reversed());
}
```

That `if` is doing real work. **What goes wrong without it:** Spoonacular
returns the recipes in the order you asked for, and the service immediately
shuffles them back — so you pay for a sort and then throw it away.

**What the sort actually gains, honestly:** with the default sort the top four
results are the same either way, because match percentage and "most used
ingredients" agree closely. **The difference shows up in positions 5 to 10**,
where the new sort surfaces recipes needing one or two extra items instead of
eight or nine. An earlier claim that the top results change was wrong.

---

## On the page

A real `<label for="sort-order">` tied to a `<select>`. That is how the tests
find it and how a screen reader announces it. Do not use a bare `<div>` with a
click handler.

**Changing the dropdown searches straight away**, unlike the dietary filters
which wait for a button. That difference is deliberate:

- a sort is **one** choice, so there is nothing to collect before applying it
- filters are **several**, and a cook ticking four boxes would otherwise spend
  four points to ask one question

The chosen sort lives in the web address, so refresh, Back, Forward and a
shared link all keep it.

---

## Words used here

- **Cache key** — the value Spring uses to decide whether it has already
  answered this exact question. If two different questions produce the same
  key, one gets the other's answer.
- **`KeyGenerator`** — a Spring interface for building that value yourself,
  used when the default (all the arguments) is not what you want. Ours sorts
  and lowercases the ingredients so `eggs,milk` and `Milk, Eggs` share one
  entry.
- **Byte-for-byte the same request** — literally the same URL and parameters,
  which is what the cache compares.

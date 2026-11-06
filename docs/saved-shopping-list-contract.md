# Storing a saved recipe's shopping list — what we agreed

**RB-262a.** Every decision here has been built and tested, and every warning
below is something that actually went wrong. **Read this before RB-262b.**

A story of its own, separate from RB-203. RB-203 built the shopping list; this
one makes it free and available with no internet.

---

## The short version

1. The column goes on **`recipes`**, not `saved_recipes`. The obvious answer is
   the wrong one — see Mistake 1.
2. One `TEXT` column holding JSON, not a table.
3. `null` means **"ask once"**, not "this recipe has no ingredients".
4. Use `COALESCE` in the upsert, never a plain overwrite. See Mistake 3.
5. Fill in recipes saved **before** the migration, or the story only works
   going forward. See Mistake 4.

---

## The problem it solves

The shopping list on a favourites card was built from `GET /api/recipes/{id}`,
which is a Spoonacular call costing **1.1 points**. Opening the list on ten
saved recipes could spend a fifth of a day's fifty on information we had
already been given once.

Stored in our own database, it is free from then on — and it works with the
quota gone or the laptop offline. A recipe saved in September should still tell
you what to buy in December.

---

## Mistake 1 — putting the column on `saved_recipes`

```sql
ALTER TABLE recipes ADD COLUMN ingredients_json TEXT;   -- V7
```

**`recipes`, not `saved_recipes`.** The instinct is wrong here, and the reason
the instinct exists is that V4 put the *note* on `saved_recipes` — so copying
that pattern feels right.

Ask: **does this belong to the person, or to the recipe?**

| Thing | Belongs to | Table |
|---|---|---|
| a note | one person's opinion | `saved_recipes` |
| an ingredient list | the recipe itself | `recipes` |

Garlic is garlic whoever bookmarked it.

**What you gain by getting it right:** the list is stored once, and every
account that saved that recipe reads the same copy. The second person to save a
recipe pays Spoonacular nothing.

**What goes wrong on `saved_recipes`:** the identical list is stored once per
person, and each of them pays separately for the same answer.

This is real in the project's own database — `Pittata - Pizza Frittata` is
saved by two accounts and shares one stored list.

---

## One JSON column, not a table

The same three reasons V5 gave for the pantry:

**Always read and written whole.** Written once when the recipe is first saved,
read whole to draw the list. Nothing ever edits a single ingredient.

**The recipe's order matters.** A table loses it unless it also carries a
position column.

**Nothing ever queries inside it.** No screen asks "which recipes use garlic" —
that is what the Spoonacular search is for.

**`TEXT`, not `JSONB`.** `JSONB` would let Postgres index and search inside the
value. That is a capability, not a benefit, when no SQL ever looks inside.

If a screen one day does need to search inside these, this becomes the wrong
shape and should be split into a table **then**, not now.

---

## Mistake 2 — treating null as "no ingredients"

Nullable, with no default. A recipe saved before V7, or saved while Spoonacular
was unreachable, genuinely has no stored list — and the page must tell that
apart from a recipe that has nothing in it.

```jsx
const [ingredients, setIngredients] = useState(savedIngredients ?? null)
```

`null` is the **only** case that fetches. Anything else, including an empty
list, is taken as the answer.

---

## Mistake 3 — overwriting the stored list on every save

```sql
ON CONFLICT (spoonacular_id) DO UPDATE
SET ingredients_json = COALESCE(EXCLUDED.ingredients_json, recipes.ingredients_json)
```

`COALESCE(a, b)` means "use `a`, unless it is null, in which case use `b`".

**What goes wrong with a plain `SET ingredients_json = EXCLUDED.ingredients_json`:**
every later save that has no list **wipes the list that was already there**. And
that happens for a real reason — a second account saves the same recipe while
Spoonacular is down, so it arrives with `null`, and a good list is destroyed.

With `COALESCE` the list can only ever improve. The test
`savingAgainWithoutIngredientsKeepsTheOnesAlreadyStored` holds it in place.

---

## Mistake 4 — forgetting the recipes saved earlier

**This was missed in the first build.** The page fell back to fetching when
there was no stored list, showed the result, and **never wrote it down** — so
every recipe saved before the migration kept costing a point, forever. Worse, a
comment in the component claimed the opposite, which is more harmful than no
comment.

The fix: **any recipe fetch fills in the gap.**

```sql
UPDATE recipes SET ingredients_json = ?
WHERE spoonacular_id = ? AND ingredients_json IS NULL
```

It is free, because the Spoonacular call has already happened and been paid
for. And because it runs on *any* fetch, simply viewing a recipe page fills it
in.

**`AND ingredients_json IS NULL` is the important half.** Without it, a recipe
fetched in some other situation could overwrite a good list with a shorter one,
and that would be very hard to notice.

Not fatal either: wrap it so a database problem cannot stop a recipe page from
drawing.

---

## Mistake 5 — letting a failed fetch fail the save

Saving a recipe now asks Spoonacular for its ingredients. That can fail — no
key, no network, quota gone, an id they do not recognise.

The favourite is what the cook asked for. The shopping list is a bonus.

```java
try {
    return recipes.getRecipe(spoonacularId).allIngredients();
} catch (RuntimeException couldNotFetch) {
    return null;
}
```

Catching `RuntimeException` broadly is deliberate here: every one of those
failures has the same answer, which is to save the favourite without a list.
Two tests cover it and both check the favourite was still saved.

---

## The cost, honestly

Saving a recipe **from a search result** now costs 1.1 points, where it used to
be free. Saving **from the recipe page** is free, because the recipe is already
in the hour-long cache.

We accepted that: it is paid once per recipe ever, instead of once per cache
window every time anybody opens the list.

---

## Words used here

- **Upsert** — one SQL statement that inserts a row, or updates it if it is
  already there. Postgres spells it `INSERT ... ON CONFLICT ... DO UPDATE`.
- **`EXCLUDED`** — inside an upsert, the row you *tried* to insert. So
  `EXCLUDED.ingredients_json` is the new value and
  `recipes.ingredients_json` is the one already stored.
- **`COALESCE(a, b)`** — returns `a` unless it is null, in which case `b`.
- **`JSONB`** — a Postgres column type that stores JSON in a form it can index
  and search. We use plain `TEXT` instead.

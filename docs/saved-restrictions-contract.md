# Saved dietary restrictions — what we agreed

**RB-209a.** Every decision here has been built and tested, and every warning
below is something that actually went wrong. **Read this before RB-209b.**

The same shape as `saved-pantry-contract.md` and the same conflict, plus one
extra distinction the pantry did not need. **Read that file first** — the
address-wins rule and the StrictMode bug are explained there in full.

---

## The short version

1. A saved preference **pre-fills** the tick boxes. It never overrides the
   address.
2. Empty and `"none"` are **different things**. See Mistake 1.
3. Validate the values **when they are saved**, not when they are read. See
   Mistake 2.
4. Same StrictMode flag bug as RB-208. Set the flag inside the `.then`.
5. Key the filter control on the **applied** filters, not the live ticks. See
   Mistake 4.

---

## Pre-fills, never overrides

```js
if (hasLoadedSaved.current || diet || intolerances) {
  return
}
```

| Cook arrives at | What happens |
|---|---|
| `/results?ingredients=eggs`, `vegan` saved | vegan ticked and applied |
| `/results?ingredients=eggs&diet=gluten free`, `vegan` saved | **gluten free** — the link wins |
| signed out | nothing ticked; the request fails and we ignore it |

A link with `?diet=vegan` must show two people the same recipes, whatever
either of them has saved. Same rule as the pantry, same reason.

---

## Mistake 1 — treating empty and "none" as the same thing

This is the distinction the pantry did not have.

| What is stored | What it means |
|---|---|
| `NULL` | the cook has never saved a preference |
| the cook chose "no diet" | also stored as `NULL` |

Both end up `NULL` in the column, **and that is correct** — because a cook who
deliberately turned their diet off must not have it handed back on their next
visit.

What matters is that the **API** keeps them apart. An empty string from
`GET /api/restrictions` means "nothing saved, do not touch the address". The
service converts an explicit `"none"` to `NULL` on the way in:

```java
String dietToStore = cleaned.diet();
if (dietToStore.equals(RestrictionsCleaner.NONE)) {
    dietToStore = null;
}
```

**What goes wrong if you collapse them the other way** — treating a cleared
preference as "nothing saved" and re-applying an older value: the cook cannot
turn their diet off. They clear it, come back, and it is on again.

---

## Mistake 2 — validating when you read instead of when you write

```java
DietaryRestrictions cleaned =
        RestrictionsCleaner.clean(new DietaryRestrictions(diet, intolerances));
refuseUnsupported(cleaned);          // before it reaches the database
```

Checking on read looks equivalent. It is not.

**What goes wrong:** a bad value stored once comes back on **every future
search**. And Spoonacular silently ignores filters it does not recognise — so
the cook sees a full page of results with no sign their allergy filter did
nothing at all. For an allergy filter that is a safety problem, not a cosmetic
one. `dietary-filter-contract.md` exists because of exactly this behaviour.

Validating on read is also worse to recover from: every cook who saved a bad
value keeps hitting the error until someone edits the database by hand.

It reuses **the same cleaner a search uses**, so what gets stored is exactly
what a search would have used. Two separate sets of cleaning rules would
eventually disagree with each other.

```json
{ "message": "That dietary filter is not one we support." }
```

with **400** — that is the string from `dietary-filter-contract.md`, not a new
one. One wording for one problem, whichever endpoint reports it.

---

## Mistake 3 — the StrictMode flag, again

Set `hasLoadedSaved.current = true` **inside** the `.then`, not in the guard
above it.

Found by hand: sign in, change the filters, sign out, sign back in — nothing
ticked. The full explanation is in `saved-pantry-contract.md`. Two stories made
this mistake, so assume the third will too unless you check.

---

## Mistake 4 — keying the filter control on the live ticks

`DietaryFilters` has a React `key`, so it re-mounts when the applied choices
change. That is what makes the controls match the address after a refresh or a
Back.

Once ticking a box also writes to the address (RB-211a), keying on the **live**
ticks means:

1. you tick a box
2. the address changes
3. the key changes, so React throws the component away and builds a new one
4. **the tick you just made is gone**

The symptom is a checkbox that will not stay ticked. The fix is to key on what
has been **applied**, which only changes when the button is pressed:

```jsx
key={(applied.diet ?? '') + '|' + (applied.intolerances ?? '')}
```

---

## The endpoints

```
GET /api/restrictions   -> {"diet":"vegan","intolerances":"dairy,peanut"}
PUT /api/restrictions   <- the same shape                          204
```

JSON here, unlike the pantry's plain text, because there are **two** fields —
so send `Content-Type: application/json` or Spring answers 415.

Two columns in one migration (V6) and one `UPDATE` statement, because they are
always read and written together. Clearing the diet while keeping the
intolerances is one edit, not two.

**Saved when the button is pressed**, inside `handleApplyFilters` — not on
every tick. The failure is ignored when signed out, and the filter still
applies to that search.

---

## Words used here

- **React `key`** — a hint that tells React whether two renders show the *same*
  component or a different one. Change the key and React destroys the old
  component and all its internal state. Useful on purpose, and a trap when the
  key changes more often than you meant.
- **StrictMode** — see `saved-pantry-contract.md`.
- **Cleaner** — our own small class that trims, lowercases and normalises a
  value before anything else sees it. Using one cleaner everywhere is how two
  code paths stay in agreement.

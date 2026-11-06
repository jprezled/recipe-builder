# Saved pantry — what we agreed

**RB-208a.** Every decision here has been built and tested, and every warning
below is something that actually went wrong. **Read this before RB-208b.**

**This is the first story that keeps a second copy of something already in the
web address.** The whole contract is about which copy wins.

---

## The short version

1. The **web address always wins**. A saved pantry only loads into an empty one.
2. One `TEXT` column on `users`, not a separate table. Reasons below.
3. Do **not** use `IngredientList.normalise` — it sorts, and we need the cook's
   order.
4. Set the "already loaded" flag **inside** the `.then`, never before the fetch.
   This bug shipped. See Mistake 1.
5. The endpoint body is plain text, like the note.

---

## Mistake 1 — setting the flag before the fetch

```js
getPantry().then((saved) => {
  if (!stillOnThisPage) return
  hasLoadedPantry.current = true      // HERE
  ...
})
```

**This shipped the wrong way round, and a person found it, not a test:** sign
in, save a pantry, sign out, sign back in — nothing loads.

**Why.** React's StrictMode runs effects **twice** in development, and cancels
the first attempt in between. If you set the flag *before* the request:

1. first run sets the flag, starts the request
2. StrictMode cancels it; the result is thrown away
3. second run sees the flag already set and returns early
4. nothing ever loads

Setting it inside the `.then` means only a result that actually arrived counts.

**RB-209 made the exact same mistake**, which is why this is in a contract
rather than a code comment.

The effect also runs **once**, with an empty dependency array and the eslint
comment to say so:

```js
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [])
```

**Why once.** Re-running on every address change fights the cook as they clear
ingredients — they delete the last chip, the effect runs, and it comes straight
back.

---

## Mistake 2 — letting the saved pantry beat the address

The pantry already lives in the query string, and RB-188 and RB-192 both depend
on that. Saving it to an account creates a **second source of truth**, so there
has to be a rule.

**The rule: the saved pantry loads only into an EMPTY address.**

```js
if (hasLoadedPantry.current || searchParams.get('ingredients')) {
  return
}
```

| Cook arrives at | What happens |
|---|---|
| `/` signed in, nothing saved | empty, as before |
| `/` signed in, pantry saved | the chips appear |
| `/?ingredients=eggs` signed in, different pantry saved | **eggs** — the link wins |
| `/` signed out | empty; the request fails and we ignore it |

**What goes wrong if the saved pantry wins:** two people following the same
shared link see different recipes. That breaks the thing the address was chosen
for in the first place.

---

## Mistake 3 — using IngredientList.normalise

It is right there, it looks like exactly the right helper, and it **sorts**.

Sorting is correct for a cache key and wrong here. The chips on screen are what
the cook typed, in the order they typed them. A list that silently reorders
itself on every reload is a surprise nobody asked for.

`PantryService.tidy` is deliberately simpler — it trims each entry and drops
empty ones, keeping both the order **and** the capitalisation:

```java
private static String tidy(String raw) {
    List<String> kept = new ArrayList<>();
    for (String part : raw.split(",")) {
        String one = part.trim();
        if (!one.isEmpty()) {
            kept.add(one);
        }
    }
    return String.join(",", kept);
}
```

The search normalises separately when it runs, so nothing later depends on this
being sorted.

---

## One column, not a table

```sql
ALTER TABLE users ADD COLUMN pantry TEXT;   -- V5
```

A `pantry_items` table is the instinct, and it is wrong here. Three reasons:

**The list is always read and written whole.** Adding or removing one chip
rewrites all of it. A table would need a join to read and a delete-then-insert
to write, for no behaviour we have.

**The cook's order matters on screen.** A table loses the order unless it also
carries a position column, which is a second thing to keep correct.

**It has to round-trip with the address**, which holds the same
comma-separated string. Storing the same shape means saving and restoring
cannot disagree with each other.

If per-ingredient features ever arrive — an expiry date, a quantity — this
becomes the wrong shape and should be normalised **then**, not now.

**Nullable with no default.** `null` means no pantry was ever saved. A cleared
pantry also stores `null`, so "never saved" and "saved then cleared" behave the
same.

---

## The endpoints

```
GET /api/pantry      -> "eggs,milk"      (text/plain)
PUT /api/pantry      <- "eggs,milk"      204
```

Plain text, not JSON, because there is one field — so the frontend must send
`Content-Type: text/plain` or Spring answers 415.

`@RequestBody(required = false)` so clearing the pantry to nothing is a legal
request rather than a 400.

| Situation | Status | Message |
|---|---|---|
| Not signed in | 401 | `Please sign in to save favorites.` |
| Over 500 characters | 400 | `That ingredient list is too long. Please use 500 characters or fewer.` |

Use `http.getSession(false)` everywhere in the controller. The `false` means
"do not create one if there isn't one", so reading the pantry does not hand
every anonymous visitor a session.

**Saved on every deliberate change**, from inside `putInAddress`. Adding and
removing are discrete actions rather than keystrokes, so this is one write per
change — it is not a debounce problem. The failure is ignored when signed out,
the same as the load.

---

## Words used here

- **StrictMode** — a React development-only wrapper that deliberately runs
  effects twice to expose bugs. It is in `main.jsx`. It does **not** do this in
  a production build.
- **`useRef`** — React state that does not cause a re-render when it changes.
  Right for a flag like "have I already loaded?", because nothing on screen
  depends on it.
- **Dependency array** — the `[]` at the end of `useEffect`. Empty means "run
  once, after the first render".
- **Source of truth** — the one place a piece of information officially lives.
  Two copies need a written rule for which wins, which is what this file is.

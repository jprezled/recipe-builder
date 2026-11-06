# Notes on saved recipes — what we agreed

**RB-205a.** Every decision here has been built and tested, and every warning
below is something that actually went wrong. **Read this before RB-205b.**

---

## The short version

1. A note belongs to **one person**, so the column goes on `saved_recipes`.
2. `null` means no note. An empty string is never stored.
3. The endpoint is `PUT`, and the body is **plain text**, not JSON.
4. A note needs a **saved** recipe. There is no row to write to otherwise.
5. Copy the three error messages exactly. Do not write your own.

---

## Where the note is stored

```sql
ALTER TABLE saved_recipes ADD COLUMN note TEXT;   -- V4
```

`saved_recipes` has a primary key of `(user_id, recipe_id)`, so a column on it
is automatically **per person per recipe**. "Double the garlic" is one cook's
opinion, not a fact about the recipe, so two accounts who save the same recipe
each get their own note.

> **Compare with `saved-shopping-list-contract.md`.** The ingredient list goes
> on the `recipes` table instead, because it *is* a fact about the recipe. Those
> two decisions look the same and go opposite ways. Getting it the wrong way
> round is the main thing to avoid.

**Nullable, with no default.** `null` means no note was written. We never store
an empty string, because then "never wrote one" and "wrote one and cleared it"
would look identical:

```java
String cleaned = note == null ? "" : note.trim();
repository.saveNote(userId, spoonacularId, cleaned.isEmpty() ? null : cleaned);
```

The page then has one case to handle instead of two.

---

## The endpoint

```
PUT /api/favorites/{id}/note
Content-Type: text/plain

double the garlic
```

**`PUT`, not `POST`.** Sending the same note twice leaves the same note, and
that property is what `PUT` means.

**Plain text, not JSON**, because there is only one field. A JSON wrapper
around a single string earns nothing.

> **Watch out:** the frontend must send `Content-Type: text/plain`. Leave it off
> and Spring refuses the body with **415 Unsupported Media Type**, which looks
> like a sign-in problem when you are debugging.

Returns **204** with no body.

The note also comes back on every entry from `GET /api/favorites`. That is why
the favourites page needs no second request — and why **RB-269** is almost
free.

---

## Mistake 1 — expecting a note to work on an unsaved recipe

The note is a column on `saved_recipes`. If the cook has not saved the recipe,
**there is no row to write to**. So the backend refuses:

| Situation | Status | Message |
|---|---|---|
| Not signed in | 401 | `Please sign in to save favorites.` |
| Recipe not in this cook's favourites | 404 | `Save this recipe before adding a note.` |
| Note longer than 500 characters | 400 | `That note is too long. Please use 500 characters or fewer.` |

**Copy those strings exactly.** They are also listed in `error-shape.md`, and
both the service tests and the controller tests compare against them. Inventing
a similar-sounding message is how RB-158 shipped a wrong one in sprint 3 — it
was caught in review, but only just.

**Why 404 and not 409:** the thing being addressed genuinely is not there.
`/api/favorites/660101/note` names a saved recipe that this cook does not have.

**Un-saving a recipe deletes its note**, because the note lives on the row that
gets removed. That is accepted behaviour rather than a bug, but it became much
more visible once RB-269 made notes editable from two pages. A confirmation
prompt would be a reasonable future story.

---

## The length limit

**500 characters.** Long enough for a real cooking note, short enough that
nobody can paste an essay into a column that is read on every favourites page
load.

Checked in the **service**, so the limit holds no matter which controller calls
it.

---

## On the page

One component with three states. It starts in the first:

| State | What you see |
|---|---|
| reading | the note as text, with *Edit note* — or *Add a note* if empty |
| editing | a textarea, *Save note*, *Cancel* |
| saving | *Saving...*, both buttons disabled |

**Not a textarea that is always open.** A card with an empty box on it looks
unfinished, and invites a click that does nothing. A card saying "Add a note"
tells you what is available.

*Cancel* puts back the last saved value rather than clearing the box, so a
mistaken edit is recoverable without reloading the page.

**One component, used by both pages.** RB-269 reuses `RecipeNote` exactly as it
is — not a copy — so the two pages cannot drift apart or disagree about where a
note lives.

---

## Things we chose not to do

**Saving automatically when the box loses focus.** Fewer clicks, but it writes
on every accidental click elsewhere and gives no confirmation the cook trusts.

**Markdown or any formatting.** A cooking note is a sentence. Rendering text a
user typed as HTML is also the one place in this app that would need escaping
care, for no benefit anyone asked for.

---

## Words used here

- **`PUT` vs `POST`** — `PUT` means "make it be this", so doing it twice has
  the same effect as doing it once. `POST` means "add another one". A note is a
  `PUT`.
- **415 Unsupported Media Type** — Spring's answer when the `Content-Type`
  header does not match what the method accepts.
- **Nullable** — the database column is allowed to hold `NULL`, which arrives
  in Java as `null`.

# Error shape — the contract between backend and frontend

**RB-82.** Agreed before RB-85 (backend) and RB-86 (frontend) start, so both
sides build against the same thing.

Epic RB-80: *as a home cook, I want a clear message when recipes can't be
loaded, so I know it isn't my fault and whether I can try again.*

---

## The shape

Every failure the frontend has to display is an object with exactly one field:

```json
{ "message": "Daily recipe search limit reached. Please try again tomorrow." }
```

That is the whole contract.

### Why only `message`

RB-86 says the frontend surfaces the message **without reinterpreting it**. One
field makes that the only thing it can do. Add a `code` and someone will start
switching on it and writing a second set of messages in React — then we have
two places to fix a wording change, and they will drift.

The story asks the cook to learn two things: whether it was their fault, and
whether to try again. Both fit in the sentence:

- *"Please enter at least one ingredient."* — your move
- *"Please try again tomorrow."* — not your fault, retry later
- *"Please try again shortly."* — not your fault, retry now

A `"retryable": true` field was considered and rejected. It is a second source
of truth that can disagree with the sentence it sits next to.

---

## Who produces which message

Two sources, because some failures mean no response arrives at all.

### Backend-produced — a real HTTP response with the JSON above

| Situation | Status | Message |
|---|---|---|
| Empty or blank ingredient | 400 | `Please enter at least one ingredient.` |
| A dietary filter value we do not offer | 400 | `That dietary filter is not one we support.` |
| Quota exhausted (Spoonacular 402) | 429 | `Daily recipe search limit reached. Please try again tomorrow.` |
| Our key missing or rejected (401/403) | 500 | `Recipe search is not configured correctly. Please tell the team.` |
| Spoonacular unreachable or broken | 502 | `Recipe search is unavailable right now. Please try again shortly.` |

### Frontend-produced — no response exists to read

| Situation | Message |
|---|---|
| Backend not running, `fetch` rejects | `Could not reach the recipe service. Is the backend running?` |
| Response is not JSON, or has no `message` | `Something went wrong loading recipes. Please try again.` |

**Acceptance criterion 1 lives entirely here.** A stopped backend cannot
describe itself, so the frontend owns that sentence. RB-85 cannot deliver it
and should not try.

---

## Rules

**Backend (RB-85)**

1. Every failure leaves through one `@RestControllerAdvice`. No endpoint builds
   its own error response.
2. Never let a raw exception reach the browser. Spring's default error body
   carries a stack trace, a timestamp and a path — criterion 4 forbids all of
   it.
3. The status code carries meaning for logs and tools; the **message** is what
   a person reads. Both are required.
4. Messages are written for a home cook, not a developer. No class names, no
   status numbers, no "null".

**Frontend (RB-86)**

1. Read `.message` and display it. Do not rewrite, shorten, or map it.
2. Only invent a message when there is genuinely nothing to read — a rejected
   `fetch`, or a body without a `message` field. Use the two sentences above,
   verbatim.
3. Never show a blank screen on failure. Every failed search ends with visible
   text.
4. Never render a status code. `.ok` decides whether it failed; `.message` says
   what to show.

---

## Acceptance criteria → where each is satisfied

| Criterion | Satisfied by |
|---|---|
| Backend not running → "could not be reached" | **Frontend** (RB-86) |
| Quota exhausted → "limit reached, try again later" | **Backend** 429 (RB-85) |
| Empty search box → "ask for at least one ingredient" | **Backend** 400 (RB-85) |
| Never a stack trace, raw status, or blank screen | Both |

The empty-search case could be caught in the browser before any request. Do it
on the **backend** anyway — the rule has to hold for anyone calling our API,
not just our own screen. The frontend may *also* disable the button while the
box is empty; that is a nicety, not the criterion.

---

## What this means for the demo

The epic names two failures that will happen live:

- **Quota runs out.** 150 points a day, per key. Exhausting it mid-demo now
  produces a sentence about trying tomorrow rather than a crash.
- **Backend not started.** The most likely demo mistake, and the frontend
  handles it with a message naming the actual cause.

Both are worth rehearsing. Stop the backend, search, and read what appears.

---

## Sprint 2 additions — database failures

Two new cases, both the same `{"message": "..."}` as everything else.

### The database cannot be reached

`503 Service Unavailable`

> Could not save your favorite right now. Please try again shortly.

Raised as `DatabaseUnavailableException` by `FavoriteRepository`, the only class
that touches Postgres. 503 rather than 500 on purpose: nothing is wrong with the
request, the thing we depend on is simply not there.

Searching is deliberately unaffected — it needs no database, and
`ContextStartsWithoutDatabaseTest` is what keeps it that way. A teammate with no
Postgres running can still search; only favorites fail.

### The demo user row is missing

`500 Internal Server Error`

> The database is missing its setup data. Apply
> database/migrations/V2__demo_user.sql and try again.

`saved_recipes.user_id` is a foreign key to `users(user_id)`. Until accounts
ship that row comes from `V2__demo_user.sql`, so this almost always means a
teammate applied V1 and skipped V2.

The message names the file on purpose. Without it this reads as "favorites are
broken" when the fix is one `psql` command.

## Sprint 3 additions — accounts

Three new cases from RB-124, agreed in `accounts-contract.md`. Same
`{"message": "..."}` as everything else.

| Situation | Status | Message |
|---|---|---|
| Not signed in | 401 | `Please sign in to save favorites.` |
| Username or email already taken | 409 | `That username is taken. Please pick another.` |
| Wrong username **or** wrong password | 401 | `Incorrect username or password.` |

### Why the third one is deliberately vague

An unknown username and a wrong password return the **same sentence**. If they
differed, anyone could discover which usernames exist by trying them and
reading which message came back. The cost is a less helpful message for someone
who genuinely mistyped their username; that is the right trade.

### The first one needs no new frontend code

`FavoriteButton` already flips optimistically, rolls back when the request
fails, and shows the backend's own sentence. So the 401 reaches the cook as
*"Please sign in to save favorites."* through a path that already exists.

## Sprint 3 additions — recipe detail

Two new cases from RB-127, agreed in `recipe-detail-contract.md`. Same
`{"message": "..."}` as everything else.

| Situation | Status | Message |
|---|---|---|
| No recipe with that id | 404 | `That recipe could not be found.` |
| The id in the address is not a number | 400 | `That recipe link is not valid.` |

### Why 404 needs saying out loud

`SpoonacularClient.translate` folds every status it does not recognise into the
502 above. For an unknown id that blames *our* service for *their* bad link.
Search never returns 404 — a no-match comes back as an empty list, not a status
code — so this only becomes a problem once recipe detail exists.

### Why the 400 is not optional

Spring cannot convert `abc` into a number, so it throws before our controller
runs. With no handler for that, `/api/recipes/abc` returns Spring's default
error body — stack trace, timestamp, path — which rule 2 above forbids.

### Neither of these is the empty recipe

A recipe with no steps, or with no ingredients listed, came back **successfully**.
Those two get their own sentences on the page and are not errors at all; they
live in `recipe-detail-contract.md`, not in this file.

---

## Status

- **RB-82** — this document. Done when both sides have read it.
- **RB-85** — backend. Needs the four exception types, the
  `@RestControllerAdvice`, and the blank-input check. Four rows of the first
  table.
- **RB-86** — frontend. Needs the `.message` read, the two synthesized
  sentences, and an error area on screen.

Changing a message means changing it here first, then in whichever side owns
it. This file is the source of truth.

/ === for RB-159 === /
| Situation                | Status | Message |
|---|---|---|
| Username missing         | 400 | `Please enter a username.` |
| Email missing            | 400 | `Please enter an email address.` |
| Password shorter than 8  | 400 | `Please choose a password of at least 8 characters.` |
| Username longer than 50  | 400 | `That username is too long. Please use 50 characters or fewer.` |
| Email longer than 255    | 400 | `That email address is too long. Please use 255 characters or fewer.` |

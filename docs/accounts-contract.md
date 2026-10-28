# Accounts — the contract between backend and frontend

**RB-156.** Agreed before any code, so the pages can be built while the
endpoints are still being written. Same arrangement as `error-shape.md` and
`dietary-filter-contract.md`, which has worked twice.

**Read this before starting any RB-124 subtask.** If something here turns out
to be wrong or missing, change it here first and tell everyone — do not work
around it in code.

---

## The short version

| Question | Answer |
|---|---|
| How does the browser prove who it is? | A cookie the browser sends on its own. Nothing to build. |
| Do I need an account to search? | **No.** Only favorites need one. |
| What is the password rule? | 8 characters minimum, checked on the backend. |
| Where do error messages come from? | `error-shape.md`. Never write your own. |
| What happens on restart? | Everyone is signed out. Expected, not a bug. |

---

## How the browser proves who it is

Signing in puts the user's id in a **server-side session**. Tomcat then sends a
`JSESSIONID` cookie, and the browser returns it on every later request by
itself.

**There is nothing to build on the frontend for this.** No token to store, no
header to set, no `credentials` option. Because Vite proxies `/api`, every
request is same-origin, so none of that applies. If you find yourself writing
code to carry a token around, stop — it is already handled.

**Sessions live in memory and do not survive a restart.** Restarting the
backend signs everyone out, including you, every time you run
`spring-boot:run`. That is expected during development. The alternative — a
`sessions` table with tokens and expiry — is more than this sprint needs.

---

## The endpoints

```
POST   /api/users          { username, email, password }
    201 { id, username }          account created
    409                           username or email already taken
    400                           password too short, or a field missing

POST   /api/sessions       { username, password }
    200 { id, username }          signed in; the session now holds the user
    401                           any failure at all

DELETE /api/sessions
    204                           always, even if nobody was signed in

GET    /api/session
    200 { id, username }          somebody is signed in
    401                           nobody is
```

Note the plural/singular split: `/api/sessions` **creates and destroys** a
session, `/api/session` **asks about** the current one. It reads oddly at first
and is deliberate — the first is a thing you do, the second is a thing you ask.

`GET /api/session` exists so a page can ask "who am I?" when it loads, instead
of inferring it from some other call failing.

### What needs a session

| Endpoint | Signed in? |
|---|---|
| `GET /api/recipes/search` | no |
| `GET /api/recipes/{id}` *(arrives with RB-127)* | no |
| `GET` `/api/favorites` | **yes** |
| `POST` `/api/favorites` | **yes** |
| `DELETE` `/api/favorites/{id}` | **yes** |

**Search stays open on purpose.** It touches no user and no database. Requiring
an account would stop teammates without one from working, break
`ContextStartsWithoutDatabaseTest`, and make a broken sign-in look like a
broken app.

---

## The rules

### Passwords are at least 8 characters

Checked on the backend like every other rule, so it holds for anyone calling
our API and not just our own form.

### Usernames are at most 50 characters and emails at most 255

Those are the column widths in `V1__initial_schema.sql`. Check them in the
service and return the 400 yourself. Let a 51-character username reach
Postgres and the cook gets a database error instead of a sentence.

### A password hash never crosses HTTP

Two types, and the split is the whole point:

- `StoredUser` — the database row, **including** `password_hash`. Never leaves
  the service layer.
- `UserDto` — `id` and `username` only. This is what goes out over HTTP.

Having two types makes serialising a hash to a browser impossible rather than
merely unlikely. It is the same rule `CLAUDE.md` already applies to
`client/dto/` versus `dto/`.

### A wrong password and an unknown username give the same sentence

If they differed, anyone could discover which usernames exist by trying them
and watching which message came back.

### The frontend never invents validation wording

Whatever the backend sends is what the form shows, exactly as in
`error-shape.md`.

---

## What a signed-out visitor sees

**`/favorites` explains itself.** It stays reachable and shows a sign-in prompt
with a link.

- Not a redirect — the address would change under the visitor, and we would
  then need redirect-back-after-sign-in logic that nobody has budgeted for.
- Not an empty grid — that reads as *"you have saved nothing"* when the truth
  is *"we do not know who you are"*. Same distinction the results page already
  makes between a failed search and one that matched nothing.

Andrew's existing "No favorites yet" block is the shape to copy. The two states
must look different, and a test has to tell them apart.

**The star on a result card stays visible**, and clicking it explains why it
did not work. This needs **no new code**: `FavoriteButton` already flips
optimistically, rolls back when the request fails, and displays the backend's
own sentence. The 401 arrives as *"Please sign in to save favorites."* through
a path that already exists.

Do not hide or disable the star. It would be more work, not less — the card
would have to know about sign-in state, threading it through `RecipeCard` and
`ResultsPage` for no gain. A cook also learns the feature exists rather than
wondering where it went.

---

## Who owns which file

So that two people never create the same class on day one.

| Subtask | Creates and owns |
|---|---|
| **RB-157** hashing | `PasswordHasher` |
| **RB-158** user repository | `StoredUser`, `UserRowMapper`, `UserRepository`, `UsernameTakenException` |
| **RB-159** sign up | `UserController`, `UserService`, `SignUpRequest`, **`UserDto`** |
| **RB-160** sign in / out | `SessionController`, `SessionService`, `SignInRequest`, `NotSignedInException` |
| **RB-162** the pages | `src/api/accounts.js`, the sign-up and sign-in pages |

### ⚠ If you are on RB-160, do not create `UserDto`

**RB-159 owns that file.** Sign-in returns the same type sign-up does, so you
need it — but if you both create it, the result is a conflict in a brand-new
file with no shared history to merge against. Its shape is fixed here so you
can write your service and your tests against it before it exists:

```java
public record UserDto(long id, String username) { }
```

No hash. No email. If it is not on `main` yet when you need to compile, say so
in the channel and whoever has RB-159 will push that one file first. **Ask, do
not duplicate.**

### Files more than one subtask touches

| File | Subtasks | How to keep it calm |
|---|---|---|
| `GlobalExceptionHandler.java` | RB-159, RB-160 | Each appends its own method at the bottom. Do not reorder what is already there. |
| `App.jsx` | RB-162 | Add both routes in one commit. |
| `NavigationBar.jsx` | RB-162 | Peter's file — tell him before touching it. |

The frontend gets a **new** `src/api/accounts.js` rather than additions to
`recipes.js`, which RB-173 and RB-127 will both be modifying.

---

## The session attribute

The literal name is `"userId"` and it holds a `Long`.

It is written in exactly one place — `SessionController`, on sign-in — and read
in exactly one — `FavoriteController`, on every favorites call. A typo between
those two is caught by a test and by nothing else, so the string is written
here to be copied rather than retyped.

RB-161 deletes `DEMO_USER_ID` from `FavoriteService` and replaces it with this.

---

## The three new error messages

These live in `error-shape.md` with everything else. Repeated here only so you
do not have to open two files:

| Situation | Status | Message |
|---|---|---|
| Not signed in | 401 | `Please sign in to save favorites.` |
| Username or email already taken | 409 | `That username is taken. Please pick another.` |
| Wrong username **or** wrong password | 401 | `Incorrect username or password.` |

`error-shape.md` is the source of truth for the wording. Change it there first.

---

## Which subtask needs what from this page

| Subtask | What to read here |
|---|---|
| RB-157 hashing | Nothing. It is self-contained. |
| RB-158 user repository | [The two user types](#a-password-hash-never-crosses-http). |
| RB-159 sign up | [The endpoints](#the-endpoints), [the rules](#the-rules), [file ownership](#who-owns-which-file). |
| RB-160 sign in / out | [The endpoints](#the-endpoints), [the session attribute](#the-session-attribute), [**the `UserDto` warning**](#-if-you-are-on-rb-160-do-not-create-userdto). |
| RB-161 favorites owner | [The session attribute](#the-session-attribute), [what needs a session](#what-needs-a-session). |
| RB-162 the pages | [The endpoints](#the-endpoints), [what a signed-out visitor sees](#what-a-signed-out-visitor-sees). |
| RB-164 demo account | Nothing here. See the sprint spec. |
| RB-167 favorites prompt | [What a signed-out visitor sees](#what-a-signed-out-visitor-sees). |

---

## What is already true in the code

Checked on `main`, so nobody builds something that exists:

- **The schema needs no migration.** `users` already has `username` and `email`
  both `NOT NULL UNIQUE`, `password_hash VARCHAR(255)` (BCrypt produces 60
  characters), and `saved_recipes.user_id` already references `users(user_id)`
  with `ON DELETE CASCADE`. The only database work in this story is RB-164.
- **`FavoriteButton` needs no change.** It already flips optimistically, calls
  `onChange` again to undo it when the request throws, and renders
  `failure.message`. RB-161's 401 surfaces through that path untouched.
- **`FavoritesPage` already has the empty-state block** RB-167 should copy.

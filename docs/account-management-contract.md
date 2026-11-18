# RB-290 — changing a password, and deleting an account

## The two endpoints

```
PUT    /api/users/password   change the password
DELETE /api/users/me         delete the account and everything in it
```

Both require a signed-in session, read the same way RB-208's pantry and
RB-209's restrictions already read it: `getSession(false)`, the `userId`
attribute, and `NotSignedInException` when it isn't there. There is
deliberately **no id in either address** — the cook is whoever the session
says, so asking to change somebody else's password cannot be expressed.

## Both ask for the current password

Change-password takes `{ "currentPassword": ..., "newPassword": ... }`.
Delete-account takes `{ "currentPassword": ... }`.

Delete asks for it too, even though the session already proves who the cook
is. A session left open on a shared laptop is the ordinary case this
protects against, and deleting an account is the one action in this app
that destroys data nothing can bring back.

## The error strings

Three are already settled and are **copied, not composed** — see
`docs/error-shape.md`:

| When | Status | Sentence |
|---|---|---|
| Not signed in | 401 | `Please sign in to save favorites.` |
| New password shorter than 8 | 400 | `Please choose a password of at least 8 characters.` |

One is new to this story, and is now also recorded in `error-shape.md`:

| When | Status | Sentence |
|---|---|---|
| The current password is wrong | 401 | `Incorrect password.` |

**Not** `Incorrect username or password.` That sentence exists to stop
sign-in leaking whether a username is registered. Here the cook is already
signed in, so there is no username to protect and blurring the two would
only make a correct message less clear.

## Mistake — assuming the database cleans up after a deleted user

It mostly does, and that is the trap. `saved_recipes` and `collections`
both declare `REFERENCES users(user_id) ON DELETE CASCADE`, so they vanish
on their own.

**`pantry_items` does not.** V5 created it with a bare
`user_id BIGINT NOT NULL` and no foreign key at all:

```sql
CREATE TABLE IF NOT EXISTS pantry_items (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    pantry VARCHAR(100) NOT NULL,
    CONSTRAINT uk_user_pantry UNIQUE (user_id, pantry)
);
```

So `DELETE FROM users WHERE user_id = ?` succeeds, three tables empty
themselves, and that cook's pantry rows stay behind forever — pointing at a
user id that no longer exists. Nothing errors. Nobody notices until a new
account happens to be issued the same id and inherits a stranger's pantry.

`UserRepository.deleteById` therefore deletes `pantry_items` **explicitly**
first, then the user. Fixing the schema instead was considered and left for
its own migration: adding a foreign key to a live table is a different piece
of work from this story, and the explicit delete is correct either way.

Columns on `users` itself — `pantry`, `diet`, `intolerances` — need no
separate handling; they go with the row.

## On the page

Both live on a new account page, reachable when signed in. Delete sits
behind a confirmation step that names what is about to happen and says it
cannot be undone, and signs the cook out afterward so the app is never
left holding a session for an account that no longer exists.

## What this story does not do

**No "forgot password".** It needs an email-sending path this app has never
had — a mailer, a token table, and an expiry rule. That is its own story,
not a corner of this one.

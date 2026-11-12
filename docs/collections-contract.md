# Collections contract (RB-210)

Agreed before any code asserts on it. Copy the strings; never compose one.

## What a collection is

A named group of one cook's saved recipes. Only the cook who made it can see,
rename, delete or put recipes in it.

A recipe belongs to **exactly one** collection, or to none. A recipe in none is
**loose**: it shows on the favourites page outside the decks, as a single card.
A collected recipe shows only inside its collection.

## The data

```
collections
  collection_id  SERIAL PRIMARY KEY
  user_id        INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE
  name           VARCHAR(50) NOT NULL
  created_at     TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
  UNIQUE (user_id, name)

saved_recipes
  + collection_id INT REFERENCES collections(collection_id) ON DELETE SET NULL
```

`ON DELETE SET NULL`: deleting a collection leaves its recipes saved and loose.
The column is on `saved_recipes` (one person about one recipe), not `recipes`.
Migration: `database/migrations/V8__recipe_collections.sql`.

## The addresses

| Method | Path | Body | Answers |
|---|---|---|---|
| `GET` | `/api/collections` | none | `[{ id, name }]`, newest first |
| `POST` | `/api/collections` | `{ name }` | 201, the created `{ id, name }` |
| `PUT` | `/api/collections/{id}` | `{ name }` | 204 |
| `DELETE` | `/api/collections/{id}` | none | 204 |
| `PUT` | `/api/favorites/{recipeId}/collection` | the collection id, or empty for loose | 204 |

`POST /api/favorites` gains an optional `collectionId`. `GET /api/favorites`
gains `collectionId` on each recipe, null when loose.

## A name must be

Trimmed, 1 to 50 characters, and not a duplicate of another of the same cook's
names, compared ignoring case ("breakfast" is "Breakfast").

## The strings

See `docs/error-shape.md`, "Collections (RB-210)". Six rows, verbatim.

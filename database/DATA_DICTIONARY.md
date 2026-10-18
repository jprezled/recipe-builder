# Recipe Builder Database Data Dictionary

This document describes the schema defined by
[`migrations/V1__initial_schema.sql`](migrations/V1__initial_schema.sql).
`SERIAL` columns are integer identifiers that PostgreSQL populates
automatically. Unless a column is explicitly marked `NOT NULL`, it is nullable;
a default value does not make a column non-nullable.

## Table: `users`

Stores accounts that can save recipes.

| Column | Data type | Constraints | Purpose |
|---|---|---|---|
| `user_id` | `SERIAL` (`INTEGER`) | `PRIMARY KEY` | Automatically generated user identifier. |
| `username` | `VARCHAR(50)` | `NOT NULL`, `UNIQUE` | User's display/login name. |
| `email` | `VARCHAR(255)` | `NOT NULL`, `UNIQUE` | User's email address. |
| `password_hash` | `VARCHAR(255)` | `NOT NULL` | Stores the hashed password. |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | Default `CURRENT_TIMESTAMP`; nullable | Account creation time. |

## Table: `ingredients`

Stores reusable ingredient names and optional Spoonacular identifiers.

| Column | Data type | Constraints | Purpose |
|---|---|---|---|
| `ingredient_id` | `SERIAL` (`INTEGER`) | `PRIMARY KEY` | Automatically generated ingredient identifier. |
| `name` | `VARCHAR(100)` | `NOT NULL`, `UNIQUE` | Ingredient name. |
| `spoonacular_id` | `INT` (`INTEGER`) | `UNIQUE`; nullable | Optional Spoonacular ingredient identifier. |

## Table: `recipes`

Stores recipe information.

| Column | Data type | Constraints | Purpose |
|---|---|---|---|
| `recipe_id` | `SERIAL` (`INTEGER`) | `PRIMARY KEY` | Automatically generated recipe identifier. |
| `spoonacular_id` | `INT` (`INTEGER`) | `UNIQUE`; nullable | Optional Spoonacular recipe identifier. |
| `title` | `VARCHAR(255)` | `NOT NULL` | Recipe title. |
| `image_url` | `VARCHAR(500)` | Nullable | Optional recipe image URL. |
| `servings` | `INT` (`INTEGER`) | `CHECK (servings > 0)`; nullable | Optional number of servings; when supplied, must be greater than zero. |
| `ready_in_minutes` | `INT` (`INTEGER`) | `CHECK (ready_in_minutes >= 0)`; nullable | Optional total preparation time in minutes; when supplied, cannot be negative. |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | Default `CURRENT_TIMESTAMP`; nullable | Time the recipe was stored. |

## Table: `recipe_ingredients`

Join table connecting recipes to ingredients and recording an optional amount
and unit for each ingredient in a recipe.

| Column | Data type | Constraints | Purpose |
|---|---|---|---|
| `recipe_id` | `INT` (`INTEGER`) | `NOT NULL`, foreign key to `recipes.recipe_id` with `ON DELETE CASCADE` | Identifies the recipe. |
| `ingredient_id` | `INT` (`INTEGER`) | `NOT NULL`, foreign key to `ingredients.ingredient_id` with `ON DELETE RESTRICT` | Identifies the ingredient. |
| `amount` | `NUMERIC(8, 2)` | Nullable | Optional ingredient amount. No check constraint is defined. |
| `unit` | `VARCHAR(50)` | Nullable | Optional measurement unit, such as `cup` or `gram`. |

`PRIMARY KEY (recipe_id, ingredient_id)` prevents the same ingredient from
appearing more than once in a recipe.

## Table: `saved_recipes`

Join table recording which recipes each user has saved.

| Column | Data type | Constraints | Purpose |
|---|---|---|---|
| `user_id` | `INT` (`INTEGER`) | `NOT NULL`, foreign key to `users.user_id` with `ON DELETE CASCADE` | Identifies the user who saved the recipe. |
| `recipe_id` | `INT` (`INTEGER`) | `NOT NULL`, foreign key to `recipes.recipe_id` with `ON DELETE CASCADE` | Identifies the saved recipe. |
| `saved_at` | `TIMESTAMP WITH TIME ZONE` | Default `CURRENT_TIMESTAMP`; nullable | Time the recipe was saved. |

`PRIMARY KEY (user_id, recipe_id)` allows a user to save a recipe only once.

## Indexes

The migration creates these indexes in addition to the indexes PostgreSQL
creates for primary-key and unique constraints:

| Index | Table | Column |
|---|---|---|
| `idx_recipe_ingredients_ingredient` | `recipe_ingredients` | `ingredient_id` |
| `idx_saved_recipes_user` | `saved_recipes` | `user_id` |
| `idx_recipes_spoonacular` | `recipes` | `spoonacular_id` |

## Foreign-key behavior summary

| Foreign key | Delete behavior |
|---|---|
| `recipe_ingredients.recipe_id` → `recipes.recipe_id` | `CASCADE` |
| `recipe_ingredients.ingredient_id` → `ingredients.ingredient_id` | `RESTRICT` |
| `saved_recipes.user_id` → `users.user_id` | `CASCADE` |
| `saved_recipes.recipe_id` → `recipes.recipe_id` | `CASCADE` |

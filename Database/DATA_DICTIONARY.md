# Recipe Builder Database Data Dictionary

This document describes the baseline PostgreSQL schema for the recipe-builder
application.
- A user can save many recipes.
- A recipe can be saved by many users.
- A recipe can contain many ingredients.
- An ingredient can appear in many recipes.
- `saved_recipes` resolves the many-to-many relationship between users and
  recipes.
- `recipe_ingredients` resolves the many-to-many relationship between recipes
  and ingredients and stores quantity information for each recipe.

## Table: `users`

Stores accounts that can save recipes.

| Column | Data type | Constraints | Purpose |
|---|---|---|---|
| `user_id` | `BIGINT` identity | `PRIMARY KEY`, `NOT NULL` | Unique identifier for each user. The identity automatically generates a new ID. |
| `username` | `VARCHAR(100)` | `NOT NULL`, `UNIQUE` | User's display/login name. `UNIQUE` prevents two users from using the same name. |
| `email` | `VARCHAR(255)` | `NOT NULL`, `UNIQUE` | User's email address. `UNIQUE` prevents duplicate accounts using the same email. |
| `password_hash` | `VARCHAR(255)` | `NOT NULL` | Stores a securely hashed password, not the user's plain-text password. |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, default `CURRENT_TIMESTAMP` | Records when the account was created, including time-zone information. |

## Table: `ingredients`

Stores reusable ingredient names.

| Column | Data type | Constraints | Purpose |
|---|---|---|---|
| `ingredient_id` | `BIGINT` identity | `PRIMARY KEY`, `NOT NULL` | Unique identifier for each ingredient. |
| `name` | `VARCHAR(100)` | `NOT NULL`, `UNIQUE` | Ingredient name, such as `flour` or `tomato`. `UNIQUE` prevents duplicate ingredient records. |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, default `CURRENT_TIMESTAMP` | Records when the ingredient was added. |

## Table: `recipes`

Stores recipe information independently from its ingredients.

| Column | Data type | Constraints | Purpose |
|---|---|---|---|
| `recipe_id` | `BIGINT` identity | `PRIMARY KEY`, `NOT NULL` | Unique identifier for each recipe. |
| `title` | `VARCHAR(255)` | `NOT NULL` | Recipe title shown to users. |
| `description` | `TEXT` | Nullable | Short description of the recipe. It is nullable because a recipe may not have one. |
| `instructions` | `TEXT` | Nullable | Preparation steps. It is nullable to support incomplete or externally imported recipe records. |
| `prep_time_minutes` | `INTEGER` | Nullable, `CHECK (prep_time_minutes >= 0)` | Preparation time. A negative number is not meaningful, so the check rejects it. |
| `cook_time_minutes` | `INTEGER` | Nullable, `CHECK (cook_time_minutes >= 0)` | Cooking time. A negative number is not meaningful, so the check rejects it. |
| `servings` | `INTEGER` | `NOT NULL`, `CHECK (servings > 0)` | Number of servings. The check prevents zero or negative servings. |
| `image_url` | `VARCHAR(2048)` | Nullable | Optional URL for the recipe image. |
| `source_url` | `VARCHAR(2048)` | Nullable | Optional URL for the original recipe source. |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, default `CURRENT_TIMESTAMP` | Records when the recipe was first stored. |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL`, default `CURRENT_TIMESTAMP` | Records the initial or most recent update time. Application code must update it when a recipe changes. |

## Table: `recipe_ingredients`

Join table connecting recipes to ingredients. It also stores the amount of an
ingredient required by a particular recipe.

| Column | Data type | Constraints | Purpose |
|---|---|---|---|
| `recipe_id` | `BIGINT` | `NOT NULL`, foreign key to `recipes.recipe_id` | Identifies the recipe using the ingredient. `ON DELETE CASCADE` removes the join row when its recipe is deleted. |
| `ingredient_id` | `BIGINT` | `NOT NULL`, foreign key to `ingredients.ingredient_id` | Identifies the ingredient used by the recipe. `ON DELETE RESTRICT` prevents deleting an ingredient that is still used. |
| `quantity` | `NUMERIC(8,2)` | Nullable, `CHECK (quantity IS NULL OR quantity > 0)` | Amount of the ingredient. It may be null for entries such as “salt to taste,” but a supplied amount must be positive. |
| `unit` | `VARCHAR(50)` | Nullable | Measurement unit, such as `cup`, `gram`, or `tablespoon`. |
| `notes` | `TEXT` | Nullable | Additional detail, such as `chopped` or `room temperature`. |

### Primary key for `recipe_ingredients`

`PRIMARY KEY (recipe_id, ingredient_id)` makes the pair unique. This prevents
the same ingredient from being added to the same recipe more than once in this
baseline design. It also makes both columns required.

## Table: `saved_recipes`

Join table recording which recipes each user has saved.

| Column | Data type | Constraints | Purpose |
|---|---|---|---|
| `user_id` | `BIGINT` | `NOT NULL`, foreign key to `users.user_id` | Identifies the user who saved the recipe. `ON DELETE CASCADE` removes their saved rows if the user is deleted. |
| `recipe_id` | `BIGINT` | `NOT NULL`, foreign key to `recipes.recipe_id` | Identifies the saved recipe. `ON DELETE CASCADE` removes saved rows if the recipe is deleted. |
| `saved_at` | `TIMESTAMPTZ` | `NOT NULL`, default `CURRENT_TIMESTAMP` | Records when the recipe was saved. |

### Primary key for `saved_recipes`

`PRIMARY KEY (user_id, recipe_id)` allows a user to save a recipe only once and
prevents duplicate saved-recipe rows.

## Foreign-key behavior summary

| Foreign key | Delete behavior | Reason |
|---|---|---|
| `recipe_ingredients.recipe_id` → `recipes.recipe_id` | `CASCADE` | Ingredient links have no purpose after their recipe is deleted. |
| `recipe_ingredients.ingredient_id` → `ingredients.ingredient_id` | `RESTRICT` | Prevents deleting an ingredient that is still referenced by a recipe. |
| `saved_recipes.user_id` → `users.user_id` | `CASCADE` | A deleted user should not leave saved records behind. |
| `saved_recipes.recipe_id` → `recipes.recipe_id` | `CASCADE` | A deleted recipe should not leave saved records behind. |

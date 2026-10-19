-- Run this only after the schema has been created in a disposable/local
-- PostgreSQL database. This script uses fixture rows inside a transaction and
-- rolls them back at the end. It does not drop or alter application tables.

Begin;

-- a function to test that invalid inserts fail for the right reason. It takes a SQL statement and an expected error message.
CREATE FUNCTION pg_temp.expect_constraint_error(
    test_name TEXT,
    statement TEXT,
    expected_sqlstate TEXT
) RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    actual_sqlstate TEXT;
BEGIN
    BEGIN
        EXECUTE statement;
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS actual_sqlstate = RETURNED_SQLSTATE;
        IF actual_sqlstate = expected_sqlstate THEN
            RAISE NOTICE 'PASS: % (rejected as expected)', test_name;
            RETURN;
        END IF;
        RAISE EXCEPTION 'FAIL: % expected SQLSTATE %, got %',
            test_name, expected_sqlstate, actual_sqlstate;
    END;

    RAISE EXCEPTION 'FAIL: % was accepted; expected SQLSTATE %',
        test_name, expected_sqlstate;
END;
$$;

--Wrap the fixture data in a transaction so that it can be rolled back at the end. This is important because the fixture data is not
--valid for the application, and we don't want to leave it in the database.
--Essentially this will add valid data, then test that invalid data is rejected, and returning the right error code.

INSERT INTO users (username, email, password_hash)
VALUES ('__constraint_test_user_a', '__constraint_test_a@example.invalid', 'test-hash');

INSERT INTO users (username, email, password_hash)
VALUES ('__constraint_test_user_b', '__constraint_test_b@example.invalid', 'test-hash');

INSERT INTO ingredients (name, spoonacular_id)
VALUES ('__constraint_test_ingredient_a', -2100000001);

INSERT INTO ingredients (name, spoonacular_id)
VALUES ('__constraint_test_ingredient_b', -2100000002);

INSERT INTO recipes (spoonacular_id, title, servings, ready_in_minutes)
VALUES (-2100000003, '__constraint_test_recipe_a', 2, 0);

INSERT INTO recipes (spoonacular_id, title, servings, ready_in_minutes)
VALUES (-2100000004, '__constraint_test_recipe_b', 1, 15);

INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit)
SELECT r.recipe_id, i.ingredient_id, 1, 'cup'
FROM recipes r CROSS JOIN ingredients i
WHERE r.title = '__constraint_test_recipe_a'
  AND i.name = '__constraint_test_ingredient_a';

INSERT INTO saved_recipes (user_id, recipe_id)
SELECT u.user_id, r.recipe_id
FROM users u CROSS JOIN recipes r
WHERE u.username = '__constraint_test_user_a'
  AND r.title = '__constraint_test_recipe_a';

-- Catch an incomplete/partially selected run before a SELECT-based test can
-- accidentally insert zero rows and appear to pass.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE username = '__constraint_test_user_a')
       OR NOT EXISTS (SELECT 1 FROM users WHERE username = '__constraint_test_user_b')
       OR NOT EXISTS (SELECT 1 FROM ingredients WHERE name = '__constraint_test_ingredient_a')
       OR NOT EXISTS (SELECT 1 FROM ingredients WHERE name = '__constraint_test_ingredient_b')
       OR NOT EXISTS (SELECT 1 FROM recipes WHERE title = '__constraint_test_recipe_a')
       OR NOT EXISTS (SELECT 1 FROM recipes WHERE title = '__constraint_test_recipe_b') THEN
        RAISE EXCEPTION 'Test fixture missing. Run the complete script from the beginning in one Query Tool session.';
    END IF;
END;
$$;

-- USERS: NOT NULL and UNIQUE

SELECT pg_temp.expect_constraint_error(
    'recipes.title NOT NULL',
    $$INSERT INTO recipes (spoonacular_id) VALUES (-2100000011)$$,
    '23502'
);
SELECT pg_temp.expect_constraint_error(
    'recipes.spoonacular_id UNIQUE for non-NULL values',
    $$INSERT INTO recipes (spoonacular_id, title) VALUES (-2100000003, '__constraint_test_duplicate_spoonacular_recipe')$$,
    '23505'
);
SELECT pg_temp.expect_constraint_error(
    'recipes.servings CHECK (servings > 0)',
    $$INSERT INTO recipes (title, servings) VALUES ('__constraint_test_zero_servings', 0)$$,
    '23514'
);
SELECT pg_temp.expect_constraint_error(
    'recipes.ready_in_minutes CHECK (ready_in_minutes >= 0)',
    $$INSERT INTO recipes (title, ready_in_minutes) VALUES ('__constraint_test_negative_time', -1)$$,
    '23514'
);

-- RECIPE_INGREDIENTS: NOT NULL, foreign keys, and composite primary key
SELECT pg_temp.expect_constraint_error(
    'recipe_ingredients.recipe_id NOT NULL',
    $$INSERT INTO recipe_ingredients (ingredient_id) SELECT ingredient_id FROM ingredients WHERE name = '__constraint_test_ingredient_a'$$,
    '23502'
);
SELECT pg_temp.expect_constraint_error(
    'recipe_ingredients.ingredient_id NOT NULL',
    $$INSERT INTO recipe_ingredients (recipe_id) SELECT recipe_id FROM recipes WHERE title = '__constraint_test_recipe_a'$$,
    '23502'
);
SELECT pg_temp.expect_constraint_error(
    'recipe_ingredients recipe foreign key',
    $$INSERT INTO recipe_ingredients (recipe_id, ingredient_id) SELECT -2147483648, ingredient_id FROM ingredients WHERE name = '__constraint_test_ingredient_b'$$,
    '23503'
);
SELECT pg_temp.expect_constraint_error(
    'recipe_ingredients ingredient foreign key',
    $$INSERT INTO recipe_ingredients (recipe_id, ingredient_id) SELECT recipe_id, -2147483648 FROM recipes WHERE title = '__constraint_test_recipe_b'$$,
    '23503'
);
SELECT pg_temp.expect_constraint_error(
    'recipe_ingredients composite primary key',
    $$INSERT INTO recipe_ingredients (recipe_id, ingredient_id) SELECT r.recipe_id, i.ingredient_id FROM recipes r CROSS JOIN ingredients i WHERE r.title = '__constraint_test_recipe_a' AND i.name = '__constraint_test_ingredient_a'$$,
    '23505'
);

-- SAVED_RECIPES: NOT NULL, foreign keys, and composite primary key
SELECT pg_temp.expect_constraint_error(
    'saved_recipes.user_id NOT NULL',
    $$INSERT INTO saved_recipes (recipe_id) SELECT recipe_id FROM recipes WHERE title = '__constraint_test_recipe_b'$$,
    '23502'
);
SELECT pg_temp.expect_constraint_error(
    'saved_recipes.recipe_id NOT NULL',
    $$INSERT INTO saved_recipes (user_id) SELECT user_id FROM users WHERE username = '__constraint_test_user_b'$$,
    '23502'
);
SELECT pg_temp.expect_constraint_error(
    'saved_recipes user foreign key',
    $$INSERT INTO saved_recipes (user_id, recipe_id) SELECT -2147483648, recipe_id FROM recipes WHERE title = '__constraint_test_recipe_b'$$,
    '23503'
);
SELECT pg_temp.expect_constraint_error(
    'saved_recipes recipe foreign key',
    $$INSERT INTO saved_recipes (user_id, recipe_id) SELECT user_id, -2147483648 FROM users WHERE username = '__constraint_test_user_b'$$,
    '23503'
);
SELECT pg_temp.expect_constraint_error(
    'saved_recipes composite primary key',
    $$INSERT INTO saved_recipes (user_id, recipe_id) SELECT u.user_id, r.recipe_id FROM users u CROSS JOIN recipes r WHERE u.username = '__constraint_test_user_a' AND r.title = '__constraint_test_recipe_a'$$,
    '23505'
);

-- Index inventory. The listed indexes should be present after the schema runs.
-- PostgreSQL also creates indexes automatically for PRIMARY KEY and UNIQUE.
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('users', 'ingredients', 'recipes', 'recipe_ingredients', 'saved_recipes')
ORDER BY tablename, indexname;

-- The ingredient lookup index should support this query. With this small test
-- dataset PostgreSQL may still choose a sequential scan; that is normal.
EXPLAIN
SELECT *
FROM recipe_ingredients
WHERE ingredient_id = (
    SELECT ingredient_id
    FROM ingredients
    WHERE name = '__constraint_test_ingredient_a'
);

-- Query shapes supported by existing primary-key/unique indexes:
EXPLAIN
SELECT * FROM saved_recipes
WHERE user_id = (SELECT user_id FROM users WHERE username = '__constraint_test_user_a');

EXPLAIN
SELECT * FROM recipes WHERE spoonacular_id = -2100000003;

-- Undo all fixture rows and remove the temporary helper function.
-- rollback the data by using ctrl+shift_r or 'ROLLBACK;' if once you run the script if an error occurs before the automatic rollback.
rollback;

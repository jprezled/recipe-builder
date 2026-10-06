-- Removes tables so the database can be rebuilt
BEGIN;
DROP TABLE IF EXISTS saved_recipes CASCADE;
DROP TABLE IF EXISTS recipe_ingredients CASCADE;
DROP TABLE IF EXISTS recipes CASCADE;
DROP TABLE IF EXISTS ingredients CASCADE;
DROP TABLE IF EXISTS users CASCADE;

COMMIT;
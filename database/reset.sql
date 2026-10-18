-- Completely reset and rebuild the local recipe-builder database.
-- Run this command from the project root if you want to reset the database to its initial state.
-- psql -d recipe_builder_db -f database/reset.sql
--
-- WARNING: This deletes all data in the five application tables.

-- Stop execution if any command fails.
--
-- The comment has to be on its own line. \set is a psql command, not SQL, so
-- "--" does not start a comment there - everything after the value becomes
-- part of the value, and ON_ERROR_STOP is then not a boolean.
\set ON_ERROR_STOP on

\echo 'Dropping the existing recipe-builder schema...'
\ir migrations/teardown.sql

\echo 'Recreating the recipe-builder schema...'
\ir migrations/V1__initial_schema.sql

\echo 'Restoring the hardcoded demo user...'
\ir migrations/V2__demo_user.sql

-- Put the id counters back to the start.
--
-- ALTER TABLE ... ALTER COLUMN ... RESTART WITH only works on a column declared
-- GENERATED AS IDENTITY. These are SERIAL, which is a plain integer column with
-- a separate sequence behind it, so the sequence is what gets restarted.
--
-- V2 above sets users_user_id_seq itself, so it is deliberately not reset here.
ALTER SEQUENCE ingredients_ingredient_id_seq RESTART WITH 1;
ALTER SEQUENCE recipes_recipe_id_seq RESTART WITH 1;

\echo 'Database reset completed successfully.'

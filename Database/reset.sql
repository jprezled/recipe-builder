-- Completely reset and rebuild the local recipe-builder database.
-- Run this command from the project root if you want to reset the database to its initial state.
-- psql -d recipe_builder_db -f database/reset.sql
--
-- WARNING: This deletes all data in the five application tables.
\set ON_ERROR_STOP on -- Stop execution if any command fails.
\echo 'Dropping the existing recipe-builder schema...'
\ir migrations/teardown.sql

\echo 'Recreating the recipe-builder schema...'
\ir migrations/V1_initial_schema.sql

-- Identity sequences are recreated by the migration. These commands make the
-- intended starting point explicit and are safe immediately after creation.
ALTER TABLE users ALTER COLUMN user_id RESTART WITH 1;
ALTER TABLE ingredients ALTER COLUMN ingredient_id RESTART WITH 1;
ALTER TABLE recipes ALTER COLUMN recipe_id RESTART WITH 1;

\echo 'Database reset completed successfully.'

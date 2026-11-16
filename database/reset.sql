-- =============================================================================
-- reset.sql: completely reset and rebuild the local recipe-builder database.
--
-- WARNING: this DELETES ALL DATA in the database it is run against, then
-- rebuilds the schema and the demo data. Check which database you are
-- connected to before running it. Never run it against a database you care
-- about.
--
-- There are two databases in this project:
--   recipe_builder_db        the one the app uses (your accounts and favorites)
--   recipe_builder_test_db   the one the automated tests use. The tests
--                            truncate its tables, so the app must never be
--                            pointed at it.
-- Run this script on each one when the schema changes.
--
-- This file uses psql commands (\set, \echo, \ir). Those are NOT SQL, so it
-- cannot be run from pgAdmin's Query Tool. Use one of the two ways below.
--
-- -----------------------------------------------------------------------------
-- OPTION 1: psql in a terminal (best: works the same for everyone)
--
--   From the project root:
--
--     psql -U <your_username> -d recipe_builder_db -f database/reset.sql
--
--   For the test database:
--
--     psql -U <your_username> -d recipe_builder_test_db -f database/reset.sql
--
--   If "psql" is not recognised on Windows, add PostgreSQL's bin folder
--   (for example C:\Program Files\PostgreSQL\16\bin) to your PATH, or use
--   OPTION 2.
--
-- -----------------------------------------------------------------------------
-- OPTION 2: the PSQL Tool inside pgAdmin
--
--   1. In pgAdmin, right-click the database (recipe_builder_db or
--      recipe_builder_test_db), then choose PSQL Tool.
--   2. Check the prompt shows the database you meant, for example
--      recipe_builder_db=#. To switch: \c recipe_builder_db
--   3. Run the script with its full path. Use FORWARD slashes, even on
--      Windows, and put quotes around the path if it has spaces:
--
--        \i 'C:/path/to/your/project/database/reset.sql'
--
--      The migrations are found automatically, because this file loads them
--      with \ir, which means "relative to this file".
--
--   Do NOT open this file in the Query Tool and press F5: the \ lines will
--   fail there. (To use the Query Tool anyway, open and run each file in
--   migrations/ by hand, in the order listed below, skipping this file.)
--
-- -----------------------------------------------------------------------------
-- IF IT FAILS
--
--   "relation ... already exists"  migrations/teardown.sql does not drop that
--                                  table. Add it there, then run this again.
--   "could not open file"          the path is wrong. Check the spelling and
--                                  the forward slashes.
--   "database ... does not exist"  create it first:
--                                  CREATE DATABASE recipe_builder_db;
--
-- The comment below has to stay on its own line. \set is a psql command, not
-- SQL, so "--" does not start a comment there: everything after the value
-- becomes part of the value, and ON_ERROR_STOP is then not a boolean.
-- =============================================================================

-- Stop execution if any command fails.
\set ON_ERROR_STOP on
\echo 'About to wipe database:'
SELECT current_database();

\echo 'Dropping the existing recipe-builder schema...'
\ir migrations/teardown.sql

\echo 'Recreating the recipe-builder schema...'
\ir migrations/V1__initial_schema.sql

\echo 'Restoring the hardcoded demo user...'
\ir migrations/V2__demo_user.sql

\echo 'Restoring demo password hash...'
\ir migrations/V3__demo_user_password.sql

\echo 'Restoring saved recipe note...'
\ir migrations/V4__saved_recipe_note.sql

-- There is no V5 on purpose (the numbering skips from V4 to V6) if it exist add it here.

\echo 'Restoring saved recipe restrictions...'
\ir migrations/V6__saved_restrictions.sql

\echo 'Restoring saved recipe ingredients...'
\ir migrations/V7__saved_recipe_ingredients.sql

\echo 'Restoring recipe collections...'
\ir migrations/V8__recipe_collections.sql

\echo 'Restoring user pantry...'
\ir migrations/V9__add_user_pantry.sql

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

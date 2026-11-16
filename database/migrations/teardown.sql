-- Drops everything the migrations create, so reset.sql can rebuild from nothing.
-- Dropping the whole schema means a table added by a later migration can never
-- be forgotten here.
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

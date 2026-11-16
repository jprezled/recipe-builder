-- RB-208: the ingredients a cook keeps in their kitchen, one row each.
--
-- Numbered V5 rather than V2. It arrived as a second V2, colliding with
-- V2__demo_user.sql - two files claiming one number, so "apply them in
-- order" had no answer. V5 was the free gap.
--
-- IF NOT EXISTS so re-running is harmless: nothing records which
-- migrations have run, and reset.sql replays the whole folder.
CREATE TABLE IF NOT EXISTS pantry_items (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    pantry VARCHAR(100) NOT NULL,
    CONSTRAINT uk_user_pantry UNIQUE (user_id, pantry)
);
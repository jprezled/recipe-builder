-- The single hardcoded user that owns saved recipes until accounts ship.
--
-- This lives in schema setup, NOT in seeds/sample_data.sql, on purpose:
-- saved_recipes.user_id is a foreign key to users(user_id), so if this row is
-- missing the very first "save a favorite" fails with a constraint violation
-- that reads like a bug in the favorites code rather than like missing data.
-- The seeds are optional; this is not.
--
-- The id is written explicitly so application code can rely on it being 1.
-- FavoriteService.DEMO_USER_ID is the only place that id appears in Java, and
-- when accounts arrive it is what gets replaced by the signed-in user.
INSERT INTO users (user_id, username, email, password_hash)
VALUES (1, 'demo', 'demo@example.com', 'not-a-real-hash')
ON CONFLICT (user_id) DO NOTHING;

-- SERIAL keeps its own counter, which the explicit id above did not advance.
-- Without this, the first real signup would try to reuse id 1 and fail.
SELECT setval('users_user_id_seq', GREATEST((SELECT MAX(user_id) FROM users), 1));

-- RB-205: let a cook keep their own notes on a saved recipe.
--
-- The column goes on saved_recipes, NOT on recipes. saved_recipes already has
-- a primary key of (user_id, recipe_id), so a column here is automatically per
-- person per recipe. On recipes it would be shared, and two cooks who saved the
-- same recipe would overwrite each other's notes.
--
-- Nullable with no default: NULL means no note was written. An empty string is
-- never stored, so "never wrote one" and "wrote one and cleared it" stay the
-- same thing and the page has one empty case instead of two.
--
-- TEXT rather than VARCHAR(n): the 500-character limit is enforced in the
-- service, and a length here would be a second place to keep in step with it.
ALTER TABLE saved_recipes
    ADD COLUMN note TEXT;

-- RB-262: keep a saved recipe's ingredient list in our own database.
-- ON `recipes`, NOT `saved_recipes`. The ingredient list is a fact about the
-- recipe, not about one person's decision to save it: two cooks who save the
-- same recipe want the same list, and putting it on saved_recipes would store
-- a second identical copy per person. Contrast `note`, which V4 deliberately
-- put on saved_recipes because it IS per-person.
-- IF NOT EXISTS because anyone who built sprint 4 locally already has this
-- column, and reset.sql chains every migration together - so without it the
-- whole rebuild stops here on their machine while working on a fresh one.
ALTER TABLE recipes
    ADD COLUMN IF NOT EXISTS ingredients_json TEXT;
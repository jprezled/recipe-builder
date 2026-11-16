-- RB-262: keep a saved recipe's ingredient list in our own database.
-- ON `recipes`, NOT `saved_recipes`. The ingredient list is a fact about the
-- recipe, not about one person's decision to save it: two cooks who save the
-- same recipe want the same list, and putting it on saved_recipes would store
-- a second identical copy per person. Contrast `note`, which V4 deliberately
-- put on saved_recipes because it IS per-person.
ALTER TABLE recipes
    ADD COLUMN ingredients_json TEXT;
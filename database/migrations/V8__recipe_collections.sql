-- RB-210: let a cook group their saved recipes into named collections.
--
-- ON DELETE SET NULL on saved_recipes.collection_id is what makes deleting a
-- collection leave its recipes saved and loose. CASCADE would delete the
-- saved_recipes rows and silently unsave every recipe in it.
--
-- UNIQUE (user_id, name), not UNIQUE (name): two cooks may both have a
-- "Breakfast".
--
-- The new column is nullable with no default: no collection is the ordinary
-- case, and it is what every row saved before this migration gets.
CREATE TABLE collections (
    collection_id SERIAL PRIMARY KEY,
    user_id       INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    name          VARCHAR(50) NOT NULL,
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, name)
);

ALTER TABLE saved_recipes
    ADD COLUMN collection_id INT REFERENCES collections(collection_id) ON DELETE SET NULL;

CREATE INDEX idx_collections_user ON collections(user_id);
CREATE INDEX idx_saved_recipes_collection ON saved_recipes(collection_id);

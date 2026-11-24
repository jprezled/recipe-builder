-- RB-297: let a cook rate a recipe 1 to 5 stars. One rating per cook per
-- recipe; rating again replaces it.
--
-- Keyed on Spoonacular's id, not on recipes(recipe_id): a recipe only gets a
-- row in recipes once somebody favorites it, and a cook must be able to rate a
-- recipe straight from the search results without saving it first.
--
-- ON DELETE CASCADE on user_id so deleting an account (RB-290) clears its
-- ratings without UserRepository.deleteById having to know this table exists.
CREATE TABLE recipe_ratings (
    spoonacular_id BIGINT NOT NULL,
    user_id        INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    rating         SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    rated_at       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (spoonacular_id, user_id)
);

CREATE INDEX idx_recipe_ratings_spoonacular ON recipe_ratings(spoonacular_id);

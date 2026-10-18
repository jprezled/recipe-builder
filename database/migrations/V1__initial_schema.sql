DROP TABLE IF EXISTS saved_recipes CASCADE;
DROP TABLE IF EXISTS recipe_ingredients CASCADE;
DROP TABLE IF EXISTS recipes CASCADE;
DROP TABLE IF EXISTS ingredients CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ingredients (
    ingredient_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    spoonacular_id INT UNIQUE
);

CREATE TABLE recipes (
    recipe_id SERIAL PRIMARY KEY,
    spoonacular_id INT UNIQUE,
    title VARCHAR(255) NOT NULL,
    image_url VARCHAR(500),
    servings INT CHECK (servings > 0),
    ready_in_minutes INT CHECK (ready_in_minutes >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE recipe_ingredients (
    recipe_id INT NOT NULL REFERENCES recipes(recipe_id) ON DELETE CASCADE,
    ingredient_id INT NOT NULL REFERENCES ingredients(ingredient_id) ON DELETE RESTRICT,
    amount NUMERIC(8, 2),
    unit VARCHAR(50),
    PRIMARY KEY (recipe_id, ingredient_id)
);

CREATE TABLE saved_recipes (
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    recipe_id INT NOT NULL REFERENCES recipes(recipe_id) ON DELETE CASCADE,
    saved_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, recipe_id)
);

CREATE INDEX idx_recipe_ingredients_ingredient ON recipe_ingredients(ingredient_id);
CREATE INDEX idx_saved_recipes_user ON saved_recipes(user_id);
CREATE INDEX idx_recipes_spoonacular ON recipes(spoonacular_id);

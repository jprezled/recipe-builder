-- Insert Test User
INSERT INTO users (username, email, password_hash) 
VALUES ('ethan_dev', 'ethan@example.com', 'hashed_pass_123');

-- Insert Common Ingredients
INSERT INTO ingredients (name, spoonacular_id) VALUES
('Chicken Breast', 5062),
('Garlic', 11215),
('Pasta', 20420),
('Olive Oil', 1034053);

-- Insert Sample Recipe
INSERT INTO recipes (title, image_url, servings, ready_in_minutes) 
VALUES ('Garlic Chicken Pasta', 'https://example.com/pasta.jpg', 4, 30);

-- Link Ingredients to Recipe
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit) VALUES
(1, 1, 2.00, 'lbs'),
(1, 2, 4.00, 'cloves'),
(1, 3, 16.00, 'oz'),
(1, 4, 2.00, 'tbsp');

-- Insert Saved Recipe Sample
INSERT INTO saved_recipes (user_id, recipe_id) VALUES (1, 1);
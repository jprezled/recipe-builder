CREATE TABLE pantry_items (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    pantry VARCHAR(100) NOT NULL,
    CONSTRAINT uk_user_pantry UNIQUE (user_id, pantry)
);
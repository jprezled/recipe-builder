package com.recipebuilder.dto;

/**
 * The body the frontend POSTs to save a favorite.
 *
 * It carries the title and image rather than just the id, and that is the whole
 * point: if we only received an id, the backend would have to ask Spoonacular
 * what the recipe is called - one of our 150 daily points spent per favorite.
 * The browser already has the title and image on screen from the search, so it
 * sends them along and saving costs us nothing.
 */
public record FavoriteRequest(
        long id,
        String title,
        String imageUrl) {
}

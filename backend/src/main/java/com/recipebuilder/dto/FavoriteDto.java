package com.recipebuilder.dto;

/**
 * One saved recipe, as our API hands it back to the frontend.
 *
 * "id" is SPOONACULAR's id, not our recipes.recipe_id. That is deliberate: the
 * frontend already uses Spoonacular's id for search results, so using the same
 * one here means "id" means the same thing on every page. Our own serial
 * primary key stays an internal database detail that never leaves the backend.
 *
 * Smaller than RecipeSummaryDto on purpose. "ingredientsYouHave" describes what
 * the cook typed into the search box, not the recipe, so it is meaningful on a
 * search result and meaningless on something saved last week.
 */
public record FavoriteDto(
        long id,
        String title,
        String imageUrl,
        /**
         * RB-205: the cook's own note about this recipe, or null when they
         * have not written one. Null rather than an empty string, so "no note"
         * and "a note they cleared" are the same thing and the page has one
         * case to handle rather than two.
         */
        String note) {
}

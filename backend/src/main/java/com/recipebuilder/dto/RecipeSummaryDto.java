package com.recipebuilder.dto;

/**
 * One recipe in OUR shape. This is what our API returns to the frontend.
 *
 * Deliberately not Spoonacular's shape, and deliberately smaller: we declare
 * only the five things the screen actually shows. Their payload carries image
 * types, aisles, like counts, unit abbreviations and more - none of it is our
 * frontend's business.
 *
 * The names are ours too. Spoonacular says "usedIngredientCount"; we say
 * "ingredientsYouHave", because that is what it means to someone reading the
 * screen. The conversion lives in RecipeService, so if Spoonacular renames a
 * field only that one mapping changes and the frontend never notices.
 */
public record RecipeSummaryDto(
        long id,
        String title,
        String imageUrl,
        int ingredientsYouHave,
        int ingredientsYouNeed,
        /** How much of this recipe's ingredient list you already have, 0-100. */
        int matchPercent) {
}

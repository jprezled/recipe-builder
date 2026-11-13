package com.recipebuilder.dto;

import java.util.List;

/**
 * One whole recipe in OUR shape. This is what the detail page receives.
 *
 * Spoonacular's record of a recipe has around 37 top-level fields; these are
 * the ones the page has somewhere to put. Which field fills which slot is
 * fixed by docs/recipe-detail-contract.md.
 *
 * The names are ours: Spoonacular says "image", we say "imageUrl". The
 * conversion lives in RecipeService, so if they rename a field only that one
 * mapping changes and the frontend never notices.
 */
public record RecipeDetailDto(
        long id,
        String title,
        String imageUrl,
        int servings,
        int readyInMinutes,
        /** Whole phrases, ready to read: "3 cloves of garlic (minced)". */
        List<String> ingredients,
        /** The steps in order. Empty when the recipe came with none. */
        List<String> steps,
        Diets diets,
        Nutrition nutrition) {

    /**
     * What this recipe suits.
     *
     * These are the recipe's own labels, NOT the values the dietary filter
     * sends - see docs/dietary-filter-contract.md. Deriving one from the other
     * breaks the first time they diverge.
     */
    public record Diets(
            boolean vegetarian,
            boolean vegan,
            boolean glutenFree,
            boolean dairyFree) {
    }

     /** The six nutrition figures, per serving. */
    public record Nutrition(
            double calories,
            double fat,
            double saturatedFat,
            double carbohydrates,
            double sugar,
            double protein) {
    }   
}

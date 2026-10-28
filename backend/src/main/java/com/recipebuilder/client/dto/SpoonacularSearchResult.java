package com.recipebuilder.client.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

/**
 * Matches ONE item in Spoonacular's /recipes/complexSearch response.
 *
 * This is their JSON shape, not ours. A service layer converts it into our own
 * DTO before anything reaches the frontend, so if Spoonacular renames a field
 * only this file breaks.
 *
 * @JsonIgnoreProperties(ignoreUnknown = true) is required, not optional: their
 * payload carries many fields we do not declare, and Jackson throws on unknown
 * properties by default.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record SpoonacularSearchResult(
        long id,
        String title,
        String image,
        int usedIngredientCount,
        int missedIngredientCount,
        List<Ingredient> usedIngredients,
        List<Ingredient> missedIngredients) {

    /** A single ingredient entry. We only need its name. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Ingredient(String name) {
    }
}

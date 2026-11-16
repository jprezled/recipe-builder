package com.recipebuilder.dto;

/**
 * One ingredient suggestion in the format used by our frontend.
 */
public record IngredientSuggestionDto(String name, String imageUrl) {
}
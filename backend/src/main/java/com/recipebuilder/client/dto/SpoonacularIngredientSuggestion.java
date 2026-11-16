package com.recipebuilder.client.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * One ingredient suggestion returned by Spoonacular.
 * image is a filename, such as "tomato.png", rather than a URL.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record SpoonacularIngredientSuggestion(String name, String image) {
}

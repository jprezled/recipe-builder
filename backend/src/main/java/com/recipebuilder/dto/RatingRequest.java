package com.recipebuilder.dto;

/** RB-297: the body of POST /api/recipes/{id}/rating. */
public record RatingRequest(int rating) {
}

package com.recipebuilder.dto;

/**
 * RB-294 / RB-297: one recipe's rating as the detail page reads it.
 *
 * yourRating is boxed because it is genuinely absent - null for a signed-out
 * visitor or a cook who has not rated it - and zero would read as a score.
 */
public record RatingDto(double average, int count, Integer yourRating) {
}

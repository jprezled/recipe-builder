package com.recipebuilder.dto;

/**
 * RB-294: one recipe's shared rating - the average and how many cooks gave it.
 *
 * count 0 means nobody has rated it; the average is 0 then and must not be
 * shown as a score.
 */
public record RatingSummaryDto(long id, double average, int count) {
}

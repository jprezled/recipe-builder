package com.recipebuilder.client.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

/**
 * RB-193: what priceBreakdownWidget.json sends back.
 *
 * Prices are in CENTS, like everywhere else in their API.
 *
 * Note what this reply does NOT carry: an ingredient id. Only a name - and
 * their names differ between endpoints, so the search calls something "basil"
 * that this endpoint calls "dried basil". That is why RecipeService subtracts
 * what the cook HAS from the total rather than adding up what they need; the
 * "has" list is short and comes from words the cook typed themselves.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record SpoonacularPriceBreakdown(
        double totalCost,
        double totalCostPerServing,
        List<PricedIngredient> ingredients) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record PricedIngredient(String name, double price) {
    }
}

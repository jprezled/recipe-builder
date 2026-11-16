package com.recipebuilder.dto;

import java.util.List;

/**
 * RB-193: what one recipe costs, and how much of it the cook still has to buy.
 *
 * Dollars everywhere. Spoonacular works in cents; the conversion happens in
 * RecipeService so that nothing above it has to remember.
 *
 * `inPantry` is worked out fresh on every request from the pantry in the web
 * address, which is exactly why this object cannot be cached while their
 * price list can. See docs/cost-contract.md, Mistake 2.
 */
public record RecipeCostDto(
        /** Every ingredient, at national-average prices. */
        double total,
        /** The part the cook already has - total minus youNeed. */
        double youHave,
        /** The part still to buy. */
        double youNeed,
        List<CostItem> items) {

    public record CostItem(String name, double price, boolean inPantry) {
    }
}

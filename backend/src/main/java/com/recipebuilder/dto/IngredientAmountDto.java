// RB-291

package com.recipebuilder.dto;

/**
 * RB-291: one ingredient's numeric amount, for scaling the recipe's servings.
 *
 * Alongside {@code ingredients}, not instead of it - the frontend shows the
 * rich original phrase at the recipe's own serving count, and only falls
 * back to rebuilding a line from this amount and unit once the cook has
 * changed the serving count. See docs/recipe-scaling-contract.md.
 */
public record IngredientAmountDto(String name, double amount, String unit) {
}

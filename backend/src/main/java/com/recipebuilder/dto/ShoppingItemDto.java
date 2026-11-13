package com.recipebuilder.dto;

/**
* RB-203: one thing the cook needs to buy for a recipe.
*
* Built from the search reply's missedIngredients. Spoonacular has already
* worked out which of the recipe's ingredients the cook is missing, because
* the search told it what they have - so there is no matching to do on our
* side and no second call to make.
*
* "line" is their whole phrase, ready to read. "aisle" is free text rather
* than a fixed set, so anything unrecognised still has to land somewhere.
*/
public record ShoppingItemDto(String name, String line, String aisle) {
}

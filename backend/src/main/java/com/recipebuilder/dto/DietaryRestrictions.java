package com.recipebuilder.dto;

import java.util.List;

/**
 * The cook's diet and intolerance choices, plus the values we accept for each.
 *
 * The approved values come from docs/dietary-filter-contract.md (RB-168):
 * nine in all, lowercase, with spaces rather than hyphens. "none" means the
 * cook chose nothing and is always allowed, so it is not in either list.
 */
public record DietaryRestrictions(String diet, String intolerances) {

    public static final List<String> APPROVED_DIETS = List.of(
            "vegetarian", "vegan", "gluten free");

    public static final List<String> APPROVED_INTOLERANCES = List.of(
            "dairy", "egg", "peanut", "tree nut", "shellfish", "soy");
}
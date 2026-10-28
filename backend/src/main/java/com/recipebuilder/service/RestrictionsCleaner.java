package com.recipebuilder.service;

import com.recipebuilder.dto.DietaryRestrictions;

/**
 * Tidies the diet and intolerance choices into one predictable shape.
 *
 * Used by both the service and the cache key, for the same reason as
 * IngredientList: if they cleaned differently, the cache would be keyed on
 * something we never searched for.
 */
public final class RestrictionsCleaner {

    /** What a missing choice becomes. */
    public static final String NONE = "none";

    private RestrictionsCleaner() {
    }

    /** A missing, blank or null choice becomes "none"; everything else is cleaned. */
    public static DietaryRestrictions clean(DietaryRestrictions raw) {
        if (raw == null) {
            return new DietaryRestrictions(NONE, NONE);
        }
        return new DietaryRestrictions(
                cleanDiet(raw.diet()),
                cleanIntolerances(raw.intolerances()));
    }

    /** Exactly one value: trimmed and lowercased. */
    private static String cleanDiet(String raw) {
        if (raw == null || raw.isBlank()) {
            return NONE;
        }
        return raw.trim().toLowerCase();
    }

    /** A comma-separated list, cleaned and sorted the same way as the ingredients. */
    private static String cleanIntolerances(String raw) {
        String cleaned = IngredientList.normalise(raw);
        return cleaned.isEmpty() ? NONE : cleaned;
    }
}
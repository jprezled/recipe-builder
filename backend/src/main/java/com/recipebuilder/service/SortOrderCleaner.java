package com.recipebuilder.service;

import java.util.Set;

/**
 * RB-224: the two sort orders we offer, and tidying up what the cook sent.
 *
 * Mirrors RestrictionsCleaner: this class only CLEANS. Refusing a sort we do
 * not offer happens in RecipeService, before Spoonacular is called.
 *
 * The values and the default are agreed in docs/sort-contract.md.
 */
public final class SortOrderCleaner {

    /** The default: most of your ingredients used. */
    public static final String MOST_USED = "max-used-ingredients";

    /** Fewest extra things to buy. */
    public static final String FEWEST_MISSING = "min-missing-ingredients";

    /** The only two sorts we send to Spoonacular. */
    private static final Set<String> SUPPORTED = Set.of(MOST_USED, FEWEST_MISSING);

    private SortOrderCleaner() {
    }

    /**
     * Turns whatever the cook sent into a sort value we can check.
     *
     * Nothing, or only spaces, means the default. Anything else is trimmed and
     * lowercased, so "Min-Missing-Ingredients " still counts.
     *
     * @param raw the sort from the web address, possibly null or blank
     * @return the cleaned sort; MOST_USED when nothing was chosen
     */
    public static String clean(String raw) {
        if (raw == null || raw.isBlank()) {
            return MOST_USED;
        }
        return raw.trim().toLowerCase();
    }

    /**
     * Whether a cleaned sort is one we offer.
     *
     * @param cleaned a value that has already been through clean()
     * @return true only for MOST_USED or FEWEST_MISSING
     */
    public static boolean isSupported(String cleaned) {
        return SUPPORTED.contains(cleaned);
    }
}
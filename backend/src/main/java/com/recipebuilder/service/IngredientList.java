package com.recipebuilder.service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Tidies up the comma-separated ingredient list the user typed.
 *
 * One job, done in one place, because two different parts of the app need the
 * exact same answer: the cache key, and the text we send to Spoonacular. If
 * they disagreed, the cache would be keyed on something we never searched for.
 */
public final class IngredientList {

    /** Nothing to construct - this class is only a home for the method below. */
    private IngredientList() {
    }

    /**
     * Turns what the user typed into one predictable string.
     *
     * "Eggs, milk" and " MILK,eggs " both become "eggs,milk".
     *
     * SORTING is the important part, and it is not cosmetic. The cache key is
     * built from this string, so without sorting "eggs,milk" and "milk,eggs"
     * would be two separate cache entries for one identical search - and that
     * costs two of our 150 daily Spoonacular points instead of one.
     *
     * @param raw what arrived on the web address, e.g. " Eggs, milk ,, "
     * @return the cleaned, sorted, comma-separated list, or "" if nothing was
     *         left once the blanks were dropped
     */
    public static String normalise(String raw) {
        if (raw == null) {
            return "";
        }

        // STEP 1: break the text apart on the commas.
        String[] parts = raw.split(",");

        // STEP 2: clean each piece, and throw away the ones that are now empty.
        // "eggs,,milk" and "eggs, ,milk" both have a piece worth nothing.
        List<String> cleaned = new ArrayList<>();

        for (String part : parts) {
            String one = part.trim().toLowerCase();

            // A duplicate costs us nothing to drop, and keeping it would make
            // "eggs,eggs" a different cache key from "eggs".
            if (!one.isEmpty() && !cleaned.contains(one)) {
                cleaned.add(one);
            }
        }

        // STEP 3: put them in a predictable order. See the note above on why.
        Collections.sort(cleaned);

        // STEP 4: join them back up the way Spoonacular wants them.
        return String.join(",", cleaned);
    }
}

package com.recipebuilder.service;

/** Jose's formula, with Spoonacular's own counts as the input. */
public final class MatchPercentageCalculator {

    private MatchPercentageCalculator() {
    }

    /**
     * How much of a recipe's ingredient list the cook already has.
     *
     * used + missed is the recipe's own ingredient count, so the result is
     * bounded 0-100. Takes the counts rather than two name lists because
     * Spoonacular matches fuzzily - "chicken" matches a recipe's "chicken
     * broth", which they report with the name "broth", so comparing names
     * ourselves scores 0% on a recipe that does use your chicken.
     */
    public static int calculate(int used, int missed) {
        int total = used + missed;

        if (total <= 0) {
            return 0;
        }

        return Math.round(used * 100.0f / total);
    }
}

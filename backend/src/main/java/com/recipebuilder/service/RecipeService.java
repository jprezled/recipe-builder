package com.recipebuilder.service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import com.recipebuilder.client.SpoonacularClient;
import com.recipebuilder.client.dto.SpoonacularSearchResult;
import com.recipebuilder.dto.DietaryRestrictions;
import com.recipebuilder.dto.RecipeSummaryDto;
import com.recipebuilder.exception.InvalidInputException;

/**
 * Turns Spoonacular's data into ours.
 *
 * Knows nothing about HTTP - no requests, no responses, no status codes. It
 * takes an ingredient name and gives back recipes in our own shape, which is
 * what lets it be tested with the client mocked out entirely.
 */
@Service
public class RecipeService {

    /** How many recipes to ask Spoonacular for. One search costs one point. */
    private static final int HOW_MANY_RECIPES = 10;

    /** The agreed wording from docs/error-shape.md. Change it there first. */
    private static final String NOT_SUPPORTED = "That dietary filter is not one we support.";

    private final SpoonacularClient client;

    public RecipeService(SpoonacularClient client) {
        this.client = client;
    }

    /**
     * Finds recipes using one or more ingredients, optionally narrowed by diet
     * and intolerances.
     *
     * The result is cached for an hour, so searching the same thing twice costs
     * one Spoonacular point rather than two. 150 points a day is shared across
     * the whole team.
     *
     * The cache key comes from IngredientsCacheKeyGenerator, which cleans and
     * SORTS the ingredients and the filters first - so "eggs,milk" and
     * "milk,eggs" are one entry rather than two.
     *
     * Note: @Cacheable works through a Spring proxy, so this only takes effect
     * when the method is called from OUTSIDE the class.
     *
     * @param ingredients what the user typed, e.g. "eggs, milk, flour"
     * @param choices     the cook's diet and intolerances, "none" meaning no filter
     * @return recipes in our shape, or an empty list if nothing matched
     */
    @Cacheable(cacheNames = "recipeSearches", keyGenerator = "ingredientsCacheKey")
    public List<RecipeSummaryDto> searchByIngredients(String ingredients, DietaryRestrictions choices) {

        // STEP 0: clean the text up before doing anything with it, and refuse
        // an empty search before spending one of our 150 daily points on it.
        String cleaned = IngredientList.normalise(ingredients);

        if (cleaned.isEmpty()) {
            throw new InvalidInputException("Please enter at least one ingredient.");
        }

        // Clean the filters, then refuse any value we do not offer. Spoonacular
        // would quietly ignore it, and a silently ignored peanut filter is a
        // safety problem.
        DietaryRestrictions checked = RestrictionsCleaner.clean(choices);
        refuseUnsupported(checked);

        // STEP 1: ask Spoonacular. What comes back is in THEIR shape.
        //
        // We send the cleaned list, not the raw text, so the thing we searched
        // for is exactly the thing the cache key was built from.
        List<SpoonacularSearchResult> theirResults =
                client.searchByIngredients(cleaned, HOW_MANY_RECIPES, checked);

        // STEP 2: copy each one into OUR shape, one at a time.
        List<RecipeSummaryDto> ourResults = new ArrayList<>();

        for (SpoonacularSearchResult theirRecipe : theirResults) {
            int have = theirRecipe.usedIngredientCount();
            int need = theirRecipe.missedIngredientCount();

            RecipeSummaryDto ourRecipe = new RecipeSummaryDto(
                    theirRecipe.id(),
                    theirRecipe.title(),
                    theirRecipe.image(),                      // their "image" is our "imageUrl"
                    have,                                     // -> "ingredientsYouHave"
                    need,                                     // -> "ingredientsYouNeed"
                    MatchPercentageCalculator.calculate(have, need));

            ourResults.add(ourRecipe);
        }

        // Closest match first, so the cook reads the best option rather than
        // whatever order Spoonacular happened to return.
        ourResults.sort(Comparator.comparingInt(RecipeSummaryDto::matchPercent).reversed());

        // STEP 3: always a list, never null.
        return ourResults;
    }

    /** Refuses a diet or intolerance that is not "none" and not on the approved lists. */
    private static void refuseUnsupported(DietaryRestrictions choices) {
        if (!choices.diet().equals(RestrictionsCleaner.NONE)
                && !DietaryRestrictions.APPROVED_DIETS.contains(choices.diet())) {
            throw new InvalidInputException(NOT_SUPPORTED);
        }

        if (!choices.intolerances().equals(RestrictionsCleaner.NONE)) {
            for (String one : choices.intolerances().split(",")) {
                if (!DietaryRestrictions.APPROVED_INTOLERANCES.contains(one)) {
                    throw new InvalidInputException(NOT_SUPPORTED);
                }
            }
        }
    }
}
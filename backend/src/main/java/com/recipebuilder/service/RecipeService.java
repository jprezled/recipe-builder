package com.recipebuilder.service;

import com.recipebuilder.client.SpoonacularClient;
import com.recipebuilder.client.dto.SpoonacularSearchResult;
import com.recipebuilder.dto.RecipeSummaryDto;
import com.recipebuilder.exception.InvalidInputException;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

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

    private final SpoonacularClient client;

    public RecipeService(SpoonacularClient client) {
        this.client = client;
    }

    /**
     * Finds recipes using one ingredient.
     *
     * The result is cached for an hour, so searching the same thing twice costs
     * one Spoonacular point rather than two. 150 points a day is shared across
     * the whole team.
     *
     * The key is trimmed and lowercased, so "Tomato", "tomato" and " tomato "
     * are one entry rather than three. Without that the cache would miss
     * constantly and the quota would still drain.
     *
     * Note: @Cacheable works through a Spring proxy, so this only takes effect
     * when the method is called from OUTSIDE the class. A call from another
     * method in RecipeService would bypass it.
     *
     * @param ingredient what the user typed, e.g. "apple"
     * @return recipes in our shape, or an empty list if nothing matched
     */
    @Cacheable(cacheNames = "recipeSearches", key = "#ingredient.trim().toLowerCase()")
    public List<RecipeSummaryDto> searchByIngredient(String ingredient) {

        // STEP 0: refuse an empty search before spending one of our 150 daily
        // points on it. Checked here rather than in the browser, because the
        // rule has to hold for anything calling our API, not just our screen.
        if (ingredient == null || ingredient.isBlank()) {
            throw new InvalidInputException("Please enter at least one ingredient.");
        }

        // STEP 1: ask Spoonacular. What comes back is in THEIR shape.
        List<SpoonacularSearchResult> theirResults =
                client.searchByIngredients(ingredient, HOW_MANY_RECIPES);

        // STEP 2: copy each one into OUR shape, one at a time.
        //
        // A plain loop rather than a stream, so the conversion reads top to
        // bottom: take that field, put it in this one.
        List<RecipeSummaryDto> ourResults = new ArrayList<>();

        for (SpoonacularSearchResult theirRecipe : theirResults) {
            RecipeSummaryDto ourRecipe = new RecipeSummaryDto(
                    theirRecipe.id(),
                    theirRecipe.title(),
                    theirRecipe.image(),                      // their "image" is our "imageUrl"
                    theirRecipe.usedIngredientCount(),        // -> "ingredientsYouHave"
                    theirRecipe.missedIngredientCount());     // -> "ingredientsYouNeed"

            ourResults.add(ourRecipe);
        }

        // STEP 3: always a list, never null. An empty search result is not an
        // error, and returning null would force every caller to check for it.
        return ourResults;
    }
}

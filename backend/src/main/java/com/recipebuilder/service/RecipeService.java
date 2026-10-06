package com.recipebuilder.service;

import com.recipebuilder.client.SpoonacularClient;
import com.recipebuilder.client.dto.SpoonacularSearchResult;
import com.recipebuilder.dto.RecipeSummaryDto;
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
     * @param ingredient what the user typed, e.g. "apple"
     * @return recipes in our shape, or an empty list if nothing matched
     */
    public List<RecipeSummaryDto> searchByIngredient(String ingredient) {

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

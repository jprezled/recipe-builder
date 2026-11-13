package com.recipebuilder.service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import com.recipebuilder.client.SpoonacularClient;
import com.recipebuilder.client.dto.SpoonacularRecipeInformation;
import com.recipebuilder.client.dto.SpoonacularSearchResult;
import com.recipebuilder.dto.DietaryRestrictions;
import com.recipebuilder.dto.RecipeDetailDto;
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
     * @param sort        the sort order from the web address; blank or null means the the default
     * @return recipes in our shape, or an empty list if nothing matched
     */
    @Cacheable(cacheNames = "recipeSearches", keyGenerator = "ingredientsCacheKey")
    public List<RecipeSummaryDto> searchByIngredients(String ingredients, DietaryRestrictions choices, String sort) {

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

        // RB-224: same idea for the sort. Spoonacular quieltly ignores a sort it
        // does not recongise. so refuse it here before spending a point.

        String chosenSort = SortOrderCleaner.clean(sort);
        if (!SortOrderCleaner.isSupported(chosenSort)) {
            throw new InvalidInputException("That sort order is not one we support.");
        }

        // STEP 1: ask Spoonacular. What comes back is in THEIR shape.
        //
        // We send the cleaned list, not the raw text, so the thing we searched
        // for is exactly the thing the cache key was built from.
        List<SpoonacularSearchResult> theirResults =
                client.searchByIngredients(cleaned, HOW_MANY_RECIPES, checked, chosenSort);

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
        // whatever order Spoonacular happened to return. Only for the default:
        // any other sort was chosen on purpose, and re-sorting would throw it away
        if (chosenSort.equals(SortOrderCleaner.MOST_USED)) {
            ourResults.sort(Comparator.comparingInt(RecipeSummaryDto::matchPercent).reversed());
        }

        // STEP 3: always a list, never null.
        return ourResults;
    }

    /**
     * Everything about one recipe, in our shape.
     *
     * Cached for an hour on the id alone. Unlike a search, every view of a
     * recipe costs its own point, so browsing five recipes and going back to
     * the first is six points without this and five with it.
     *
     * A plain key rather than the search's key generator: an id is one value
     * with nothing to clean, sort or combine.
     *
     * Note: @Cacheable works through a Spring proxy, so this only takes effect
     * when the method is called from OUTSIDE the class.
     *
     * @param id Spoonacular's recipe id, the same one search returned
     * @return the recipe the detail page shows
     */
    @Cacheable(cacheNames = "recipeDetails", key = "#id")
    public RecipeDetailDto getRecipe(long id) {

        // STEP 0: refuse a nonsense id before spending one of our 150 daily
        // points on it. The wording is the same "bad link" sentence the
        // handler uses for an id that is not a number at all.
        if (id <= 0) {
            throw new InvalidInputException("That recipe link is not valid.");
        }

        // STEP 1: ask Spoonacular. What comes back is in THEIR shape.
        SpoonacularRecipeInformation theirs = client.getRecipe(id);

        // STEP 2: copy the ingredient lines across, one at a time.
        List<String> ingredients = new ArrayList<>();

        if (theirs.extendedIngredients() != null) {
            for (SpoonacularRecipeInformation.ExtendedIngredient one : theirs.extendedIngredients()) {
                ingredients.add(one.original());
            }
        }

        // STEP 3: copy the steps across.
        //
        // Spoonacular can send no instruction blocks at all, so read the first
        // one only if there is one. Going straight to position zero is the
        // mistake here, and it throws on a perfectly ordinary recipe.
        List<String> steps = new ArrayList<>();

        if (theirs.analyzedInstructions() != null && !theirs.analyzedInstructions().isEmpty()) {
            SpoonacularRecipeInformation.AnalyzedInstruction block =
                    theirs.analyzedInstructions().get(0);

            if (block.steps() != null) {
                for (SpoonacularRecipeInformation.Step one : block.steps()) {
                    steps.add(one.step());
                }
            }
        }

        // STEP 4: hand back our own shape.
        RecipeDetailDto.Diets diets = new RecipeDetailDto.Diets(
                theirs.vegetarian(),
                theirs.vegan(),
                theirs.glutenFree(),
                theirs.dairyFree());

        return new RecipeDetailDto(
                theirs.id(),
                theirs.title(),
                theirs.image(),                   // their "image" is our "imageUrl"
                theirs.servings(),
                theirs.readyInMinutes(),
                ingredients,
                steps,
                diets,
                toNutrition(theirs.nutrition())); // Nutrition is not yet implemented, so always null for now.
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

    /** Converts Spoonacular's nutrient list into our six figures. */
    private static RecipeDetailDto.Nutrition toNutrition(
            SpoonacularRecipeInformation.Nutrition theirs) {

        if (theirs == null || theirs.nutrients() == null) {
            return null;
        }

        return new RecipeDetailDto.Nutrition(
                amountOf(theirs, "Calories"),
                amountOf(theirs, "Fat"),
                amountOf(theirs, "Saturated Fat"),
                amountOf(theirs, "Carbohydrates"),
                amountOf(theirs, "Sugar"),
                amountOf(theirs, "Protein"));
    }

    /** Finds a nutrient by its exact name and rounds its amount. */
    private static double amountOf(
            SpoonacularRecipeInformation.Nutrition theirs, String name) {

        for (SpoonacularRecipeInformation.Nutrient nutrient : theirs.nutrients()) {
            if (name.equals(nutrient.name())) {
                return round2(nutrient.amount());
            }
        }

        return 0;
    }

    /** Rounds an amount to two decimal places. */
    private static double round2(double amount) {
        return Math.round(amount * 100.0) / 100.0;
    }

}
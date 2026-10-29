package com.recipebuilder.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.recipebuilder.dto.DietaryRestrictions;
import com.recipebuilder.dto.RecipeDetailDto;
import com.recipebuilder.dto.RecipeSummaryDto;
import com.recipebuilder.service.RecipeService;

/**
 * Our own web addresses:
 * GET /api/recipes/search?ingredients=eggs,milk&diet=vegetarian&intolerances=dairy,peanut
 * GET /api/recipes/{id}        everything about one recipe
 *
 * Deliberately thin. It takes the words out of the web request, hands them to the
 * service, and returns whatever comes back. No rules live here - that is the
 * service's job, and keeping them apart is what lets both be tested on their
 * own.
 *
 * @RestController means Spring turns whatever we return into JSON
 * automatically, so there is no conversion code to write.
 */
@RestController
public class RecipeController {

    private final RecipeService service;

    /** Spring passes the service in. We never construct it ourselves. */
    public RecipeController(RecipeService service) {
        this.service = service;
    }

    /**
     * Finds recipes using one or more ingredients.
     *
     * @param ingredients  the ?ingredients=... part of the address, comma
     *                     separated, e.g. "eggs,milk,flour"
     * @param diet         optional ?diet=..., exactly one value; "none" when left out
     * @param intolerances optional ?intolerances=..., comma separated; "none" when left out
     * @return recipes in our own shape, which Spring serialises to JSON
     */
    @GetMapping("/api/recipes/search")
    public List<RecipeSummaryDto> search(
            @RequestParam String ingredients,
            @RequestParam(defaultValue = "none") String diet,
            @RequestParam(defaultValue = "none") String intolerances) {
        return service.searchByIngredients(ingredients, new DietaryRestrictions(diet, intolerances));
    }

    /**
     * Everything about one recipe.
     *
     * @param id Spoonacular's recipe id, from the end of the address
     * @return the recipe in our own shape, which Spring serialises to JSON
     */
    @GetMapping("/api/recipes/{id}")
    public RecipeDetailDto one(@PathVariable long id) {
        return service.getRecipe(id);
    }
}
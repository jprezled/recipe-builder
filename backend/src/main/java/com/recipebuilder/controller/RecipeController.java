package com.recipebuilder.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.recipebuilder.dto.DietaryRestrictions;
import com.recipebuilder.dto.RecipeSummaryDto;
import com.recipebuilder.service.RecipeService;

/**
 * Our own web address: GET /api/recipes/search?ingredients=eggs,milk,flour
 *
 * Deliberately thin. It takes the words out of the web request, hands it to the
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
     * @param ingredients the ?ingredients=... part of the address, comma
     *                    separated, e.g. "eggs,milk,flour"
     * @return recipes in our own shape, which Spring serialises to JSON
     * @param diet      optional ?diet=..., e.g "Vegan"; "none" when left out
     * @param allergies optional ?allergies=.... e.g "Peanut"; "none" when left out
     */
    @GetMapping("/api/recipes/search")
    public List<RecipeSummaryDto> search(
                    @RequestParam String ingredients,
                    @RequestParam(defaultValue = "none") String diet,
                    @RequestParam(defaultValue = "none") String allergies) { 
        return service.searchByIngredients(ingredients, new DietaryRestrictions(diet, allergies));
    }
}

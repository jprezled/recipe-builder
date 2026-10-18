package com.recipebuilder.controller;

import com.recipebuilder.dto.RecipeSummaryDto;
import com.recipebuilder.service.RecipeService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

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
     */
    @GetMapping("/api/recipes/search")
    public List<RecipeSummaryDto> search(@RequestParam String ingredients) {
        return service.searchByIngredients(ingredients);
    }
}

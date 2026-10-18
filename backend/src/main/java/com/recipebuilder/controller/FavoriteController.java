package com.recipebuilder.controller;

import com.recipebuilder.dto.FavoriteDto;
import com.recipebuilder.dto.FavoriteRequest;
import com.recipebuilder.service.FavoriteService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Our favorites addresses:
 *
 *   GET    /api/favorites        what the demo user has saved
 *   POST   /api/favorites        save one
 *   DELETE /api/favorites/{id}   unsave one, by Spoonacular's id
 *
 * Deliberately thin, like RecipeController. It unpacks the request, hands the
 * work to the service and returns the result. No rules live here.
 *
 * None of these three ever contacts Spoonacular. Favorites are pure database
 * work, which is exactly why the favorites page proves the database works: it
 * has no other source the data could be coming from.
 */
@RestController
public class FavoriteController {

    private final FavoriteService service;

    public FavoriteController(FavoriteService service) {
        this.service = service;
    }

    /** @return the demo user's saved recipes, newest first */
    @GetMapping("/api/favorites")
    public List<FavoriteDto> list() {
        return service.list();
    }

    /**
     * Saves a recipe.
     *
     * 201 Created even when the recipe was already saved. Saving twice is a
     * no-op rather than an error, so a double-tapped button cannot produce a
     * failure the cook has to understand.
     */
    @PostMapping("/api/favorites")
    @ResponseStatus(HttpStatus.CREATED)
    public void add(@RequestBody FavoriteRequest recipe) {
        service.add(recipe);
    }

    /**
     * Removes a recipe.
     *
     * 204 No Content even when it was not saved in the first place, for the
     * same reason: the browser can retry without having to check first.
     *
     * @param id Spoonacular's recipe id, from the end of the address
     */
    @DeleteMapping("/api/favorites/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void remove(@PathVariable long id) {
        service.remove(id);
    }
}

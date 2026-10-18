package com.recipebuilder.service;

import com.recipebuilder.dto.FavoriteDto;
import com.recipebuilder.dto.FavoriteRequest;
import com.recipebuilder.exception.InvalidInputException;
import com.recipebuilder.repository.FavoriteRepository;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * The rules about saving favorites.
 *
 * Knows nothing about HTTP and nothing about SQL. It decides WHOSE favorites we
 * are dealing with and what counts as a valid thing to save, then hands the
 * work to the repository - which is what lets it be tested with the repository
 * mocked and no database running.
 */
@Service
public class FavoriteService {

    /**
     * The one user every favorite belongs to for now.
     *
     * User accounts are a later sprint. Until then every saved recipe hangs off
     * this single row, which database/migrations/V2__demo_user.sql creates with
     * exactly this id. When accounts arrive, this constant is what gets
     * replaced by the signed-in user - and it being in ONE place is the point.
     */
    private static final long DEMO_USER_ID = 1L;

    private final FavoriteRepository repository;

    public FavoriteService(FavoriteRepository repository) {
        this.repository = repository;
    }

    /**
     * Saves a recipe to the demo user's favorites.
     *
     * @param recipe what the browser sent: Spoonacular id, title, image
     */
    public void add(FavoriteRequest recipe) {
        if (recipe == null) {
            throw new InvalidInputException("No recipe was sent to save.");
        }

        // A recipe with no id cannot be found again, and one with no title
        // would show up on the favorites page as a blank card. Refuse both here
        // rather than writing something useless to the database.
        if (recipe.id() <= 0) {
            throw new InvalidInputException("That recipe cannot be saved - it has no id.");
        }

        if (recipe.title() == null || recipe.title().isBlank()) {
            throw new InvalidInputException("That recipe cannot be saved - it has no title.");
        }

        repository.save(DEMO_USER_ID, recipe);
    }

    /**
     * Lists the demo user's saved recipes, newest first.
     *
     * Never contacts Spoonacular, so this is free no matter how often the
     * favorites page is opened.
     */
    public List<FavoriteDto> list() {
        return repository.findForUser(DEMO_USER_ID);
    }

    /**
     * Removes one recipe from the demo user's favorites.
     *
     * Removing something that was never saved is deliberately not an error, so
     * the browser can retry safely.
     *
     * @param spoonacularId the recipe, by Spoonacular's id
     */
    public void remove(long spoonacularId) {
        if (spoonacularId <= 0) {
            throw new InvalidInputException("That recipe cannot be removed - it has no id.");
        }

        repository.remove(DEMO_USER_ID, spoonacularId);
    }
}

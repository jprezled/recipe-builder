package com.recipebuilder.service;

import com.recipebuilder.dto.FavoriteDto;
import com.recipebuilder.dto.FavoriteRequest;
import com.recipebuilder.exception.CollectionNotFoundException;
import com.recipebuilder.exception.InvalidInputException;
import com.recipebuilder.exception.RecipeNotFoundException;
import com.recipebuilder.repository.CollectionRepository;
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

    private final FavoriteRepository repository;
    private final CollectionRepository collections;

    public FavoriteService(FavoriteRepository repository, CollectionRepository collections) {
        this.repository = repository;
        this.collections = collections;
    }

    /**
     * Saves a recipe to one person's favorites.
     *
     * @param userId whose favorites - the controller reads this from the
     *               session, because this layer must not know HTTP exists
     * @param recipe what the browser sent: Spoonacular id, title, image
     */
    public void add(long userId, FavoriteRequest recipe) {
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

        requireOwnCollection(userId, recipe.collectionId());

        repository.save(userId, recipe);
    }

    /**
     * Lists one person's saved recipes, newest first.
     *
     * Never contacts Spoonacular, so this is free no matter how often the
     * favorites page is opened.
     *
     * @param userId whose favorites
     */
    public List<FavoriteDto> list(long userId) {
        return repository.findForUser(userId);
    }

    /**
     * Removes one recipe from one person's favorites.
     *
     * Removing something that was never saved is deliberately not an error, so
     * the browser can retry safely.
     *
     * @param userId        whose favorites
     * @param spoonacularId the recipe, by Spoonacular's id
     */
    public void remove(long userId, long spoonacularId) {
        if (spoonacularId <= 0) {
            throw new InvalidInputException("That recipe cannot be removed - it has no id.");
        }

        repository.remove(userId, spoonacularId);
    }

    /** RB-205: the agreed wording, from docs/error-shape.md. Change it there first. */
    public static final String NOTE_TOO_LONG =
            "That note is too long. Please use 500 characters or fewer.";

    /** RB-205: a note can only hang off a recipe the cook actually saved. */
    public static final String NOT_SAVED =
            "Save this recipe before adding a note.";

    /**
     * The longest note we store. Deliberately not mirrored in the schema - the
     * column is TEXT, so this stays the one place the limit is written down.
     */
    private static final int LONGEST_NOTE = 500;

    /**
     * RB-205: writes one cook's note about one saved recipe.
     *
     * Checked here rather than in the controller, so the limit holds for
     * anything that calls the service and not just our own form.
     *
     * @param userId        whose note - the controller reads this from the session
     * @param spoonacularId the recipe, by Spoonacular's id
     * @param note          the text, or blank to clear it
     */
    public void saveNote(long userId, long spoonacularId, String note) {
        if (spoonacularId <= 0) {
            throw new InvalidInputException("No recipe was sent to save.");
        }

        String cleaned = note == null ? null : note.trim();

        if (cleaned != null && cleaned.length() > LONGEST_NOTE) {
            throw new InvalidInputException(NOTE_TOO_LONG);
        }

        // An empty note is a cleared note, not an empty string in the column.
        if (cleaned != null && cleaned.isEmpty()) {
            cleaned = null;
        }

        int rowsChanged = repository.saveNote(userId, spoonacularId, cleaned);

        // Nothing updated means the cook has not saved this recipe. Saying so
        // is better than accepting the note and losing it silently.
        if (rowsChanged == 0) {
            throw new InvalidInputException(NOT_SAVED);
        }
    }

    /** RB-210: the agreed wording, from docs/error-shape.md. Change it there first. */
    public static final String NOT_SAVED_FOR_COLLECTION =
            "Save this recipe before adding it to a collection.";

    /**
     * RB-210: puts a saved recipe into a collection, or out of one.
     *
     * @param collectionId the collection, or null to make the recipe loose
     */
    public void moveToCollection(long userId, long spoonacularId, Long collectionId) {
        if (spoonacularId <= 0) {
            throw new InvalidInputException("No recipe was sent to move.");
        }

        requireOwnCollection(userId, collectionId);

        int rowsChanged = repository.moveToCollection(userId, spoonacularId, collectionId);

        // Nothing updated means the cook has not saved this recipe.
        if (rowsChanged == 0) {
            throw new RecipeNotFoundException(NOT_SAVED_FOR_COLLECTION);
        }
    }

    /**
     * Collection ids arrive from the browser and are sequential, so one that
     * exists is not necessarily this cook's. Null means loose and needs no
     * check.
     */
    private void requireOwnCollection(long userId, Long collectionId) {
        if (collectionId != null && !collections.isOwnedBy(userId, collectionId)) {
            throw new CollectionNotFoundException(CollectionService.NOT_FOUND);
        }
    }
}

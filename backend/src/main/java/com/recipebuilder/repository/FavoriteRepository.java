package com.recipebuilder.repository;

import com.recipebuilder.dto.FavoriteDto;
import com.recipebuilder.dto.FavoriteRequest;
import com.recipebuilder.exception.DatabaseUnavailableException;
import com.recipebuilder.exception.DemoUserMissingException;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * The ONLY class that talks to Postgres.
 *
 * Everything else in the app goes through here, the same way everything that
 * talks to spoonacular.com goes through SpoonacularClient. That keeps the SQL
 * in one file, and it means the service above can be tested with this class
 * mocked out and no database running at all.
 */
@Repository
public class FavoriteRepository {

    /** Postgres column widths. Longer values are cut rather than rejected. */
    private static final int TITLE_LIMIT = 255;
    private static final int IMAGE_URL_LIMIT = 500;

    private final JdbcTemplate db;

    /** Spring hands us a JdbcTemplate already wired to the datasource. */
    public FavoriteRepository(JdbcTemplate db) {
        this.db = db;
    }

    /**
     * Saves one recipe as a favorite of one user.
     *
     * TWO statements, and the order matters. saved_recipes.recipe_id points at
     * OUR recipes.recipe_id - a serial we generate - not at Spoonacular's id.
     * So the recipe has to exist in our own table before it can be linked.
     * Putting Spoonacular's id straight into saved_recipes is the obvious
     * mistake here, and it fails with a foreign key violation.
     *
     * Saving the same recipe twice is not an error. Both statements are written
     * so a repeat does nothing, which is what lets a double-tapped button be
     * harmless.
     *
     * @param userId the user the favorite belongs to
     * @param recipe what the browser sent: Spoonacular id, title, image
     */
    public void save(long userId, FavoriteRequest recipe) {

        // STEP 1: make sure the recipe is in OUR recipes table, and find out
        // what local id it got.
        //
        // ON CONFLICT ... DO UPDATE rather than DO NOTHING, because DO NOTHING
        // returns no row at all on a repeat - and then RETURNING gives us
        // nothing to link in step 2. Updating the title also means a recipe
        // Spoonacular has renamed gets the new name.
        String upsertRecipe = "INSERT INTO recipes (spoonacular_id, title, image_url) "
                + "VALUES (?, ?, ?) "
                + "ON CONFLICT (spoonacular_id) DO UPDATE "
                + "SET title = EXCLUDED.title, image_url = EXCLUDED.image_url "
                + "RETURNING recipe_id";

        String title = cut(recipe.title(), TITLE_LIMIT);
        String imageUrl = cut(recipe.imageUrl(), IMAGE_URL_LIMIT);

        Long localRecipeId;
        try {
            localRecipeId = db.queryForObject(
                    upsertRecipe, Long.class, recipe.id(), title, imageUrl);
        } catch (DataAccessException failure) {
            throw asOurs(failure);
        }

        // STEP 2: link that recipe to the user.
        //
        // ON CONFLICT DO NOTHING covers the composite primary key
        // (user_id, recipe_id) - saving a favorite you already have is a no-op
        // rather than a crash.
        String linkToUser = "INSERT INTO saved_recipes (user_id, recipe_id, collection_id) "
                + "VALUES (?, ?, ?) "
                + "ON CONFLICT DO NOTHING";

        try {
            db.update(linkToUser, userId, localRecipeId, recipe.collectionId());
        } catch (DataAccessException failure) {
            throw asOurs(failure);
        }
    }

    /**
     * Lists everything one user has saved, newest first.
     *
     * Reads from Postgres and nothing else. Spoonacular is never contacted, so
     * this costs none of our 150 daily points no matter how often the favorites
     * page is opened.
     *
     * @param userId whose favorites to list
     * @return the saved recipes, or an empty list if there are none
     */
    public List<FavoriteDto> findForUser(long userId) {
        String sql = "SELECT r.spoonacular_id, r.title, r.image_url, s.note, s.collection_id "
                + "FROM saved_recipes s "
                + "JOIN recipes r ON r.recipe_id = s.recipe_id "
                + "WHERE s.user_id = ? "
                + "ORDER BY s.saved_at DESC";

        try {
            return db.query(sql, new FavoriteRowMapper(), userId);
        } catch (DataAccessException failure) {
            throw asOurs(failure);
        }
    }

    /**
     * RB-205: writes one cook's note about one saved recipe.
     *
     * Takes Spoonacular's id, like remove does, because that is what the
     * frontend knows. The subquery turns it into our own recipe_id.
     *
     * Writing a note for a recipe the cook has not saved updates no rows and is
     * not an error here - the same shape as remove. The service decides whether
     * that deserves a message; this reports only how many rows changed.
     *
     * @param userId        whose note
     * @param spoonacularId the recipe, by Spoonacular's id
     * @param note          the text, or null to clear it
     * @return how many rows were updated: 1 when saved, 0 when not
     */
    public int saveNote(long userId, long spoonacularId, String note) {
        String sql = "UPDATE saved_recipes SET note = ? "
                + "WHERE user_id = ? "
                + "AND recipe_id = (SELECT recipe_id FROM recipes WHERE spoonacular_id = ?)";

        try {
            return db.update(sql, note, userId, spoonacularId);
        } catch (DataAccessException failure) {
            throw asOurs(failure);
        }
    }

    /**
     * Removes one saved recipe from one user's favorites.
     *
     * Takes Spoonacular's id, because that is what the frontend knows. The
     * subquery turns it into our own recipe_id.
     *
     * Removing something that was never saved is not an error: the subquery
     * finds nothing, the DELETE matches no rows, and the caller still gets a
     * clean result. That is what lets the API answer the same either way.
     *
     * The recipes row itself is left alone - another user may have it saved,
     * and an unused row costs us nothing.
     *
     * @param userId        whose favorites to remove it from
     * @param spoonacularId the recipe, by Spoonacular's id
     */
    public void remove(long userId, long spoonacularId) {
        String sql = "DELETE FROM saved_recipes "
                + "WHERE user_id = ? "
                + "AND recipe_id IN (SELECT recipe_id FROM recipes WHERE spoonacular_id = ?)";

        try {
            db.update(sql, userId, spoonacularId);
        } catch (DataAccessException failure) {
            throw asOurs(failure);
        }
    }

    /**
     * RB-210: puts one saved recipe into a collection, or takes it out.
     *
     * The collection id is bound directly. A sub-select scoped by user_id
     * would return no row for somebody else's collection and the UPDATE would
     * write NULL - quietly making the recipe loose instead of refusing. Who
     * owns the collection is the service's rule; this only writes.
     *
     * @param collectionId the collection, or null to make the recipe loose
     * @return how many rows were updated: 1 when saved, 0 when not
     */
    public int moveToCollection(long userId, long spoonacularId, Long collectionId) {
        String sql = "UPDATE saved_recipes SET collection_id = ? "
                + "WHERE user_id = ? "
                + "AND recipe_id = (SELECT recipe_id FROM recipes WHERE spoonacular_id = ?)";

        try {
            return db.update(sql, collectionId, userId, spoonacularId);
        } catch (DataAccessException failure) {
            throw asOurs(failure);
        }
    }

    /**
     * Turns one of Spring's database errors into one of ours, so nothing above
     * this class has to import anything from Spring JDBC.
     *
     * Plain if/else, one branch per cause, the same shape as
     * SpoonacularClient.translate.
     */
    private RuntimeException asOurs(DataAccessException failure) {
        if (failure instanceof DataIntegrityViolationException) {
            // A constraint said no. In sprint 2 this is nearly always the
            // foreign key on saved_recipes.user_id, because the demo user row
            // from V2__demo_user.sql was never applied - a setup step, not a
            // bug in this code.
            return new DemoUserMissingException(
                    "The database is missing its setup data. Apply "
                            + "database/migrations/V2__demo_user.sql and try again.",
                    failure);
        }

        return new DatabaseUnavailableException("Could not reach the database.", failure);
    }

    /**
     * Shortens a value that would not fit its column.
     *
     * recipes.title is VARCHAR(255) and recipes.image_url is VARCHAR(500).
     * Postgres rejects anything longer, which would mean a recipe with an
     * unusually long name could not be favorited at all. Storing a cut title is
     * a much better outcome for the cook than refusing to save.
     */
    private String cut(String value, int limit) {
        if (value == null || value.length() <= limit) {
            return value;
        }
        return value.substring(0, limit);
    }
}

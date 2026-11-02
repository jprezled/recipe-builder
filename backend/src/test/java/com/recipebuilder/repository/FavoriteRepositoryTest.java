package com.recipebuilder.repository;

import com.recipebuilder.dto.FavoriteDto;
import com.recipebuilder.dto.FavoriteRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.jdbc.JdbcTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The only test in the project that touches a real database.
 *
 * It runs against recipe_builder_test_db, NOT recipe_builder_db. That is not a
 * detail: this test truncates tables, and pointed at the development database
 * it would delete the favorites saved for a demo.
 *
 * @JdbcTest gives a JdbcTemplate and nothing else - no web layer, no
 * Spoonacular client. replace = NONE stops Spring swapping in an in-memory
 * database, which would defeat the point: ON CONFLICT and RETURNING are
 * Postgres features and would not be exercised.
 *
 * Each test runs in a transaction that is rolled back afterwards.
 */
@JdbcTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
@Import(FavoriteRepository.class)
class FavoriteRepositoryTest {

    /** The id database/migrations/V2__demo_user.sql creates. */
    private static final long DEMO_USER_ID = 1L;

    @Autowired
    private FavoriteRepository repository;

    @Autowired
    private JdbcTemplate db;

    @BeforeEach
    void startFromAKnownState() {
        // A safety check before anything destructive. If the test profile ever
        // stops pointing at the test database, this fails loudly rather than
        // quietly wiping real data.
        String database = db.queryForObject("SELECT current_database()", String.class);
        assertThat(database)
                .as("tests must never run against the development database")
                .isEqualTo("recipe_builder_test_db");

        db.execute("TRUNCATE saved_recipes, recipe_ingredients, recipes CASCADE");

        db.update("INSERT INTO users (user_id, username, email, password_hash) "
                + "VALUES (?, 'demo', 'demo@example.com', 'not-a-real-hash') "
                + "ON CONFLICT (user_id) DO NOTHING", DEMO_USER_ID);
    }

    @Test
    void savingARecipeMakesItFindable() {
        repository.save(DEMO_USER_ID,
                new FavoriteRequest(716429L, "Garlic Chicken Pasta", "http://img/1.jpg"));

        List<FavoriteDto> saved = repository.findForUser(DEMO_USER_ID);

        assertThat(saved).hasSize(1);
        assertThat(saved.get(0).title()).isEqualTo("Garlic Chicken Pasta");
        assertThat(saved.get(0).imageUrl()).isEqualTo("http://img/1.jpg");
    }

    @Test
    void theIdThatComesBackIsSpoonacularsNotOurs() {
        // Our recipes.recipe_id starts at 1. If the repository returned that
        // instead, this would read 1 - and the frontend would ask Spoonacular
        // for the wrong recipe.
        repository.save(DEMO_USER_ID, new FavoriteRequest(716429L, "Pasta", null));

        assertThat(repository.findForUser(DEMO_USER_ID).get(0).id()).isEqualTo(716429L);
    }

    @Test
    void savingTheSameRecipeTwiceIsHarmless() {
        FavoriteRequest recipe = new FavoriteRequest(716429L, "Pasta", null);

        repository.save(DEMO_USER_ID, recipe);
        repository.save(DEMO_USER_ID, recipe);

        // A double-tapped button must not crash, and must not produce two rows.
        assertThat(repository.findForUser(DEMO_USER_ID)).hasSize(1);
    }

    @Test
    void savingReusesTheExistingRecipeRow() {
        repository.save(DEMO_USER_ID, new FavoriteRequest(716429L, "Pasta", null));
        repository.save(DEMO_USER_ID, new FavoriteRequest(716429L, "Pasta", null));

        assertThat(db.queryForObject("SELECT count(*) FROM recipes", Integer.class))
                .isEqualTo(1);
    }

    @Test
    void savingAgainUpdatesTheTitle() {
        repository.save(DEMO_USER_ID, new FavoriteRequest(716429L, "Old name", null));
        repository.save(DEMO_USER_ID, new FavoriteRequest(716429L, "New name", null));

        List<FavoriteDto> saved = repository.findForUser(DEMO_USER_ID);
        assertThat(saved).hasSize(1);
        assertThat(saved.get(0).title()).isEqualTo("New name");
    }

    @Test
    void aVeryLongTitleIsCutRatherThanRefused() {
        // recipes.title is VARCHAR(255). Postgres rejects anything longer, so
        // without cutting it a recipe with a long name could not be saved at
        // all. A shortened title beats a failed save.
        repository.save(DEMO_USER_ID,
                new FavoriteRequest(716429L, "x".repeat(300), null));

        assertThat(repository.findForUser(DEMO_USER_ID).get(0).title()).hasSize(255);
    }

    @Test
    void aRecipeWithNoImageIsStillSaved() {
        // recipes.image_url is nullable, and Spoonacular does sometimes omit
        // the image. The favorites page has to cope rather than the save failing.
        repository.save(DEMO_USER_ID, new FavoriteRequest(716429L, "Pasta", null));

        assertThat(repository.findForUser(DEMO_USER_ID).get(0).imageUrl()).isNull();
    }

    @Test
    void aTitleWithAnApostropheIsStoredVerbatim() {
        // Parameterised SQL should handle this, but nothing else proves it. A
        // hand-built query would break or inject here.
        String nasty = "Grandma's \"best\" pasta; DROP TABLE users--";
        repository.save(DEMO_USER_ID, new FavoriteRequest(716429L, nasty, null));

        assertThat(repository.findForUser(DEMO_USER_ID).get(0).title()).isEqualTo(nasty);
        assertThat(db.queryForObject("SELECT count(*) FROM users", Integer.class))
                .isEqualTo(1);
    }

    @Test
    void anAccentedTitleSurvivesTheRoundTrip() {
        repository.save(DEMO_USER_ID, new FavoriteRequest(716429L, "Crème Brûlée", null));

        assertThat(repository.findForUser(DEMO_USER_ID).get(0).title())
                .isEqualTo("Crème Brûlée");
    }

    @Test
    void removingTakesItOutOfTheList() {
        repository.save(DEMO_USER_ID, new FavoriteRequest(716429L, "Pasta", null));

        repository.remove(DEMO_USER_ID, 716429L);

        assertThat(repository.findForUser(DEMO_USER_ID)).isEmpty();
    }

    @Test
    void removingSomethingNeverSavedIsHarmless() {
        // Lets the API answer the same either way, so the browser can retry
        // without checking first.
        repository.remove(DEMO_USER_ID, 999999L);

        assertThat(repository.findForUser(DEMO_USER_ID)).isEmpty();
    }

    @Test
    void removingLeavesTheRecipeRowForOtherUsers() {
        repository.save(DEMO_USER_ID, new FavoriteRequest(716429L, "Pasta", null));
        repository.remove(DEMO_USER_ID, 716429L);

        assertThat(db.queryForObject("SELECT count(*) FROM recipes", Integer.class))
                .isEqualTo(1);
    }

    @Test
    void aUserWithNoFavoritesGetsAnEmptyListNotNull() {
        assertThat(repository.findForUser(DEMO_USER_ID)).isNotNull().isEmpty();
    }

    @Test
    void twoUsersEachSeeOnlyTheirOwnFavorites() {
        // The second account is created here rather than in a migration, so it
        // disappears with the transaction and cannot affect another test.
        long otherUserId = db.queryForObject(
                "INSERT INTO users (username, email, password_hash) "
                + "VALUES ('other', 'other@example.com', 'not-a-real-hash') "
                + "RETURNING user_id", Long.class);

        repository.save(DEMO_USER_ID, new FavoriteRequest(1111L, "Demo's recipe", null));
        repository.save(otherUserId, new FavoriteRequest(2222L, "Other's recipe", null));

        assertThat(repository.findForUser(DEMO_USER_ID))
                .extracting(FavoriteDto::id)
                .containsExactly(1111L);

        assertThat(repository.findForUser(otherUserId))
                .extracting(FavoriteDto::id)
                .containsExactly(2222L);
    }

    @Test
    void twoUsersCanSaveTheSameRecipeWithoutCollidingOnIt() {
        long otherUserId = db.queryForObject(
                "INSERT INTO users (username, email, password_hash) "
                + "VALUES ('other', 'other@example.com', 'not-a-real-hash') "
                + "RETURNING user_id", Long.class);

        repository.save(DEMO_USER_ID, new FavoriteRequest(716429L, "Shared", null));
        repository.save(otherUserId, new FavoriteRequest(716429L, "Shared", null));

        // saved_recipes is keyed on (user_id, recipe_id), so one recipe row is
        // shared and each user gets their own link to it.
        assertThat(repository.findForUser(DEMO_USER_ID)).hasSize(1);
        assertThat(repository.findForUser(otherUserId)).hasSize(1);

        Integer recipeRows = db.queryForObject(
                "SELECT COUNT(*) FROM recipes WHERE spoonacular_id = 716429", Integer.class);
        assertThat(recipeRows).isEqualTo(1);
    }

    @Test
    void severalFavoritesAllComeBack() {
        repository.save(DEMO_USER_ID, new FavoriteRequest(1111L, "First", null));
        repository.save(DEMO_USER_ID, new FavoriteRequest(2222L, "Second", null));

        assertThat(repository.findForUser(DEMO_USER_ID))
                .extracting(FavoriteDto::id)
                .containsExactlyInAnyOrder(1111L, 2222L);
    }
}

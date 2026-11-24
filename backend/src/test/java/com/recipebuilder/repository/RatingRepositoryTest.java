package com.recipebuilder.repository;

import com.recipebuilder.dto.RatingSummaryDto;
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
 * RB-297 / RB-294: the ratings table, against recipe_builder_test_db.
 *
 * Each test is rolled back afterwards. The demo user (id 1) is already there
 * from V2; a second user is inserted per test where two cooks are needed.
 */
@JdbcTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
@Import(RatingRepository.class)
class RatingRepositoryTest {

    private static final long DEMO_USER = 1L;
    private static final long RECIPE = 716429L;

    @Autowired
    private RatingRepository repository;

    @Autowired
    private JdbcTemplate db;

    @BeforeEach
    void checkWeAreOnTheTestDatabase() {
        String database = db.queryForObject("SELECT current_database()", String.class);
        assertThat(database)
                .as("tests must never run against the development database")
                .isEqualTo("recipe_builder_test_db");
    }

    private long insertSecondUser() {
        return db.queryForObject(
                "INSERT INTO users (username, email, password_hash) "
                        + "VALUES ('rater-two', 'rater-two@example.com', 'x') RETURNING user_id",
                Long.class);
    }

    @Test
    void aRatingGoesInAndIsReadBack() {
        repository.upsert(DEMO_USER, RECIPE, 4);

        assertThat(repository.yourRating(DEMO_USER, RECIPE)).isEqualTo(4);
    }

    @Test
    void ratingTwiceReplacesTheFirstRatingInsteadOfAddingASecond() {
        repository.upsert(DEMO_USER, RECIPE, 4);
        repository.upsert(DEMO_USER, RECIPE, 2);

        RatingSummaryDto summary = repository.aggregateFor(RECIPE);

        assertThat(summary.count()).isEqualTo(1);
        assertThat(summary.average()).isEqualTo(2.0);
    }

    @Test
    void theAverageCoversEveryCookWhoRatedIt() {
        long second = insertSecondUser();
        repository.upsert(DEMO_USER, RECIPE, 5);
        repository.upsert(second, RECIPE, 2);

        RatingSummaryDto summary = repository.aggregateFor(RECIPE);

        assertThat(summary.id()).isEqualTo(RECIPE);
        assertThat(summary.count()).isEqualTo(2);
        assertThat(summary.average()).isEqualTo(3.5);
    }

    @Test
    void aRecipeNobodyRatedHasACountOfZero() {
        RatingSummaryDto summary = repository.aggregateFor(999_000_111L);

        assertThat(summary.count()).isZero();
        assertThat(summary.average()).isZero();
    }

    @Test
    void anUnratedRecipeHasNoRatingOfYours() {
        assertThat(repository.yourRating(DEMO_USER, 999_000_111L)).isNull();
    }

    @Test
    void yourRatingIsNotAnotherCooksRating() {
        long second = insertSecondUser();
        repository.upsert(second, RECIPE, 1);

        assertThat(repository.yourRating(DEMO_USER, RECIPE)).isNull();
    }

    @Test
    void theBulkLookupAnswersEveryIdAskedForInTheOrderAsked() {
        repository.upsert(DEMO_USER, RECIPE, 4);

        List<RatingSummaryDto> summaries = repository.aggregatesFor(List.of(999_000_111L, RECIPE));

        assertThat(summaries).extracting(RatingSummaryDto::id)
                .containsExactly(999_000_111L, RECIPE);
        assertThat(summaries.get(0).count()).isZero();
        assertThat(summaries.get(1).count()).isEqualTo(1);
        assertThat(summaries.get(1).average()).isEqualTo(4.0);
    }

    @Test
    void theBulkLookupOfNoIdsIsEmpty() {
        assertThat(repository.aggregatesFor(List.of())).isEmpty();
    }

    @Test
    void theDatabaseItselfRefusesARatingOfSix() {
        org.assertj.core.api.Assertions.assertThatThrownBy(
                () -> db.update("INSERT INTO recipe_ratings (spoonacular_id, user_id, rating) "
                        + "VALUES (?, ?, 6)", RECIPE, DEMO_USER))
                .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
    }

    @Test
    void deletingACookRemovesTheirRatings() {
        long second = insertSecondUser();
        repository.upsert(second, RECIPE, 3);

        db.update("DELETE FROM users WHERE user_id = ?", second);

        assertThat(repository.aggregateFor(RECIPE).count()).isZero();
    }
}

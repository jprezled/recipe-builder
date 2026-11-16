package com.recipebuilder.repository;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.jdbc.JdbcTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import com.recipebuilder.model.PantryItem;

/**
 * The pantry_items table, against the real test database.
 *
 * Runs against recipe_builder_test_db, never the development one - same rule
 * as FavoriteRepositoryTest, and for the same reason: this truncates.
 *
 * These tests exist because nothing covered this table at all, and that is
 * how it went unnoticed that reset.sql never created it.
 */
@JdbcTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
@Import(PantryRepository.class)
class PantryRepositoryTest {

    /** The id database/migrations/V2__demo_user.sql creates. */
    private static final long DEMO_USER_ID = 1L;

    private static final long OTHER_COOK = 2L;

    @Autowired
    private PantryRepository repository;

    @Autowired
    private JdbcTemplate db;

    @BeforeEach
    void clearTheTable() {
        db.execute("TRUNCATE pantry_items RESTART IDENTITY CASCADE");
        // A second cook to prove one pantry cannot see another's.
        db.update("INSERT INTO users (user_id, username, email, password_hash) "
                + "VALUES (?, 'other', 'other@example.com', 'x') "
                + "ON CONFLICT (user_id) DO NOTHING", OTHER_COOK);
    }

    @Test
    void anItemGoesInAndComesBack() {
        PantryItem saved = repository.save(DEMO_USER_ID, "garlic");

        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getUserId()).isEqualTo(DEMO_USER_ID);
        assertThat(saved.getPantry()).isEqualTo("garlic");
    }

    @Test
    void aCookSeesOnlyTheirOwnPantry() {
        repository.save(DEMO_USER_ID, "garlic");
        repository.save(OTHER_COOK, "saffron");

        List<PantryItem> mine = repository.findByUserId(DEMO_USER_ID);

        assertThat(mine).hasSize(1);
        assertThat(mine.get(0).getPantry()).isEqualTo("garlic");
    }

    @Test
    void theLookupIgnoresCase() {
        repository.save(DEMO_USER_ID, "Garlic");

        Optional<PantryItem> found =
                repository.findByUserIdAndPantryIgnoreCase(DEMO_USER_ID, "GARLIC");

        assertThat(found).isPresent();
        assertThat(found.get().getPantry()).isEqualTo("Garlic");
    }

    @Test
    void theLookupDoesNotReachIntoAnotherCooksPantry() {
        repository.save(OTHER_COOK, "saffron");

        Optional<PantryItem> found =
                repository.findByUserIdAndPantryIgnoreCase(DEMO_USER_ID, "saffron");

        // The same word in someone else's pantry must not count as a
        // duplicate, or the second cook to want saffron is refused.
        assertThat(found).isEmpty();
    }

    @Test
    void anEmptyPantryIsAnEmptyListNotNull() {
        assertThat(repository.findByUserId(DEMO_USER_ID)).isEmpty();
    }

    @Test
    void twoCooksCanBothKeepTheSameIngredient() {
        repository.save(DEMO_USER_ID, "garlic");
        repository.save(OTHER_COOK, "garlic");

        assertThat(repository.findByUserId(DEMO_USER_ID)).hasSize(1);
        assertThat(repository.findByUserId(OTHER_COOK)).hasSize(1);
    }
}

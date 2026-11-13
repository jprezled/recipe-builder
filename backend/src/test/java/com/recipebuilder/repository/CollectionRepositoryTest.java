package com.recipebuilder.repository;

import com.recipebuilder.dto.CollectionDto;
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
 * Collections against the real test database, set up the same way as
 * FavoriteRepositoryTest. Needs V8 applied to recipe_builder_test_db.
 */
@JdbcTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
@Import({CollectionRepository.class, FavoriteRepository.class})
class CollectionRepositoryTest {

    private static final long DEMO_USER_ID = 1L;
    private static final long OTHER_USER_ID = 2L;

    @Autowired
    private CollectionRepository repository;

    @Autowired
    private FavoriteRepository favorites;

    @Autowired
    private JdbcTemplate db;

    @BeforeEach
    void startFromAKnownState() {
        String database = db.queryForObject("SELECT current_database()", String.class);
        assertThat(database)
                .as("tests must never run against the development database")
                .isEqualTo("recipe_builder_test_db");

        db.execute("TRUNCATE saved_recipes, recipe_ingredients, recipes, collections CASCADE");

        db.update("INSERT INTO users (user_id, username, email, password_hash) "
                + "VALUES (?, 'demo', 'demo@example.com', 'not-a-real-hash') "
                + "ON CONFLICT (user_id) DO NOTHING", DEMO_USER_ID);
        db.update("INSERT INTO users (user_id, username, email, password_hash) "
                + "VALUES (?, 'other', 'other@example.com', 'not-a-real-hash') "
                + "ON CONFLICT (user_id) DO NOTHING", OTHER_USER_ID);
    }

    @Test
    void createReturnsTheCollectionWithItsNewId() {
        CollectionDto created = repository.create(DEMO_USER_ID, "Breakfast");

        assertThat(created.name()).isEqualTo("Breakfast");
        assertThat(created.id()).isPositive();
    }

    @Test
    void findForUserReturnsOnlyThatCooksCollections() {
        repository.create(DEMO_USER_ID, "Breakfast");
        repository.create(OTHER_USER_ID, "Dinner");

        List<CollectionDto> mine = repository.findForUser(DEMO_USER_ID);

        assertThat(mine).hasSize(1);
        assertThat(mine.get(0).name()).isEqualTo("Breakfast");
    }

    @Test
    void findForUserReturnsNewestFirst() {
        CollectionDto first = repository.create(DEMO_USER_ID, "First");
        CollectionDto second = repository.create(DEMO_USER_ID, "Second");
        // Inside one transaction CURRENT_TIMESTAMP is the same for both rows,
        // so push the first one back to give the ordering something to read.
        db.update("UPDATE collections SET created_at = created_at - interval '1 hour' "
                + "WHERE collection_id = ?", first.id());

        List<CollectionDto> mine = repository.findForUser(DEMO_USER_ID);

        assertThat(mine.get(0).id()).isEqualTo(second.id());
        assertThat(mine.get(1).id()).isEqualTo(first.id());
    }

    @Test
    void renameChangesTheNameAndReportsOneRow() {
        CollectionDto created = repository.create(DEMO_USER_ID, "Brekfast");

        int rows = repository.rename(DEMO_USER_ID, created.id(), "Breakfast");

        assertThat(rows).isEqualTo(1);
        assertThat(repository.findForUser(DEMO_USER_ID).get(0).name()).isEqualTo("Breakfast");
    }

    @Test
    void renameSomebodyElsesCollectionChangesNothing() {
        CollectionDto theirs = repository.create(OTHER_USER_ID, "Dinner");

        int rows = repository.rename(DEMO_USER_ID, theirs.id(), "Mine now");

        assertThat(rows).isZero();
        assertThat(repository.findForUser(OTHER_USER_ID).get(0).name()).isEqualTo("Dinner");
    }

    @Test
    void deleteRemovesItAndReportsOneRow() {
        CollectionDto created = repository.create(DEMO_USER_ID, "Breakfast");

        int rows = repository.delete(DEMO_USER_ID, created.id());

        assertThat(rows).isEqualTo(1);
        assertThat(repository.findForUser(DEMO_USER_ID)).isEmpty();
    }

    @Test
    void deleteSomebodyElsesCollectionChangesNothing() {
        CollectionDto theirs = repository.create(OTHER_USER_ID, "Dinner");

        int rows = repository.delete(DEMO_USER_ID, theirs.id());

        assertThat(rows).isZero();
        assertThat(repository.findForUser(OTHER_USER_ID)).hasSize(1);
    }

    @Test
    void deletingACollectionLeavesItsRecipesSaved() {
        CollectionDto created = repository.create(DEMO_USER_ID, "Breakfast");
        favorites.save(DEMO_USER_ID,
                new FavoriteRequest(716429L, "Pancakes", null, created.id()));

        repository.delete(DEMO_USER_ID, created.id());

        // ON DELETE SET NULL: still saved, now loose.
        assertThat(favorites.findForUser(DEMO_USER_ID)).hasSize(1);
        assertThat(favorites.findForUser(DEMO_USER_ID).get(0).collectionId()).isNull();
    }

    @Test
    void isOwnedByIsTrueForTheirOwnAndFalseForAnotherCooks() {
        CollectionDto mine = repository.create(DEMO_USER_ID, "Breakfast");

        assertThat(repository.isOwnedBy(DEMO_USER_ID, mine.id())).isTrue();
        assertThat(repository.isOwnedBy(OTHER_USER_ID, mine.id())).isFalse();
    }

    @Test
    void isOwnedByIsFalseForACollectionThatDoesNotExist() {
        assertThat(repository.isOwnedBy(DEMO_USER_ID, 999999L)).isFalse();
    }
}

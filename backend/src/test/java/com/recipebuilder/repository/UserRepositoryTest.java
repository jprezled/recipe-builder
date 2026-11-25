package com.recipebuilder.repository;

import com.recipebuilder.exception.UsernameTakenException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.jdbc.JdbcTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Runs against recipe_builder_test_db, never recipe_builder_db. Each test runs
 * in a transaction that is rolled back afterwards, so nothing it inserts
 * survives. The demo user from V2 is already in the table, so these tests use
 * other names.
 */
@JdbcTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
@Import(UserRepository.class)
class UserRepositoryTest {

    @Autowired
    private UserRepository repository;

    @Autowired
    private JdbcTemplate db;

    @BeforeEach
    void checkWeAreOnTheTestDatabase() {
        // Same safety check as FavoriteRepositoryTest. If the test profile ever
        // stops pointing at the test database, fail loudly before touching data.
        String database = db.queryForObject("SELECT current_database()", String.class);
        assertThat(database)
                .as("tests must never run against the development database")
                .isEqualTo("recipe_builder_test_db");
    }

    @Test
    void aUserGoesInAndComesBack() {
        StoredUser inserted = repository.insert("sam", "sam@example.com", "hash-1");

        assertThat(inserted.id()).isPositive();
        assertThat(inserted.username()).isEqualTo("sam");
        assertThat(inserted.email()).isEqualTo("sam@example.com");

        assertThat(repository.findByUsername("sam")).isEqualTo(inserted);
    }

    @Test
    void anUnknownNameGivesNull() {
        assertThat(repository.findByUsername("nobody-by-this-name")).isNull();
    }

    @Test
    void aDuplicateNameIsRefused() {
        repository.insert("sam", "sam@example.com", "hash-1");

        assertThatThrownBy(() -> repository.insert("sam", "other@example.com", "hash-2"))
                .isInstanceOf(UsernameTakenException.class);
    }

    @Test
    void aDuplicateEmailIsRefused() {
        repository.insert("sam", "sam@example.com", "hash-1");

        assertThatThrownBy(() -> repository.insert("pat", "sam@example.com", "hash-2"))
                .isInstanceOf(UsernameTakenException.class);
    }

    @Test
    void aNameLongerThanTheColumnIsRefused() {
        // username is VARCHAR(50), so 51 characters is one too many.
        String tooLong = "a".repeat(51);

        assertThatThrownBy(() -> repository.insert(tooLong, "long@example.com", "hash-1"))
                .isInstanceOf(UsernameTakenException.class);
    }

    @Test
    void theStoredScrambleIsExactlyWhatWasHandedIn() {
        String scramble = "$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ0123";

        repository.insert("sam", "sam@example.com", scramble);

        // Read it back with plain SQL, not through the repository, so this
        // proves what the database holds rather than what our own code says.
        String inTheDatabase = db.queryForObject(
                "SELECT password_hash FROM users WHERE username = 'sam'", String.class);
        assertThat(inTheDatabase).isEqualTo(scramble);
    }

    // ---- RB-290 ------------------------------------------------------------

    @Test
    void aChangedPasswordReplacesTheStoredHash() {
        StoredUser sam = repository.insert("sam", "sam@example.com", "old-hash");

        repository.updatePassword(sam.id(), "new-hash");

        assertThat(repository.findById(sam.id()).passwordHash()).isEqualTo("new-hash");
    }

    @Test
    void aDeletedAccountIsGone() {
        StoredUser sam = repository.insert("sam", "sam@example.com", "hash-1");

        repository.deleteById(sam.id());

        assertThat(repository.findById(sam.id())).isNull();
        assertThat(repository.findByUsername("sam")).isNull();
    }

    /** pantry_items has no foreign key, so nothing cascades it away. */
    @Test
    void deletingAnAccountTakesItsPantryWithIt() {
        StoredUser sam = repository.insert("sam", "sam@example.com", "hash-1");
        db.update("INSERT INTO pantry_items (user_id, pantry) VALUES (?, ?)", sam.id(), "eggs");

        repository.deleteById(sam.id());

        Integer left = db.queryForObject(
                "SELECT COUNT(*) FROM pantry_items WHERE user_id = ?", Integer.class, sam.id());
        assertThat(left).isZero();
    }
}


package com.recipebuilder.repository;

import com.recipebuilder.dto.FavoriteRequest;
import com.recipebuilder.exception.DatabaseUnavailableException;
import com.recipebuilder.exception.DemoUserMissingException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.assertj.core.api.Assertions.assertThatExceptionOfType;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * The repository turns the database's own failures into ours, so nothing above
 * it has to import anything from Spring JDBC - the same job SpoonacularClient
 * does for Spoonacular's HTTP statuses.
 *
 * JdbcTemplate is mocked here rather than using a real database, because the
 * point is what happens when the database says no, and making a real Postgres
 * refuse on command is harder than it is worth.
 */
class FavoriteRepositoryErrorsTest {

    private static final long DEMO_USER_ID = 1L;
    private static final FavoriteRequest A_RECIPE =
            new FavoriteRequest(716429L, "Pasta", null, null);

    private JdbcTemplate db;
    private FavoriteRepository repository;

    @BeforeEach
    void setUp() {
        db = mock(JdbcTemplate.class);
        repository = new FavoriteRepository(db);
    }

    @Test
    void anUnreachableDatabaseBecomesOurOwnException() {
        when(db.queryForObject(anyString(), eq(Long.class), any(), any(), any()))
                .thenThrow(new DataAccessResourceFailureException("connection refused"));

        assertThatExceptionOfType(DatabaseUnavailableException.class)
                .isThrownBy(() -> repository.save(DEMO_USER_ID, A_RECIPE));
    }

    @Test
    void aConstraintViolationOnSaveBecomesTheMissingDemoUser() {
        // In sprint 2 an integrity violation here is nearly always the foreign
        // key on saved_recipes.user_id, because V2__demo_user.sql was skipped.
        when(db.queryForObject(anyString(), eq(Long.class), any(), any(), any()))
                .thenThrow(new DataIntegrityViolationException("fk violation"));

        assertThatExceptionOfType(DemoUserMissingException.class)
                .isThrownBy(() -> repository.save(DEMO_USER_ID, A_RECIPE))
                .withMessageContaining("V2__demo_user.sql");
    }

    @Test
    void readingFromAnUnreachableDatabaseAlsoBecomesOurs() {
        when(db.query(anyString(), any(FavoriteRowMapper.class), anyLong()))
                .thenThrow(new DataAccessResourceFailureException("connection refused"));

        assertThatExceptionOfType(DatabaseUnavailableException.class)
                .isThrownBy(() -> repository.findForUser(DEMO_USER_ID));
    }

    @Test
    void removingAgainstAnUnreachableDatabaseAlsoBecomesOurs() {
        when(db.update(anyString(), anyLong(), anyLong()))
                .thenThrow(new DataAccessResourceFailureException("connection refused"));

        assertThatExceptionOfType(DatabaseUnavailableException.class)
                .isThrownBy(() -> repository.remove(DEMO_USER_ID, 716429L));
    }
}

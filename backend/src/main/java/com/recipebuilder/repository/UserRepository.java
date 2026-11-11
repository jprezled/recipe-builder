package com.recipebuilder.repository;

import com.recipebuilder.exception.DatabaseUnavailableException;
import com.recipebuilder.exception.UsernameTakenException;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * The ONLY class that reads or writes the users table.
 *
 * Same idea as FavoriteRepository: all the SQL for one table in one place, so
 * the service above can be tested with this class mocked and no database.
 */
@Repository
public class UserRepository {

    private final JdbcTemplate db;

    public UserRepository(JdbcTemplate db) {
        this.db = db;
    }

    /**
     * @param username the exact name to look for
     * @return the user, or null when there is no such user
     */
    public StoredUser findByUsername(String username) {
        String sql = "SELECT user_id, username, email, password_hash, pantry "
                + "FROM users WHERE username = ?";

        try {
            List<StoredUser> rows = db.query(sql, new UserRowMapper(), username);
            return rows.isEmpty() ? null : rows.get(0);
        } catch (DataAccessException failure) {
            throw asOurs(failure);
        }
    }

    public StoredUser insert(String username, String email, String passwordHash, String pantry) {
        String sql = "INSERT INTO users (username, email, password_hash, pantry) "
                + "VALUES (?, ?, ?, ?) "
                + "RETURNING user_id, username, email, password_hash, pantry";

        try {
            return db.queryForObject(sql, new UserRowMapper(), username, email, passwordHash, pantry);
        } catch (DataAccessException failure) {
            throw asOurs(failure);
        }
    }

    /**
     * Stores a new user and returns it with the id the database gave it.
     *
     * @param passwordHash the scrambled password. Never the real one.
     * @throws UsernameTakenException when a constraint refuses the row
     */
    public StoredUser insert(String username, String email, String passwordHash) {
        // RETURNING hands the new row back in the same round trip, so we get
        // the generated user_id without a second query.
        String sql = "INSERT INTO users (username, email, password_hash) "
                + "VALUES (?, ?, ?) "
                + "RETURNING user_id, username, email, password_hash";

        try {
            return db.queryForObject(sql, new UserRowMapper(), username, email, passwordHash);
        } catch (DataAccessException failure) {
            throw asOurs(failure);
        }
    }

    /**
     * Turns one of Spring's database errors into one of ours, so nothing above
     * this class has to import anything from Spring JDBC. Same shape as
     * FavoriteRepository.asOurs.
     */
    private RuntimeException asOurs(DataAccessException failure) {
        if (failure instanceof DataIntegrityViolationException) {
            // The UNIQUE constraints on username and email, and also a value
            // too long for its column - Postgres reports all three this way.
            return new UsernameTakenException(
                    "That username is taken. Please pick another.", failure);
        }
        return new DatabaseUnavailableException("Could not reach the database.", failure);
    }
}

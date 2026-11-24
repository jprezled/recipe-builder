package com.recipebuilder.repository;

import com.recipebuilder.exception.DatabaseUnavailableException;
import com.recipebuilder.exception.UsernameTakenException;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.EmptyResultDataAccessException;
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

    /**
     * @param userId the exact id to look for
     * @return the user, or null when there is no such user
     */
    public StoredUser findById(Long userId) {
        String sql = "SELECT user_id, username, email, password_hash, pantry "
                + "FROM users WHERE user_id = ?";

        try {
            List<StoredUser> rows = db.query(sql, new UserRowMapper(), userId);
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
        // Delegate to the full 4-parameter insert, defaulting pantry to an empty string
        return insert(username, email, passwordHash, "");
    }

    /**
     * Updates the pantry column for an existing user.
     */
    public void updatePantry(Long userId, String pantry) {
        String sql = "UPDATE users SET pantry = ? WHERE user_id = ?";

        try {
            db.update(sql, pantry, userId);
        } catch (DataAccessException failure) {
            throw asOurs(failure);
        }
    }

    /** RB-290: replaces the stored hash. The caller has already checked the
     *  current password and the length of the new one. */
    public void updatePassword(long userId, String passwordHash) {
        String sql = "UPDATE users SET password_hash = ? WHERE user_id = ?";

        try {
            db.update(sql, passwordHash, userId);
        } catch (DataAccessException failure) {
            throw asOurs(failure);
        }
    }

    /**
     * RB-290: removes the account and everything belonging only to it.
     *
     * pantry_items is deleted BY HAND, and that is the whole point of this
     * method rather than a one-line DELETE. saved_recipes and collections
     * both declare ON DELETE CASCADE and clean themselves up; V5 created
     * pantry_items with a bare `user_id BIGINT NOT NULL` and no foreign key
     * at all, so nothing clears it. Deleting only the user succeeds, looks
     * right, and leaves that cook's pantry rows behind pointing at an id
     * that no longer exists. See docs/account-management-contract.md.
     */
    public void deleteById(long userId) {
        try {
            db.update("DELETE FROM pantry_items WHERE user_id = ?", userId);
            db.update("DELETE FROM users WHERE user_id = ?", userId);
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


    /** Both are one-liners over a shared oneColumn helper, so the empty-result and exception handling is written once rather than twice.
     * meaning both findDiet and findIntolerances use the same oneColumn helper
     * same lookup process across different columns
     *  
     * RB-209: the diet this cook saved, or null when they have saved none.
     *
     * @param userId whose preference
     * @return the saved diet, or null
     */
    public String findDiet(long userId) {
        return oneColumn("SELECT diet FROM users WHERE user_id = ?", userId);
    }

    /**
     * RB-209: the intolerances this cook saved, or null when they saved none.
     *
     * @param userId whose preference
     * @return the saved list, or null
     */
    public String findIntolerances(long userId) {
        return oneColumn("SELECT intolerances FROM users WHERE user_id = ?", userId);
    }


    /**also RB-209b:
     * EmptyResultDataAccessException answered with null is a 
     * signed-in session whose user has since been deleted — not an error to the caller.
     * Reads one text column for one user.
     * 
     * runs sql query for one text value, with userId
     * no match, return null
     * 
     *
     * Shared by the two readers above so the "no such user" handling is
     * written once. A signed-in session whose user has since been deleted is
     * not an error to the caller - they simply have nothing saved.
     */
    private String oneColumn(String sql, long userId) {
        try {
            return db.queryForObject(sql, String.class, userId);
        } catch (EmptyResultDataAccessException noSuchUser) {
            return null;
        } catch (DataAccessException failure) {
            throw asOurs(failure);
        }
    }


    /**Both columns in one statement, because they are always saved together.
     * 
     * saves a user's diet and intolerances together
     * 
     * runs UPDATE statements for the two columns matching user_id
     * ? is just placeholders, fill with diet, intolerances, and userId respectively    
     */
    public void saveRestrictions(long userId, String diet, String intolerances) {
        String sql = "UPDATE users SET diet = ?, intolerances = ? WHERE user_id = ?";

        try {
            db.update(sql, diet, intolerances, userId);
        } catch (DataAccessException failure) {
            throw asOurs(failure);
        }
    }

}

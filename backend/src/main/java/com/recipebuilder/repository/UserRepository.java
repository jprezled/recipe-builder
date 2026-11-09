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
        String sql = "SELECT user_id, username, email, password_hash "
                + "FROM users WHERE username = ?";

        try {
            // query() returns an empty list when nothing matches. queryForObject
            // would throw instead, and "no such user" is a normal answer here.
            List<StoredUser> rows = db.query(sql, new UserRowMapper(), username);
            return rows.isEmpty() ? null : rows.get(0);
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

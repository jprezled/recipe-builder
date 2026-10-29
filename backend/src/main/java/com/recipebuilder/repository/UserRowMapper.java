package com.recipebuilder.repository;

import org.springframework.jdbc.core.RowMapper;

import java.sql.ResultSet;
import java.sql.SQLException;

/** Copies one row of the users table into one StoredUser. */
public class UserRowMapper implements RowMapper<StoredUser> {

    @Override
    public StoredUser mapRow(ResultSet row, int rowNumber) throws SQLException {
        return new StoredUser(
                row.getLong("user_id"),
                row.getString("username"),
                row.getString("email"),
                row.getString("password_hash"));
    }
}
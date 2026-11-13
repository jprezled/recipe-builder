package com.recipebuilder.model;

import org.springframework.jdbc.core.RowMapper;
import java.sql.ResultSet;
import java.sql.SQLException;

public class PantryRowMapper implements RowMapper<PantryItem> {
    @Override
    public PantryItem mapRow(ResultSet rs, int rowNum) throws SQLException {
        return new PantryItem(
            rs.getLong("id"),
            rs.getLong("user_id"),
            rs.getString("pantry")
        );
    }
}
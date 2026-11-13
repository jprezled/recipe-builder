package com.recipebuilder.repository;

import com.recipebuilder.dto.CollectionDto;
import org.springframework.jdbc.core.RowMapper;

import java.sql.ResultSet;
import java.sql.SQLException;

/** Copies one row of a query result into one CollectionDto. */
public class CollectionRowMapper implements RowMapper<CollectionDto> {

    @Override
    public CollectionDto mapRow(ResultSet row, int rowNumber) throws SQLException {
        long id = row.getLong("collection_id");
        String name = row.getString("name");

        return new CollectionDto(id, name);
    }
}

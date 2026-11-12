package com.recipebuilder.repository;

import com.recipebuilder.dto.FavoriteDto;
import org.springframework.jdbc.core.RowMapper;

import java.sql.ResultSet;
import java.sql.SQLException;

/**
 * Copies one row of a query result into one FavoriteDto.
 *
 * A named class rather than a lambda, so the mapping reads as plain code: take
 * that column, put it in this field. Same reasoning as SpoonacularClient using
 * RestTemplate rather than the fluent RestClient - see CLAUDE.md.
 */
public class FavoriteRowMapper implements RowMapper<FavoriteDto> {

    /**
     * @param row       the current row. Already positioned - do not call next().
     * @param rowNumber which row this is, counting from 0. We do not need it.
     * @return the row as one of our own objects
     */
    @Override
    public FavoriteDto mapRow(ResultSet row, int rowNumber) throws SQLException {
        long spoonacularId = row.getLong("spoonacular_id");
        String title = row.getString("title");
        String imageUrl = row.getString("image_url");

        // RB-205: getString gives null for a SQL NULL, which is exactly what
        // "no note written" means to the rest of the app.
        String note = row.getString("note");

        // RB-210: getLong alone gives 0 for a SQL NULL, and every loose recipe
        // would claim to be in collection 0, so ask wasNull straight after.
        // (getObject with Long.class is refused by the driver for an int4.)
        Long collectionId = row.getLong("collection_id");
        if (row.wasNull()) {
            collectionId = null;
        }

        return new FavoriteDto(spoonacularId, title, imageUrl, note, collectionId);
    }
}

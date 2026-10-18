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

        return new FavoriteDto(spoonacularId, title, imageUrl);
    }
}

package com.recipebuilder.repository;

import com.recipebuilder.dto.RatingSummaryDto;
import com.recipebuilder.exception.DatabaseUnavailableException;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * All the SQL for recipe ratings.
 *
 * Keyed on Spoonacular's id, not on the recipes table - see V10.
 */
@Repository
public class RatingRepository {

    private final JdbcTemplate db;

    public RatingRepository(JdbcTemplate db) {
        this.db = db;
    }

    public void upsert(long userId, long spoonacularId, int rating) {
        String sql = "INSERT INTO recipe_ratings (spoonacular_id, user_id, rating) " + "VALUES (?, ?, ?) " + "ON CONFLICT (spoonacular_id, user_id) " + "DO UPDATE SET rating = EXCLUDED.rating, rated_at = CURRENT_TIMESTAMP";

        try {
            db.update(sql, spoonacularId, userId, rating);
        } catch (DataAccessException failure) {
            throw asOurs(failure);
        }
    }

    public RatingSummaryDto aggregateFor(long spoonacularId) {
        String sql = "SELECT COALESCE(AVG(rating), 0) AS average, COUNT(*) AS count " + "FROM recipe_ratings WHERE spoonacular_id = ?";
        try {
            return db.queryForObject(sql, (rs, rowNum) -> new RatingSummaryDto(spoonacularId, rs.getDouble("average"), rs.getInt("count")), spoonacularId);
        } catch (DataAccessException failure) {
            throw asOurs(failure);
        }
    }

    public Integer yourRating(long userId, long spoonacularId) {
        String sql = "SELECT rating FROM recipe_ratings WHERE spoonacular_id = ? AND user_id = ?";
        try {
            List<Integer> rows = db.query(sql, (rs, rowNum) -> rs.getInt("rating"), spoonacularId, userId);
            return rows.isEmpty() ? null : rows.get(0);
        } catch (DataAccessException failure) {
            throw asOurs(failure);
        }
    }

    public List<RatingSummaryDto> aggregatesFor(List<Long> spoonacularIds) {
        if (spoonacularIds.isEmpty()) {
            return List.of();
        }
        String placeholders = String.join(",", spoonacularIds.stream().map(id -> "?").toList());
        String sql = "SELECT spoonacular_id, AVG(rating) AS average, COUNT(*) AS count " + "FROM recipe_ratings WHERE spoonacular_id IN (" + placeholders + ") " + "GROUP BY spoonacular_id";

        try {
            Map<Long, RatingSummaryDto> byId = new HashMap<>();
            db.query(sql, rs -> {
                long id = rs.getLong("spoonacular_id");
                byId.put(id, new RatingSummaryDto(id, rs.getDouble("average"), rs.getInt("count")));
            }, spoonacularIds.toArray());

            List<RatingSummaryDto> ordered = new ArrayList<>(spoonacularIds.size());
            for (Long id : spoonacularIds) {
                ordered.add(byId.getOrDefault(id, new RatingSummaryDto(id, 0.0, 0)));
            }
            return ordered;
        } catch (DataAccessException failure) {
            throw asOurs(failure);
        }
    }

    private DatabaseUnavailableException asOurs(DataAccessException failure) {
        return new DatabaseUnavailableException("Could not reach the database.", failure);
    }
}

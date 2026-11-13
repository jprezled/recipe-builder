package com.recipebuilder.repository;

import com.recipebuilder.model.PantryItem;
import com.recipebuilder.model.PantryRowMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public class PantryRepository {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    public List<PantryItem> findByUserId(Long userId) {
        String sql = "SELECT id, user_id, pantry FROM pantry_items WHERE user_id = ?";
        return jdbcTemplate.query(sql, new PantryRowMapper(), userId);
    }

    public Optional<PantryItem> findByUserIdAndPantryIgnoreCase(Long userId, String pantry) {
        String sql = "SELECT id, user_id, pantry FROM pantry_items WHERE user_id = ? AND LOWER(pantry) = LOWER(?)";
        List<PantryItem> results = jdbcTemplate.query(sql, new PantryRowMapper(), userId, pantry);
        return results.stream().findFirst();
    }

    public PantryItem save(Long userId, String pantry) {
        String sql = "INSERT INTO pantry_items (user_id, pantry) VALUES (?, ?) RETURNING id, user_id, pantry";
        return jdbcTemplate.queryForObject(sql, new PantryRowMapper(), userId, pantry);
    }
}
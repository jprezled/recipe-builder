package com.recipebuilder.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import com.recipebuilder.client.SpoonacularClient;
import com.recipebuilder.client.dto.SpoonacularIngredientSuggestion;
import com.recipebuilder.dto.IngredientSuggestionDto;

@Service
public class IngredientSuggestionService {

    private static final int SHORTEST_QUERY = 2;
    private static final int HOW_MANY = 10;

    private static final String IMAGE_BASE =
            "https://img.spoonacular.com/ingredients_100x100/";

    private final SpoonacularClient client;

    public IngredientSuggestionService(SpoonacularClient client) {
        this.client = client;
    }

    /**
     * Reuses suggestions for the same cleaned query.
     * Short queries are refused without contacting Spoonacular.
     */
    @Cacheable(
            cacheNames = "ingredientSuggestions",
            key = "#root.target.cleanQuery(#p0)",
            condition = "#root.target.cleanQuery(#p0).length() >= 2",
            sync = true)
    public List<IngredientSuggestionDto> suggest(String query) {
        String wanted = cleanQuery(query);

        if (wanted.length() < SHORTEST_QUERY) {
            return List.of();
        }

        List<SpoonacularIngredientSuggestion> suggestions =
                client.suggestIngredients(wanted, HOW_MANY);

        List<IngredientSuggestionDto> results = new ArrayList<>();

        for (SpoonacularIngredientSuggestion suggestion : suggestions) {
            results.add(new IngredientSuggestionDto(
                    suggestion.name(),
                    imageUrl(suggestion.image())));
        }

        return List.copyOf(results);
    }

    /**
     * Public so Spring can use the same cleaning rule for the cache key.
     */
    public String cleanQuery(String query) {
        if (query == null) {
            return "";
        }

        return query.trim().toLowerCase(Locale.ROOT);
    }

    private static String imageUrl(String fileName) {
        if (fileName == null || fileName.isBlank()) {
            return null;
        }

        return IMAGE_BASE + fileName;
    }
}
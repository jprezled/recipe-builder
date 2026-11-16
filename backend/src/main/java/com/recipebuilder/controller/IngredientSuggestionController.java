package com.recipebuilder.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.recipebuilder.dto.IngredientSuggestionDto;
import com.recipebuilder.service.IngredientSuggestionService;

/**
 * Provides ingredient suggestions without requiring sign-in.
 */
@RestController
public class IngredientSuggestionController {

    private final IngredientSuggestionService service;

    public IngredientSuggestionController(IngredientSuggestionService service) {
        this.service = service;
    }

    @GetMapping("/api/ingredients/suggest")
    public List<IngredientSuggestionDto> suggest(
            @RequestParam(name = "query", defaultValue = "") String query) {
        return service.suggest(query);
    }
}
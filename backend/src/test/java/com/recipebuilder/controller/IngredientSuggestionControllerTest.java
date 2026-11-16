package com.recipebuilder.controller;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.recipebuilder.dto.IngredientSuggestionDto;
import com.recipebuilder.service.IngredientSuggestionService;

@WebMvcTest(IngredientSuggestionController.class)
class IngredientSuggestionControllerTest {

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private IngredientSuggestionService service;

    @Test
    void suggestionsAreReturnedAsJsonInServiceOrder() throws Exception {
        when(service.suggest("to")).thenReturn(List.of(
                new IngredientSuggestionDto("tofu", null),
                new IngredientSuggestionDto("toast", null),
                new IngredientSuggestionDto("tonic water", null),
                new IngredientSuggestionDto(
                        "tomato",
                        "https://img.spoonacular.com/ingredients_100x100/tomato.png")));

        mvc.perform(get("/api/ingredients/suggest")
                        .param("query", "to"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(4))
                .andExpect(jsonPath("$[0].name").value("tofu"))
                .andExpect(jsonPath("$[1].name").value("toast"))
                .andExpect(jsonPath("$[2].name").value("tonic water"))
                .andExpect(jsonPath("$[3].name").value("tomato"))
                .andExpect(jsonPath("$[3].imageUrl").value(
                        "https://img.spoonacular.com/ingredients_100x100/tomato.png"));

        verify(service).suggest("to");
    }

    @Test
    void suggestionsCanBeRequestedWithoutSigningIn() throws Exception {
        when(service.suggest("yuz")).thenReturn(List.of(
                new IngredientSuggestionDto("yuzu", null)));

        mvc.perform(get("/api/ingredients/suggest")
                        .param("query", "yuz"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("yuzu"));

        verify(service).suggest("yuz");
    }

    @Test
    void missingQueryReturnsAnEmptyArray() throws Exception {
        when(service.suggest("")).thenReturn(List.of());

        mvc.perform(get("/api/ingredients/suggest"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));

        verify(service).suggest("");
    }

    @Test
    void oneLetterQueryReturnsAnEmptyArray() throws Exception {
        when(service.suggest("y")).thenReturn(List.of());

        mvc.perform(get("/api/ingredients/suggest")
                        .param("query", "y"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));

        verify(service).suggest("y");
    }
}
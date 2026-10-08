package com.recipebuilder.controller;

import com.recipebuilder.dto.RecipeSummaryDto;
import com.recipebuilder.service.RecipeService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * RB-38: expose GET /api/recipes/search
 *
 * The service is mocked, so these cover the web layer only - the address, the
 * JSON shape, and the status code. No HTTP leaves the process and no API key
 * is involved.
 */
@WebMvcTest(RecipeController.class)
class RecipeControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private RecipeService service;

    @Test
    void returnsOurRecipesAsJson() throws Exception {
        when(service.searchByIngredient(anyString())).thenReturn(List.of(
                new RecipeSummaryDto(716433L, "Easiest Breakfast Ever: Sunny Fruit Parfait",
                        "https://img.spoonacular.com/recipes/716433-312x231.jpg", 1, 3)));

        mockMvc.perform(get("/api/recipes/search").param("ingredient", "apple"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(716433))
                .andExpect(jsonPath("$[0].title").value("Easiest Breakfast Ever: Sunny Fruit Parfait"))
                .andExpect(jsonPath("$[0].imageUrl").value("https://img.spoonacular.com/recipes/716433-312x231.jpg"))
                .andExpect(jsonPath("$[0].ingredientsYouHave").value(1))
                .andExpect(jsonPath("$[0].ingredientsYouNeed").value(3));
    }

    @Test
    void passesTheIngredientFromTheQueryStringToTheService() throws Exception {
        when(service.searchByIngredient(anyString())).thenReturn(List.of());

        mockMvc.perform(get("/api/recipes/search").param("ingredient", "tomato"))
                .andExpect(status().isOk());

        verify(service).searchByIngredient(eq("tomato"));
    }

    @Test
    void noMatchesReturnsAnEmptyJsonArray() throws Exception {
        when(service.searchByIngredient(anyString())).thenReturn(List.of());

        mockMvc.perform(get("/api/recipes/search").param("ingredient", "unobtanium"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }
}

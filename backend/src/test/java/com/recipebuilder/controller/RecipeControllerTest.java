package com.recipebuilder.controller;

import java.util.List;

import org.junit.jupiter.api.Test;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.recipebuilder.dto.DietaryRestrictions;
import com.recipebuilder.dto.RecipeDetailDto;
import com.recipebuilder.dto.RecipeSummaryDto;
import com.recipebuilder.dto.ShoppingItemDto;
import com.recipebuilder.service.RecipeService;

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
        when(service.searchByIngredients(anyString(), any(DietaryRestrictions.class))).thenReturn(List.of(
                new RecipeSummaryDto(716433L, "Easiest Breakfast Ever: Sunny Fruit Parfait",
                        "https://img.spoonacular.com/recipes/716433-312x231.jpg", 1, 3, 25)));

        mockMvc.perform(get("/api/recipes/search").param("ingredients", "apple"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].matchPercent").value(25))
                .andExpect(jsonPath("$[0].id").value(716433))
                .andExpect(jsonPath("$[0].title").value("Easiest Breakfast Ever: Sunny Fruit Parfait"))
                .andExpect(jsonPath("$[0].imageUrl").value("https://img.spoonacular.com/recipes/716433-312x231.jpg"))
                .andExpect(jsonPath("$[0].ingredientsYouHave").value(1))
                .andExpect(jsonPath("$[0].ingredientsYouNeed").value(3));
    }

    @Test
    void passesTheIngredientFromTheQueryStringToTheService() throws Exception {
        when(service.searchByIngredients(anyString(), any(DietaryRestrictions.class))).thenReturn(List.of());

        mockMvc.perform(get("/api/recipes/search").param("ingredients", "tomato"))
                .andExpect(status().isOk());

        verify(service).searchByIngredients(eq("tomato"), eq(new DietaryRestrictions("none", "none")));
    }

    @Test
    void noMatchesReturnsAnEmptyJsonArray() throws Exception {
        when(service.searchByIngredients(anyString(), any(DietaryRestrictions.class))).thenReturn(List.of());

        mockMvc.perform(get("/api/recipes/search").param("ingredients", "unobtanium"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void passesDietAndIntolerancesFromTheQueryStringToTheService() throws Exception {
        when(service.searchByIngredients(anyString(), any(DietaryRestrictions.class))).thenReturn(List.of());

        mockMvc.perform(get("/api/recipes/search")
                        .param("ingredients", "tomato")
                        .param("diet", "vegan")
                        .param("intolerances", "peanut"))
                .andExpect(status().isOk());

        verify(service).searchByIngredients(eq("tomato"), eq(new DietaryRestrictions("vegan", "peanut")));
    }

    @Test
    void missingDietAndAllergiesBecomeNone() throws Exception { 
        when(service.searchByIngredients(anyString(), any(DietaryRestrictions.class)))
                        .thenReturn(List.of());

         mockMvc.perform(get("/api/recipes/search").param("ingredients", "tomato"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));

        verify(service).searchByIngredients(eq("tomato"), eq(new DietaryRestrictions("none", "none")));
        
            }

    @Test
    void returnsOneRecipeAsJson() throws Exception {
        when(service.getRecipe(660101L)).thenReturn(new RecipeDetailDto(
                660101L,
                "Simple Garlic Pasta",
                "https://img.spoonacular.com/recipes/660101-556x370.jpg",
                1,
                45,
                List.of("3 cloves of garlic (minced)"),
                List.of("Start with boiling water in a large pot."),
                new RecipeDetailDto.Diets(true, true, false, true),
                List.of(new ShoppingItemDto("garlic", "3 cloves of garlic (minced)", "Produce"))));

        mockMvc.perform(get("/api/recipes/660101"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(660101))
                .andExpect(jsonPath("$.title").value("Simple Garlic Pasta"))
                .andExpect(jsonPath("$.imageUrl").value("https://img.spoonacular.com/recipes/660101-556x370.jpg"))
                .andExpect(jsonPath("$.servings").value(1))
                .andExpect(jsonPath("$.readyInMinutes").value(45))
                .andExpect(jsonPath("$.ingredients[0]").value("3 cloves of garlic (minced)"))
                .andExpect(jsonPath("$.steps[0]").value("Start with boiling water in a large pot."))
                .andExpect(jsonPath("$.diets.vegetarian").value(true))
                .andExpect(jsonPath("$.diets.glutenFree").value(false));
    }

    /**
     * The pattern route /api/recipes/{id} now sits beside the literal
     * /api/recipes/search. Spring SHOULD prefer the literal word - but if it
     * ever stops doing so, every search in the app returns 400, so this is
     * pinned rather than assumed.
     */
    @Test
    void theSearchAddressStillWinsOverTheIdPattern() throws Exception {
        when(service.searchByIngredients(anyString(), any(DietaryRestrictions.class))).thenReturn(List.of());

        mockMvc.perform(get("/api/recipes/search").param("ingredients", "apple"))
                .andExpect(status().isOk());

        verify(service).searchByIngredients(eq("apple"), eq(new DietaryRestrictions("none", "none")));
        verify(service, never()).getRecipe(anyLong());
    }
}

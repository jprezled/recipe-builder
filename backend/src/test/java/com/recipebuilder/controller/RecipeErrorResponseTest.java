package com.recipebuilder.controller;

import org.junit.jupiter.api.Test;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.recipebuilder.dto.DietaryRestrictions;
import com.recipebuilder.exception.ApiKeyMissingException;
import com.recipebuilder.exception.ApiLimitReachedException;
import com.recipebuilder.exception.ExternalApiException;
import com.recipebuilder.exception.InvalidInputException;
import com.recipebuilder.service.RecipeService;

/**
 * RB-85: every failure leaves as the agreed shape - {"message": "..."} - with
 * the right status, and no stack trace reaches the browser.
 *
 * The wording is fixed by docs/error-shape.md. Changing a sentence here means
 * changing it there first.
 */
@WebMvcTest(RecipeController.class)
class RecipeErrorResponseTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private RecipeService service;

    @Test
    void blankIngredientIsABadRequest() throws Exception {
        when(service.searchByIngredients(anyString(), any(DietaryRestrictions.class)))
                .thenThrow(new InvalidInputException("Please enter at least one ingredient."));

        mockMvc.perform(get("/api/recipes/search").param("ingredients", " "))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Please enter at least one ingredient."));
    }

    @Test
    void missingIngredientParameterIsAlsoABadRequest() throws Exception {
        // ?ingredients= left off the address entirely.
        mockMvc.perform(get("/api/recipes/search"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Please enter at least one ingredient."));
    }

    @Test
    void quotaExhaustedIsTooManyRequests() throws Exception {
        when(service.searchByIngredients(anyString(),any(DietaryRestrictions.class))).thenThrow(new ApiLimitReachedException());

        mockMvc.perform(get("/api/recipes/search").param("ingredients", "apple"))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.message")
                        .value("Daily recipe search limit reached. Please try again tomorrow."));
    }

    @Test
    void aRejectedKeyIsOurProblemNotTheUsers() throws Exception {
        when(service.searchByIngredients(anyString(),any(DietaryRestrictions.class)))
                .thenThrow(new ApiKeyMissingException("Spoonacular rejected our API key."));

        mockMvc.perform(get("/api/recipes/search").param("ingredients", "apple"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.message")
                        .value("Recipe search is not configured correctly. Please tell the team."));
    }

    @Test
    void spoonacularBeingUnreachableIsABadGateway() throws Exception {
        when(service.searchByIngredients(anyString(),any(DietaryRestrictions.class)))
                .thenThrow(new ExternalApiException("Could not reach Spoonacular.", null));

        mockMvc.perform(get("/api/recipes/search").param("ingredients", "apple"))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.message")
                        .value("Recipe search is unavailable right now. Please try again shortly."));
    }

    @Test
    void noFailureEverLeaksAStackTraceOrAStatusCode() throws Exception {
        when(service.searchByIngredients(anyString(), any(DietaryRestrictions.class))).thenThrow(new ApiLimitReachedException());

        mockMvc.perform(get("/api/recipes/search").param("ingredients", "apple"))
                .andExpect(content().string(org.hamcrest.Matchers.not(
                        org.hamcrest.Matchers.containsString("Exception"))))
                .andExpect(content().string(org.hamcrest.Matchers.not(
                        org.hamcrest.Matchers.containsString("com.recipebuilder"))))
                // Spring's default error body carries these. Ours must not.
                .andExpect(jsonPath("$.trace").doesNotExist())
                .andExpect(jsonPath("$.status").doesNotExist())
                .andExpect(jsonPath("$.path").doesNotExist());
    }
    @Test
    void anUnsupportedDietaryFilterIsABadRequest() throws Exception {
        when(service.searchByIngredients(anyString(), any(DietaryRestrictions.class)))
                .thenThrow(new InvalidInputException("That dietary filter is not one we support."));

        mockMvc.perform(get("/api/recipes/search")
                        .param("ingredients", "apple")
                        .param("diet", "carnivore"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("That dietary filter is not one we support."));
    }
}

package com.recipebuilder.controller;

import com.recipebuilder.dto.FavoriteDto;
import com.recipebuilder.dto.FavoriteRequest;
import com.recipebuilder.exception.DatabaseUnavailableException;
import com.recipebuilder.exception.DemoUserMissingException;
import com.recipebuilder.service.FavoriteService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The favorites web layer: addresses, status codes and JSON shape.
 *
 * The service is mocked, so no database is involved. What is checked here is
 * the contract the frontend is built against.
 */
@WebMvcTest(FavoriteController.class)
class FavoriteControllerTest {

    private static final String A_RECIPE =
            "{\"id\":716429,\"title\":\"Pasta\",\"imageUrl\":\"http://img/1.jpg\"}";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private FavoriteService service;

    @Test
    void listsFavoritesAsJson() throws Exception {
        when(service.list()).thenReturn(List.of(
                new FavoriteDto(716429L, "Garlic Chicken Pasta", "http://img/1.jpg")));

        mockMvc.perform(get("/api/favorites"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(716429))
                .andExpect(jsonPath("$[0].title").value("Garlic Chicken Pasta"))
                .andExpect(jsonPath("$[0].imageUrl").value("http://img/1.jpg"));
    }

    @Test
    void noFavoritesIsAnEmptyArrayNotAnError() throws Exception {
        when(service.list()).thenReturn(List.of());

        mockMvc.perform(get("/api/favorites"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void savingAnswers201() throws Exception {
        mockMvc.perform(post("/api/favorites")
                        .contentType(MediaType.APPLICATION_JSON).content(A_RECIPE))
                .andExpect(status().isCreated());

        verify(service).add(any(FavoriteRequest.class));
    }

    @Test
    void savingTheSameRecipeTwiceStillAnswers201() throws Exception {
        // Idempotent on purpose, so a double-tapped button cannot produce an
        // error the cook has to understand.
        mockMvc.perform(post("/api/favorites")
                .contentType(MediaType.APPLICATION_JSON).content(A_RECIPE))
                .andExpect(status().isCreated());
        mockMvc.perform(post("/api/favorites")
                .contentType(MediaType.APPLICATION_JSON).content(A_RECIPE))
                .andExpect(status().isCreated());
    }

    @Test
    void removingAnswers204() throws Exception {
        mockMvc.perform(delete("/api/favorites/716429"))
                .andExpect(status().isNoContent());

        verify(service).remove(716429L);
    }

    @Test
    void removingSomethingNeverSavedStillAnswers204() throws Exception {
        mockMvc.perform(delete("/api/favorites/999999"))
                .andExpect(status().isNoContent());
    }

    @Test
    void aDatabaseFailureComesBackAsOneReadableSentence() throws Exception {
        doThrow(new DatabaseUnavailableException("boom", new RuntimeException()))
                .when(service).add(any(FavoriteRequest.class));

        mockMvc.perform(post("/api/favorites")
                        .contentType(MediaType.APPLICATION_JSON).content(A_RECIPE))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.message")
                        .value("Could not save your favorite right now. Please try again shortly."))
                // No stack trace, no timestamp, no path - see docs/error-shape.md.
                .andExpect(jsonPath("$.trace").doesNotExist())
                .andExpect(jsonPath("$.path").doesNotExist())
                .andExpect(jsonPath("$.timestamp").doesNotExist());
    }

    @Test
    void aMissingDemoUserNamesTheSetupStep() throws Exception {
        doThrow(new DemoUserMissingException(
                "The database is missing its setup data. Apply "
                        + "database/migrations/V2__demo_user.sql and try again.",
                new RuntimeException()))
                .when(service).add(any(FavoriteRequest.class));

        mockMvc.perform(post("/api/favorites")
                        .contentType(MediaType.APPLICATION_JSON).content(A_RECIPE))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.message")
                        .value(org.hamcrest.Matchers.containsString("V2__demo_user.sql")));
    }

    @Test
    void openingTheFavoritesPageWithTheDatabaseDownSaysSoReadably() throws Exception {
        // Not just saving - reading has to explain itself too.
        when(service.list())
                .thenThrow(new DatabaseUnavailableException("boom", new RuntimeException()));

        mockMvc.perform(get("/api/favorites"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.message").exists());
    }
}

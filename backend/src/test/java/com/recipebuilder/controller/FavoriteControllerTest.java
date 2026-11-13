package com.recipebuilder.controller;

import com.recipebuilder.exception.RecipeNotFoundException;
import com.recipebuilder.dto.FavoriteDto;
import com.recipebuilder.dto.FavoriteRequest;
import com.recipebuilder.exception.DatabaseUnavailableException;
import com.recipebuilder.exception.DemoUserMissingException;
import com.recipebuilder.exception.InvalidInputException;
import com.recipebuilder.service.FavoriteService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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

    /** The session key agreed in docs/accounts-contract.md. */
    private static final String USER_ID = "userId";

    /** Who the signed-in requests below are signed in as. */
    private static final long SIGNED_IN = 7L;

    private static final String A_RECIPE =
            "{\"id\":716429,\"title\":\"Pasta\",\"imageUrl\":\"http://img/1.jpg\"}";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private FavoriteService service;

    @Test
    void listsFavoritesAsJson() throws Exception {
        when(service.list(SIGNED_IN)).thenReturn(List.of(
                new FavoriteDto(716429L, "Garlic Chicken Pasta", "http://img/1.jpg", null, null)));

        mockMvc.perform(get("/api/favorites").sessionAttr(USER_ID, SIGNED_IN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(716429))
                .andExpect(jsonPath("$[0].title").value("Garlic Chicken Pasta"))
                .andExpect(jsonPath("$[0].imageUrl").value("http://img/1.jpg"));
    }

    @Test
    void noFavoritesIsAnEmptyArrayNotAnError() throws Exception {
        when(service.list(SIGNED_IN)).thenReturn(List.of());

        mockMvc.perform(get("/api/favorites").sessionAttr(USER_ID, SIGNED_IN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void savingAnswers201() throws Exception {
        mockMvc.perform(post("/api/favorites")
                        .sessionAttr(USER_ID, SIGNED_IN)
                        .contentType(MediaType.APPLICATION_JSON).content(A_RECIPE))
                .andExpect(status().isCreated());

        verify(service).add(eq(SIGNED_IN), any(FavoriteRequest.class));
    }

    @Test
    void savingTheSameRecipeTwiceStillAnswers201() throws Exception {
        // Idempotent on purpose, so a double-tapped button cannot produce an
        // error the cook has to understand.
        mockMvc.perform(post("/api/favorites")
                .sessionAttr(USER_ID, SIGNED_IN)
                        .contentType(MediaType.APPLICATION_JSON).content(A_RECIPE))
                .andExpect(status().isCreated());
        mockMvc.perform(post("/api/favorites")
                .sessionAttr(USER_ID, SIGNED_IN)
                        .contentType(MediaType.APPLICATION_JSON).content(A_RECIPE))
                .andExpect(status().isCreated());
    }

    @Test
    void removingAnswers204() throws Exception {
        mockMvc.perform(delete("/api/favorites/716429").sessionAttr(USER_ID, SIGNED_IN))
                .andExpect(status().isNoContent());

        verify(service).remove(SIGNED_IN, 716429L);
    }

    @Test
    void removingSomethingNeverSavedStillAnswers204() throws Exception {
        mockMvc.perform(delete("/api/favorites/999999").sessionAttr(USER_ID, SIGNED_IN))
                .andExpect(status().isNoContent());
    }

    @Test
    void aDatabaseFailureComesBackAsOneReadableSentence() throws Exception {
        doThrow(new DatabaseUnavailableException("boom", new RuntimeException()))
                .when(service).add(eq(SIGNED_IN), any(FavoriteRequest.class));

        mockMvc.perform(post("/api/favorites")
                        .sessionAttr(USER_ID, SIGNED_IN)
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
                .when(service).add(eq(SIGNED_IN), any(FavoriteRequest.class));

        mockMvc.perform(post("/api/favorites")
                        .sessionAttr(USER_ID, SIGNED_IN)
                        .contentType(MediaType.APPLICATION_JSON).content(A_RECIPE))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.message")
                        .value(org.hamcrest.Matchers.containsString("V2__demo_user.sql")));
    }

    @Test
    void openingTheFavoritesPageWithTheDatabaseDownSaysSoReadably() throws Exception {
        // Not just saving - reading has to explain itself too.
        when(service.list(SIGNED_IN))
                .thenThrow(new DatabaseUnavailableException("boom", new RuntimeException()));

        mockMvc.perform(get("/api/favorites").sessionAttr(USER_ID, SIGNED_IN))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.message").exists());
    }

    @Test
    void listingWithoutASessionIsRefusedWithTheAgreedSentence() throws Exception {
        mockMvc.perform(get("/api/favorites"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Please sign in to save favorites."));

        verifyNoInteractions(service);
    }

    @Test
    void savingWithoutASessionIsRefusedWithTheAgreedSentence() throws Exception {
        mockMvc.perform(post("/api/favorites")
                        .contentType(MediaType.APPLICATION_JSON).content(A_RECIPE))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Please sign in to save favorites."));

        verifyNoInteractions(service);
    }

    @Test
    void removingWithoutASessionIsRefusedWithTheAgreedSentence() throws Exception {
        mockMvc.perform(delete("/api/favorites/716429"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Please sign in to save favorites."));

        verifyNoInteractions(service);
    }

    @Test
    void theIdHandedToTheServiceIsTheOneFromTheSession() throws Exception {
        // Not the demo user, and not whatever the browser might have put in the
        // body - only the session decides whose favorites these are.
        long somebodyElse = 42L;
        when(service.list(somebodyElse)).thenReturn(List.of());

        mockMvc.perform(get("/api/favorites").sessionAttr(USER_ID, somebodyElse))
                .andExpect(status().isOk());

        verify(service).list(somebodyElse);
    }

    @Test
    void aSessionWithoutAUserIdIsStillRefused() throws Exception {
        // A session can exist for other reasons. Having one is not being
        // signed in; carrying a userId is.
        mockMvc.perform(get("/api/favorites").sessionAttr("somethingElse", "value"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Please sign in to save favorites."));

        verifyNoInteractions(service);
    }

    // RB-205: notes ------------------------------------------------------

    @Test
    void writingANoteAnswers204AndNoBody() throws Exception {
        mockMvc.perform(put("/api/favorites/660101/note")
                        .sessionAttr(USER_ID, SIGNED_IN)
                        .contentType(MediaType.TEXT_PLAIN).content("double the garlic"))
                .andExpect(status().isNoContent());

        verify(service).saveNote(SIGNED_IN, 660101L, "double the garlic");
    }

    @Test
    void writingANoteWhileSignedOutIsRefusedWithTheAgreedSentence() throws Exception {
        mockMvc.perform(put("/api/favorites/660101/note")
                        .contentType(MediaType.TEXT_PLAIN).content("double the garlic"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Please sign in to save favorites."));

        verifyNoInteractions(service);
    }

    /** An empty body clears the note, so it must reach the service, not 400. */
    @Test
    void anEmptyNoteBodyIsAccepted() throws Exception {
        mockMvc.perform(put("/api/favorites/660101/note")
                        .sessionAttr(USER_ID, SIGNED_IN)
                        .contentType(MediaType.TEXT_PLAIN).content(""))
                .andExpect(status().isNoContent());

        verify(service).saveNote(eq(SIGNED_IN), eq(660101L), any());
    }

    @Test
    void aNoteOnAnUnsavedRecipeAnswers400WithTheServicesSentence() throws Exception {
        doThrow(new InvalidInputException("Save this recipe before adding a note."))
                .when(service).saveNote(eq(SIGNED_IN), eq(660101L), any());

        mockMvc.perform(put("/api/favorites/660101/note")
                        .sessionAttr(USER_ID, SIGNED_IN)
                        .contentType(MediaType.TEXT_PLAIN).content("a note"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Save this recipe before adding a note."));
    }

    @Test
    void aNoteComesBackOnEachSavedRecipe() throws Exception {
        when(service.list(SIGNED_IN)).thenReturn(List.of(
                new FavoriteDto(716429L, "Pasta", "http://img/1.jpg", "double the garlic", null)));

        mockMvc.perform(get("/api/favorites").sessionAttr(USER_ID, SIGNED_IN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].note").value("double the garlic"));
    }

    // RB-210: collections ------------------------------------------------

    @Test
    void movingAnswers204() throws Exception {
        mockMvc.perform(put("/api/favorites/660101/collection")
                        .sessionAttr(USER_ID, SIGNED_IN)
                        .contentType(MediaType.TEXT_PLAIN).content("3"))
                .andExpect(status().isNoContent());

        verify(service).moveToCollection(SIGNED_IN, 660101L, 3L);
    }

    @Test
    void anEmptyBodyMakesItLoose() throws Exception {
        mockMvc.perform(put("/api/favorites/660101/collection")
                        .sessionAttr(USER_ID, SIGNED_IN))
                .andExpect(status().isNoContent());

        verify(service).moveToCollection(SIGNED_IN, 660101L, null);
    }

    @Test
    void movingWhileSignedOutIsUnauthorised() throws Exception {
        mockMvc.perform(put("/api/favorites/660101/collection")
                        .contentType(MediaType.TEXT_PLAIN).content("3"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Please sign in to save favorites."));

        verifyNoInteractions(service);
    }

    @Test
    void movingARecipeTheCookHasNotSavedAnswers404() throws Exception {
        doThrow(new RecipeNotFoundException("Save this recipe before adding it to a collection."))
                .when(service).moveToCollection(SIGNED_IN, 660101L, 3L);

        mockMvc.perform(put("/api/favorites/660101/collection")
                        .sessionAttr(USER_ID, SIGNED_IN)
                        .contentType(MediaType.TEXT_PLAIN).content("3"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message")
                        .value("Save this recipe before adding it to a collection."));
    }

    @Test
    void listingReportsEachRecipesCollection() throws Exception {
        when(service.list(SIGNED_IN)).thenReturn(List.of(
                new FavoriteDto(716429L, "Pancakes", null, null, 3L)));

        mockMvc.perform(get("/api/favorites").sessionAttr(USER_ID, SIGNED_IN))
                .andExpect(jsonPath("$[0].collectionId").value(3));
    }

    @Test
    void anOldThreeFieldSaveStillDeserialises() throws Exception {
        mockMvc.perform(post("/api/favorites")
                        .sessionAttr(USER_ID, SIGNED_IN)
                        .contentType(MediaType.APPLICATION_JSON).content(A_RECIPE))
                .andExpect(status().isCreated());
    }
}

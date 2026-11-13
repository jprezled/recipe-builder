package com.recipebuilder.controller;

import com.recipebuilder.dto.CollectionDto;
import com.recipebuilder.exception.CollectionNameTakenException;
import com.recipebuilder.exception.CollectionNotFoundException;
import com.recipebuilder.exception.InvalidInputException;
import com.recipebuilder.service.CollectionService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

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

/** The collections web layer: addresses, statuses and the agreed sentences. */
@WebMvcTest(CollectionController.class)
class CollectionControllerTest {

    private static final String USER_ID = "userId";
    private static final long SIGNED_IN = 7L;
    private static final String SIGN_IN = "Please sign in to save favorites.";
    private static final String A_NAME = "{\"name\":\"Breakfast\"}";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CollectionService service;

    @Test
    void listingCollectionsReturnsThem() throws Exception {
        when(service.list(SIGNED_IN)).thenReturn(List.of(new CollectionDto(3L, "Breakfast")));

        mockMvc.perform(get("/api/collections").sessionAttr(USER_ID, SIGNED_IN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(3))
                .andExpect(jsonPath("$[0].name").value("Breakfast"));
    }

    @Test
    void creatingACollectionAnswers201() throws Exception {
        when(service.create(SIGNED_IN, "Breakfast")).thenReturn(new CollectionDto(3L, "Breakfast"));

        mockMvc.perform(post("/api/collections")
                        .sessionAttr(USER_ID, SIGNED_IN)
                        .contentType(MediaType.APPLICATION_JSON).content(A_NAME))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(3))
                .andExpect(jsonPath("$.name").value("Breakfast"));
    }

    @Test
    void creatingWithABlankNameAnswers400() throws Exception {
        when(service.create(SIGNED_IN, ""))
                .thenThrow(new InvalidInputException("Please give the collection a name."));

        mockMvc.perform(post("/api/collections")
                        .sessionAttr(USER_ID, SIGNED_IN)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Please give the collection a name."));
    }

    @Test
    void creatingADuplicateAnswers409() throws Exception {
        when(service.create(SIGNED_IN, "Breakfast")).thenThrow(new CollectionNameTakenException(
                "You already have a collection with that name."));

        mockMvc.perform(post("/api/collections")
                        .sessionAttr(USER_ID, SIGNED_IN)
                        .contentType(MediaType.APPLICATION_JSON).content(A_NAME))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message")
                        .value("You already have a collection with that name."));
    }

    @Test
    void renamingAnswers204() throws Exception {
        mockMvc.perform(put("/api/collections/3")
                        .sessionAttr(USER_ID, SIGNED_IN)
                        .contentType(MediaType.APPLICATION_JSON).content(A_NAME))
                .andExpect(status().isNoContent());

        verify(service).rename(SIGNED_IN, 3L, "Breakfast");
    }

    @Test
    void renamingSomethingThatIsNotThereAnswers404() throws Exception {
        doThrow(new CollectionNotFoundException("That collection could not be found."))
                .when(service).rename(SIGNED_IN, 99L, "Breakfast");

        mockMvc.perform(put("/api/collections/99")
                        .sessionAttr(USER_ID, SIGNED_IN)
                        .contentType(MediaType.APPLICATION_JSON).content(A_NAME))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("That collection could not be found."));
    }

    @Test
    void deletingAnswers204() throws Exception {
        mockMvc.perform(delete("/api/collections/3").sessionAttr(USER_ID, SIGNED_IN))
                .andExpect(status().isNoContent());

        verify(service).delete(SIGNED_IN, 3L);
    }

    @Test
    void everyAddressIsUnauthorisedWhileSignedOut() throws Exception {
        mockMvc.perform(get("/api/collections"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value(SIGN_IN));
        mockMvc.perform(post("/api/collections")
                        .contentType(MediaType.APPLICATION_JSON).content(A_NAME))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value(SIGN_IN));
        mockMvc.perform(put("/api/collections/3")
                        .contentType(MediaType.APPLICATION_JSON).content(A_NAME))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value(SIGN_IN));
        mockMvc.perform(delete("/api/collections/3"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value(SIGN_IN));

        verifyNoInteractions(service);
    }
}

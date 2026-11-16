package com.recipebuilder.controller;

import org.junit.jupiter.api.Test;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.recipebuilder.model.PantryItem;
import com.recipebuilder.service.PantryService;
import com.recipebuilder.service.SessionService;

/**
 * The pantry web layer: who the item is saved for, and what happens when
 * nobody is signed in.
 *
 * The service is mocked, so no database is involved.
 */
@WebMvcTest(PantryController.class)
class PantryControllerTest {

    /** The session key agreed in docs/accounts-contract.md. */
    private static final String USER_ID = "userId";

    /** Who the signed-in requests below are signed in as. */
    private static final long SIGNED_IN = 7L;

    /** The id the demo account owns. Nothing here may be saved against it. */
    private static final long DEMO_USER = 1L;

    private static final String AN_ITEM = "{\"pantry\":\"garlic\"}";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private PantryService service;

    @Test
    void anItemIsSavedForTheSignedInCookNotTheDemoAccount() throws Exception {
        when(service.savePantryItem(SIGNED_IN, "garlic"))
                .thenReturn(new PantryItem(1L, SIGNED_IN, "garlic"));

        mockMvc.perform(post("/api/pantry")
                        .sessionAttr(USER_ID, SIGNED_IN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(AN_ITEM))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value(SIGNED_IN));

        // The id that reaches the service is the one in the session. A
        // hardcoded id would write every cook's pantry onto one account.
        verify(service).savePantryItem(eq(SIGNED_IN), eq("garlic"));
    }

    @Test
    void twoCooksSaveAgainstTheirOwnIds() throws Exception {
        when(service.savePantryItem(SIGNED_IN, "garlic"))
                .thenReturn(new PantryItem(1L, SIGNED_IN, "garlic"));
        when(service.savePantryItem(9L, "garlic"))
                .thenReturn(new PantryItem(2L, 9L, "garlic"));

        mockMvc.perform(post("/api/pantry")
                        .sessionAttr(USER_ID, SIGNED_IN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(AN_ITEM))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/pantry")
                        .sessionAttr(USER_ID, 9L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(AN_ITEM))
                .andExpect(status().isOk());

        verify(service).savePantryItem(eq(SIGNED_IN), eq("garlic"));
        verify(service).savePantryItem(eq(9L), eq("garlic"));
        verify(service, org.mockito.Mockito.never())
                .savePantryItem(eq(DEMO_USER), eq("garlic"));
    }

    @Test
    void signedOutIsRefusedWithTheAgreedSentenceAndTouchesNothing() throws Exception {
        mockMvc.perform(post("/api/pantry")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(AN_ITEM))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value(SessionService.NOT_SIGNED_IN));

        verifyNoInteractions(service);
    }

    @Test
    void aBlankItemIsRefused() throws Exception {
        mockMvc.perform(post("/api/pantry")
                        .sessionAttr(USER_ID, SIGNED_IN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"pantry\":\"   \"}"))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(service);
    }
}

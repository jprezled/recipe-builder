package com.recipebuilder.controller;

import org.junit.jupiter.api.Test;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.recipebuilder.service.SessionService;
import com.recipebuilder.service.UserService;

/**
 * The saved pantry web layer, as docs/saved-pantry-contract.md fixes it:
 *
 *   GET /api/pantry   -> "eggs,milk"   (text/plain)
 *   PUT /api/pantry   <- "eggs,milk"   204
 *
 * The cook is the one in the session. There is deliberately no id in the
 * address: an id there is a request to read somebody else's pantry.
 */
@WebMvcTest(PantryController.class)
class PantryControllerTest {

    /** The session key agreed in docs/accounts-contract.md. */
    private static final String USER_ID = "userId";

    private static final long SIGNED_IN = 7L;

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UserService service;

    @Test
    void theSavedPantryComesBackAsPlainText() throws Exception {
        when(service.getPantry(SIGNED_IN)).thenReturn("eggs,milk");

        mockMvc.perform(get("/api/pantry").sessionAttr(USER_ID, SIGNED_IN))
                .andExpect(status().isOk())
                .andExpect(content().string("eggs,milk"));
    }

    @Test
    void savingAnswers204AndStoresAgainstTheSignedInCook() throws Exception {
        mockMvc.perform(put("/api/pantry")
                        .sessionAttr(USER_ID, SIGNED_IN)
                        .contentType(MediaType.TEXT_PLAIN)
                        .content("eggs,milk"))
                .andExpect(status().isNoContent());

        verify(service).updatePantry(eq(SIGNED_IN), eq("eggs,milk"));
    }

    @Test
    void nobodyCanAskForAnotherCooksPantry() throws Exception {
        when(service.getPantry(SIGNED_IN)).thenReturn("eggs,milk");

        mockMvc.perform(get("/api/pantry").sessionAttr(USER_ID, SIGNED_IN))
                .andExpect(status().isOk());

        // The id comes from the session and nowhere else. Reading another
        // cook's pantry has to be unexpressible, not merely refused.
        verify(service).getPantry(SIGNED_IN);
        verify(service, never()).getPantry(8L);
    }

    @Test
    void readingSignedOutIsRefusedWithTheAgreedSentence() throws Exception {
        mockMvc.perform(get("/api/pantry"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value(SessionService.NOT_SIGNED_IN));

        verifyNoInteractions(service);
    }

    @Test
    void savingSignedOutIsRefusedAndWritesNothing() throws Exception {
        mockMvc.perform(put("/api/pantry")
                        .contentType(MediaType.TEXT_PLAIN)
                        .content("eggs,milk"))
                .andExpect(status().isUnauthorized());

        verify(service, never()).updatePantry(anyLong(), anyString());
    }

    @Test
    void anEmptyBodyClearsThePantryRatherThanFailing() throws Exception {
        mockMvc.perform(put("/api/pantry")
                        .sessionAttr(USER_ID, SIGNED_IN)
                        .contentType(MediaType.TEXT_PLAIN)
                        .content(""))
                .andExpect(status().isNoContent());

        verify(service).updatePantry(eq(SIGNED_IN), eq(""));
    }
}

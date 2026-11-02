package com.recipebuilder.controller;

import com.recipebuilder.dto.UserDto;
import com.recipebuilder.exception.NotSignedInException;
import com.recipebuilder.service.SessionService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * RB-160: sign in, sign out, and "who am I".
 *
 * The service is mocked. MockMvc does not carry a session from one request to
 * the next by itself, so the journey test takes the session out of the sign-in
 * result and hands it to every later request explicitly.
 */
@WebMvcTest(SessionController.class)
class SessionControllerTest {

    private static final String SIGN_IN_BODY =
            "{\"username\":\"andrew\",\"password\":\"password123\"}";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private SessionService service;

    @Test
    void signingInReturnsTheUserAndNoHash() throws Exception {
        when(service.signIn("andrew", "password123")).thenReturn(new UserDto(7L, "andrew"));

        mockMvc.perform(post("/api/sessions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(SIGN_IN_BODY))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(7))
                .andExpect(jsonPath("$.username").value("andrew"))
                .andExpect(jsonPath("$.passwordHash").doesNotExist());
    }

    @Test
    void wrongDetailsAreA401WithTheAgreedSentence() throws Exception {
        when(service.signIn(anyString(), anyString()))
                .thenThrow(new NotSignedInException("Incorrect username or password."));

        mockMvc.perform(post("/api/sessions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(SIGN_IN_BODY))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Incorrect username or password."));
    }

    @Test
    void askingWhoIAmWithNoSessionIsA401() throws Exception {
        mockMvc.perform(get("/api/session"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Please sign in to save favorites."));
    }

    @Test
    void signingOutWhenNobodyIsSignedInIsStillA204() throws Exception {
        mockMvc.perform(delete("/api/sessions"))
                .andExpect(status().isNoContent());
    }

    @Test
    void signInThenWhoAmIThenSignOutThenRefused() throws Exception {
        when(service.signIn("andrew", "password123")).thenReturn(new UserDto(7L, "andrew"));

        // Sign in, and take the session out of the result.
        MvcResult signedIn = mockMvc.perform(post("/api/sessions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(SIGN_IN_BODY))
                .andExpect(status().isOk())
                .andReturn();
        MockHttpSession session = (MockHttpSession) signedIn.getRequest().getSession();

        // Who am I? The session remembers.
        mockMvc.perform(get("/api/session").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(7))
                .andExpect(jsonPath("$.username").value("andrew"));

        // Sign out.
        mockMvc.perform(delete("/api/sessions").session(session))
                .andExpect(status().isNoContent());

        // The same session is now refused. A sign-out that does not forget fails here.
        mockMvc.perform(get("/api/session").session(session))
                .andExpect(status().isUnauthorized());
    }
}
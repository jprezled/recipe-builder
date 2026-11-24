package com.recipebuilder.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.assertj.core.api.Assertions.assertThat;

import com.recipebuilder.dto.SignUpRequest;
import com.recipebuilder.dto.UserDto;
import com.recipebuilder.exception.InvalidInputException;
import com.recipebuilder.exception.NotSignedInException;
import com.recipebuilder.exception.UsernameTakenException;
import com.recipebuilder.service.SessionService;
import com.recipebuilder.service.UserService;
import org.springframework.mock.web.MockHttpSession;

/**
 * RB-159: the sign-up address, with the service mocked.
 *
 * These describe statuses and bodies, not rules - the rules have their own
 * test next to the service.
 */
@WebMvcTest(UserController.class)
class UserControllerTest {

    private static final String SIGN_UP_BODY =
            "{\"username\":\"andrew\",\"email\":\"a@example.com\",\"password\":\"password123\"}";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UserService service;

    @Test
    void signingUpAnswers201WithTheNewAccount() throws Exception {
        when(service.signUp(any(SignUpRequest.class))).thenReturn(new UserDto(7L, "andrew"));

        mockMvc.perform(post("/api/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(SIGN_UP_BODY))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(7))
                .andExpect(jsonPath("$.username").value("andrew"));
    }

    @Test
    void nothingInTheReplyResemblesAPassword() throws Exception {
        when(service.signUp(any(SignUpRequest.class))).thenReturn(new UserDto(7L, "andrew"));

        String body = mockMvc.perform(post("/api/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(SIGN_UP_BODY))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.passwordHash").doesNotExist())
                .andReturn()
                .getResponse()
                .getContentAsString();

        assertThat(body.toLowerCase()).doesNotContain("password");
    }

    @Test
    void aTakenNameAnswers409WithTheAgreedSentence() throws Exception {
        when(service.signUp(any(SignUpRequest.class))).thenThrow(
                new UsernameTakenException("That username is taken. Please pick another.", null));

        mockMvc.perform(post("/api/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(SIGN_UP_BODY))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message")
                        .value("That username is taken. Please pick another."));
    }

    @Test
    void aBrokenRuleAnswers400WithTheServicesSentence() throws Exception {
        when(service.signUp(any(SignUpRequest.class)))
                .thenThrow(new InvalidInputException(UserService.PASSWORD_TOO_SHORT));

        mockMvc.perform(post("/api/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(SIGN_UP_BODY))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(UserService.PASSWORD_TOO_SHORT));
    }

    @Test
    void noFailureEverCarriesAStackTrace() throws Exception {
        when(service.signUp(any(SignUpRequest.class)))
                .thenThrow(new InvalidInputException(UserService.USERNAME_MISSING));

        mockMvc.perform(post("/api/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(SIGN_UP_BODY))
                .andExpect(status().isBadRequest())
                .andExpect(content().string(org.hamcrest.Matchers.not(
                        org.hamcrest.Matchers.containsString("com.recipebuilder"))));
    }

    // ---- RB-290: change password, delete account ---------------------------

    private static final String CHANGE_BODY =
            "{\"currentPassword\":\"secret123\",\"newPassword\":\"brandnew123\"}";

    private static final String DELETE_BODY = "{\"currentPassword\":\"secret123\"}";

    @Test
    void changingAPasswordAnswers204ForTheCookInTheSession() throws Exception {
        mockMvc.perform(put("/api/users/password")
                        .sessionAttr("userId", 1L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(CHANGE_BODY))
                .andExpect(status().isNoContent());

        verify(service).changePassword(1L, "secret123", "brandnew123");
    }

    @Test
    void changingAPasswordSignedOutAnswers401AndChangesNothing() throws Exception {
        mockMvc.perform(put("/api/users/password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(CHANGE_BODY))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value(SessionService.NOT_SIGNED_IN));

        verify(service, never()).changePassword(any(Long.class), any(), any());
    }

    @Test
    void theWrongCurrentPasswordAnswers401WithTheAgreedSentence() throws Exception {
        doThrow(new NotSignedInException(UserService.WRONG_PASSWORD))
                .when(service).changePassword(1L, "secret123", "brandnew123");

        mockMvc.perform(put("/api/users/password")
                        .sessionAttr("userId", 1L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(CHANGE_BODY))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Incorrect password."));
    }

    @Test
    void deletingAnAccountAnswers204AndEndsTheSession() throws Exception {
        MockHttpSession session = new MockHttpSession();
        session.setAttribute("userId", 1L);

        mockMvc.perform(delete("/api/users/me")
                        .session(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(DELETE_BODY))
                .andExpect(status().isNoContent());

        verify(service).deleteAccount(1L, "secret123");
        assertThat(session.isInvalid()).isTrue();
    }

    @Test
    void deletingWithTheWrongPasswordKeepsTheSession() throws Exception {
        MockHttpSession session = new MockHttpSession();
        session.setAttribute("userId", 1L);
        doThrow(new NotSignedInException(UserService.WRONG_PASSWORD))
                .when(service).deleteAccount(1L, "secret123");

        mockMvc.perform(delete("/api/users/me")
                        .session(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(DELETE_BODY))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Incorrect password."));

        assertThat(session.isInvalid()).isFalse();
    }
}


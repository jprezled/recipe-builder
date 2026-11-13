package com.recipebuilder.service;

import com.recipebuilder.dto.UserDto;
import com.recipebuilder.exception.NotSignedInException;
import com.recipebuilder.repository.StoredUser;
import com.recipebuilder.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

class SessionServiceTest {

    private UserRepository userRepository;
    private PasswordHasher passwordHasher;
    private SessionService sessionService;

    @BeforeEach
    void setUp() {
        userRepository = Mockito.mock(UserRepository.class);
        passwordHasher = Mockito.mock(PasswordHasher.class);
        sessionService = new SessionService(userRepository, passwordHasher);
    }

    @Test
    void signInSuccess() {
        StoredUser storedUser = new StoredUser(1L, "alice", "alice@test.com", "hashed_pw", "");
        when(userRepository.findByUsername("alice")).thenReturn(storedUser);
        when(passwordHasher.matches("secret123", "hashed_pw")).thenReturn(true);

        UserDto result = sessionService.signIn("alice", "secret123");

        assertThat(result.id()).isEqualTo(1L);
        assertThat(result.username()).isEqualTo("alice");
    }

    @Test
    void signInWrongPassword() {
        StoredUser storedUser = new StoredUser(1L, "alice", "alice@test.com", "hashed_pw", "");
        when(userRepository.findByUsername("alice")).thenReturn(storedUser);
        when(passwordHasher.matches("wrong_pw", "hashed_pw")).thenReturn(false);

        assertThatThrownBy(() -> sessionService.signIn("alice", "wrong_pw"))
                .isInstanceOf(NotSignedInException.class)
                .hasMessage(SessionService.WRONG_DETAILS);
    }

    @Test
    void signInUnknownUser() {
        when(userRepository.findByUsername("unknown")).thenReturn(null);

        assertThatThrownBy(() -> sessionService.signIn("unknown", "secret123"))
                .isInstanceOf(NotSignedInException.class)
                .hasMessage(SessionService.WRONG_DETAILS);
    }
}
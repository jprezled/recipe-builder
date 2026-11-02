package com.recipebuilder.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.recipebuilder.dto.UserDto;
import com.recipebuilder.exception.NotSignedInException;
import com.recipebuilder.repository.StoredUser;
import com.recipebuilder.repository.UserRepository;

/** The rules about signing in, with the repository and hasher mocked out. */
class SessionServiceTest {

    private UserRepository users;
    private PasswordHasher hasher;
    private SessionService service;

    @BeforeEach
    void setUp() {
        users = mock(UserRepository.class);
        hasher = mock(PasswordHasher.class);
        service = new SessionService(users, hasher);
    }

    @Test
    void theRightPasswordSignsIn() {
        when(users.findByUsername("andrew"))
                .thenReturn(new StoredUser(7L, "andrew", "a@example.com", "HASH"));
        when(hasher.matches("password123", "HASH")).thenReturn(true);

        UserDto signedIn = service.signIn("andrew", "password123");

        assertThat(signedIn).isEqualTo(new UserDto(7L, "andrew"));
    }

    @Test
    void aWrongPasswordIsRefusedWithTheAgreedSentence() {
        when(users.findByUsername("andrew"))
                .thenReturn(new StoredUser(7L, "andrew", "a@example.com", "HASH"));
        when(hasher.matches("wrong", "HASH")).thenReturn(false);

        assertThatExceptionOfType(NotSignedInException.class)
                .isThrownBy(() -> service.signIn("andrew", "wrong"))
                .withMessage("Incorrect username or password.");
    }

    @Test
    void anUnknownUsernameGetsExactlyTheSameSentence() {
        when(users.findByUsername("nobody")).thenReturn(null);

        assertThatExceptionOfType(NotSignedInException.class)
                .isThrownBy(() -> service.signIn("nobody", "password123"))
                .withMessage("Incorrect username or password.");
    }

    @Test
    void aBlankUsernameOrPasswordIsRefusedWithoutTouchingTheDatabase() {
        assertThatExceptionOfType(NotSignedInException.class)
                .isThrownBy(() -> service.signIn("  ", "password123"))
                .withMessage("Incorrect username or password.");
        assertThatExceptionOfType(NotSignedInException.class)
                .isThrownBy(() -> service.signIn("andrew", ""))
                .withMessage("Incorrect username or password.");
        assertThatExceptionOfType(NotSignedInException.class)
                .isThrownBy(() -> service.signIn(null, null))
                .withMessage("Incorrect username or password.");

        verifyNoInteractions(users);
    }
}
package com.recipebuilder.service;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;

import com.recipebuilder.dto.SignUpRequest;
import com.recipebuilder.dto.UserDto;
import com.recipebuilder.exception.InvalidInputException;
import com.recipebuilder.repository.StoredUser;
import com.recipebuilder.repository.UserRepository;

/**
 * RB-159: the rules about creating an account.
 *
 * The repository and the hasher are mocked, so these describe the rules only -
 * no database, no real hashing.
 */
@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository users;

    @Mock
    private PasswordHasher hasher;

    @InjectMocks
    private UserService service;

    private static SignUpRequest asked(String username, String email, String password) {
        return new SignUpRequest(username, email, password);
    }

    @Test
    void aNewAccountComesBackWithItsIdAndName() {
        when(hasher.hash("password123")).thenReturn("SCRAMBLED");
        when(users.insert("andrew", "a@example.com", "SCRAMBLED"))
                .thenReturn(new StoredUser(7L, "andrew", "a@example.com", "SCRAMBLED"));

        UserDto created = service.signUp(asked("andrew", "a@example.com", "password123"));

        assertThat(created).isEqualTo(new UserDto(7L, "andrew"));
    }

    @Test
    void whatReachesTheRepositoryIsTheScrambleNotTheTypedPassword() {
        when(hasher.hash("password123")).thenReturn("SCRAMBLED");
        when(users.insert(anyString(), anyString(), anyString()))
                .thenReturn(new StoredUser(7L, "andrew", "a@example.com", "SCRAMBLED"));

        service.signUp(asked("andrew", "a@example.com", "password123"));

        // The third argument is the one that matters. A real password must
        // never reach any layer below this service.
        verify(users).insert(eq("andrew"), eq("a@example.com"), eq("SCRAMBLED"));
    }

    @Test
    void aBlankUsernameIsRefusedWithoutTouchingTheRepository() {
        assertThatExceptionOfType(InvalidInputException.class)
                .isThrownBy(() -> service.signUp(asked("   ", "a@example.com", "password123")))
                .withMessage(UserService.USERNAME_MISSING);

        verifyNoInteractions(users, hasher);
    }

    @Test
    void aBlankEmailIsRefusedWithoutTouchingTheRepository() {
        assertThatExceptionOfType(InvalidInputException.class)
                .isThrownBy(() -> service.signUp(asked("andrew", "  ", "password123")))
                .withMessage(UserService.EMAIL_MISSING);

        verifyNoInteractions(users, hasher);
    }

    @Test
    void aShortPasswordIsRefusedWithoutTouchingTheRepository() {
        assertThatExceptionOfType(InvalidInputException.class)
                .isThrownBy(() -> service.signUp(asked("andrew", "a@example.com", "short12")))
                .withMessage(UserService.PASSWORD_TOO_SHORT);

        verifyNoInteractions(users, hasher);
    }

    @Test
    void aUsernameLongerThanTheColumnIsRefusedHereRatherThanByPostgres() {
        String tooLong = "a".repeat(51);

        assertThatExceptionOfType(InvalidInputException.class)
                .isThrownBy(() -> service.signUp(asked(tooLong, "a@example.com", "password123")))
                .withMessage(UserService.USERNAME_TOO_LONG);

        verifyNoInteractions(users, hasher);
    }

    @Test
    void anEmailLongerThanTheColumnIsRefusedHereToo() {
        String tooLong = "a".repeat(246) + "@example.com";

        assertThatExceptionOfType(InvalidInputException.class)
                .isThrownBy(() -> service.signUp(asked("andrew", tooLong, "password123")))
                .withMessage(UserService.EMAIL_TOO_LONG);

        verifyNoInteractions(users, hasher);
    }

    @Test
    void nullFieldsAreRefusedRatherThanThrowing() {
        assertThatExceptionOfType(InvalidInputException.class)
                .isThrownBy(() -> service.signUp(asked(null, null, null)))
                .withMessage(UserService.USERNAME_MISSING);

        verifyNoInteractions(users, hasher);
    }
}

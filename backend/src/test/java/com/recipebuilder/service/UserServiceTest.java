package com.recipebuilder.service;

import com.recipebuilder.dto.SignUpRequest;
import com.recipebuilder.dto.UserDto;
import com.recipebuilder.exception.InvalidInputException;
import com.recipebuilder.exception.NotSignedInException;
import com.recipebuilder.exception.UsernameTakenException;
import com.recipebuilder.repository.StoredUser;
import com.recipebuilder.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

class UserServiceTest {

    private UserRepository userRepository;
    private PasswordHasher passwordHasher;
    private UserService userService;

    @BeforeEach
    void setUp() {
        userRepository = Mockito.mock(UserRepository.class);
        passwordHasher = Mockito.mock(PasswordHasher.class);
        userService = new UserService(userRepository, passwordHasher);
    }

    @Test
    void signUpSuccess() {
        SignUpRequest request = new SignUpRequest("alice", "alice@test.com", "secret123", "");
        when(passwordHasher.hash("secret123")).thenReturn("hashed_pw");
        StoredUser savedUser = new StoredUser(1L, "alice", "alice@test.com", "hashed_pw", "");
        when(userRepository.insert("alice", "alice@test.com", "hashed_pw", "")).thenReturn(savedUser);

        UserDto result = userService.signUp(request);

        assertThat(result.id()).isEqualTo(1L);
        assertThat(result.username()).isEqualTo("alice");
    }

    @Test
    void signUpUsernameTaken() {
        SignUpRequest request = new SignUpRequest("alice", "alice@test.com", "secret123", "");
        when(passwordHasher.hash(anyString())).thenReturn("hashed_pw");
        when(userRepository.insert(anyString(), anyString(), anyString(), anyString()))
                .thenThrow(new UsernameTakenException("Taken", null));

        assertThatThrownBy(() -> userService.signUp(request))
                .isInstanceOf(UsernameTakenException.class);
    }

    // ---- RB-290: changing a password ---------------------------------------

    private static final StoredUser SIGNED_IN =
            new StoredUser(1L, "alice", "alice@test.com", "hashed_pw", "");

    @Test
    void changingAPasswordStoresTheNewHash() {
        when(userRepository.findById(1L)).thenReturn(SIGNED_IN);
        when(passwordHasher.matches("secret123", "hashed_pw")).thenReturn(true);
        when(passwordHasher.hash("brandnew123")).thenReturn("new_hash");

        userService.changePassword(1L, "secret123", "brandnew123");

        Mockito.verify(userRepository).updatePassword(1L, "new_hash");
    }

    @Test
    void theWrongCurrentPasswordIsRefusedAndNothingIsStored() {
        when(userRepository.findById(1L)).thenReturn(SIGNED_IN);
        when(passwordHasher.matches("wrong", "hashed_pw")).thenReturn(false);

        assertThatThrownBy(() -> userService.changePassword(1L, "wrong", "brandnew123"))
                .isInstanceOf(NotSignedInException.class)
                .hasMessage("Incorrect password.");

        Mockito.verify(userRepository, Mockito.never())
                .updatePassword(Mockito.anyLong(), anyString());
    }

    /** The same 8-character rule sign-up uses, and the same sentence. */
    @Test
    void aNewPasswordUnderEightCharactersIsRefused() {
        when(userRepository.findById(1L)).thenReturn(SIGNED_IN);
        when(passwordHasher.matches("secret123", "hashed_pw")).thenReturn(true);

        assertThatThrownBy(() -> userService.changePassword(1L, "secret123", "short"))
                .isInstanceOf(InvalidInputException.class)
                .hasMessage(UserService.PASSWORD_TOO_SHORT);

        Mockito.verify(userRepository, Mockito.never())
                .updatePassword(Mockito.anyLong(), anyString());
    }

    // ---- RB-290: deleting an account ---------------------------------------

    @Test
    void deletingAnAccountChecksThePasswordFirst() {
        when(userRepository.findById(1L)).thenReturn(SIGNED_IN);
        when(passwordHasher.matches("secret123", "hashed_pw")).thenReturn(true);

        userService.deleteAccount(1L, "secret123");

        Mockito.verify(userRepository).deleteById(1L);
    }

    @Test
    void deletingWithTheWrongPasswordDeletesNothing() {
        when(userRepository.findById(1L)).thenReturn(SIGNED_IN);
        when(passwordHasher.matches("wrong", "hashed_pw")).thenReturn(false);

        assertThatThrownBy(() -> userService.deleteAccount(1L, "wrong"))
                .isInstanceOf(NotSignedInException.class)
                .hasMessage("Incorrect password.");

        Mockito.verify(userRepository, Mockito.never()).deleteById(Mockito.anyLong());
    }
}
package com.recipebuilder.service;

import com.recipebuilder.dto.SignUpRequest;
import com.recipebuilder.dto.UserDto;
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
        when(userRepository.insert("alice", "alice@test.com", "hashed_pw")).thenReturn(savedUser);

        UserDto result = userService.signUp(request);

        assertThat(result.id()).isEqualTo(1L);
        assertThat(result.username()).isEqualTo("alice");
    }

    @Test
    void signUpUsernameTaken() {
        SignUpRequest request = new SignUpRequest("alice", "alice@test.com", "secret123", "");
        when(passwordHasher.hash(anyString())).thenReturn("hashed_pw");
        when(userRepository.insert(anyString(), anyString(), anyString()))
                .thenThrow(new UsernameTakenException("Taken", null));

        assertThatThrownBy(() -> userService.signUp(request))
                .isInstanceOf(UsernameTakenException.class);
    }
}
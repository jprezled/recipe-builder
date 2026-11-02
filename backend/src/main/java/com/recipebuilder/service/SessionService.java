package com.recipebuilder.service;

import org.springframework.stereotype.Service;

import com.recipebuilder.dto.UserDto;
import com.recipebuilder.exception.NotSignedInException;
import com.recipebuilder.repository.StoredUser;
import com.recipebuilder.repository.UserRepository;

/**
 * Checks sign-in details.
 *
 * Knows nothing about HTTP or sessions - those live in the controller. It
 * takes a name and a password and either returns who that is or refuses.
 */
@Service
public class SessionService {

    /** The agreed sentences from docs/error-shape.md. Change them there first. */
    public static final String WRONG_DETAILS = "Incorrect username or password.";
    public static final String NOT_SIGNED_IN = "Please sign in to save favorites.";

    private final UserRepository users;
    private final PasswordHasher hasher;

    public SessionService(UserRepository users, PasswordHasher hasher) {
        this.users = users;
        this.hasher = hasher;
    }

    /**
     * @return who signed in - id and username only, never the stored hash
     * @throws NotSignedInException for an unknown name, a wrong password, or a
     *         blank field, always with the same message so nobody can use it
     *         to discover which usernames exist
     */
    public UserDto signIn(String username, String password) {
        if (username == null || username.isBlank() || password == null || password.isEmpty()) {
            throw new NotSignedInException(WRONG_DETAILS);
        }

        StoredUser user = users.findByUsername(username);
        if (user == null || !hasher.matches(password, user.passwordHash())) {
            throw new NotSignedInException(WRONG_DETAILS);
        }

        return new UserDto(user.id(), user.username());
    }
}
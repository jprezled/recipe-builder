package com.recipebuilder.service;
import org.springframework.stereotype.Service;

import com.recipebuilder.dto.SignUpRequest;
import com.recipebuilder.dto.UserDto;
import com.recipebuilder.exception.InvalidInputException;
import com.recipebuilder.repository.StoredUser;
import com.recipebuilder.repository.UserRepository;

/**
 * The rules about creating an account.
 *
 * Knows nothing about HTTP - no requests, no responses, no status codes. The
 * rules live here rather than in the controller so they hold for anything
 * that calls us, not only for requests arriving through that one controller.
 */
@Service
public class UserService {

    /** The agreed sentences from docs/error-shape.md. Change them there first. */
    public static final String USERNAME_MISSING = "Please enter a username.";
    public static final String EMAIL_MISSING = "Please enter an email address.";
    public static final String PASSWORD_TOO_SHORT =
            "Please choose a password of at least 8 characters.";
    public static final String USERNAME_TOO_LONG =
            "That username is too long. Please use 50 characters or fewer.";
    public static final String EMAIL_TOO_LONG =
            "That email address is too long. Please use 255 characters or fewer.";

    private static final int SHORTEST_PASSWORD = 8;

    // The column widths in V1__initial_schema.sql. Checked here so a too-long
    // value becomes a sentence rather than a raw Postgres error.
    private static final int LONGEST_USERNAME = 50;
    private static final int LONGEST_EMAIL = 255;

    private final UserRepository users;
    private final PasswordHasher hasher;

    public UserService(UserRepository users, PasswordHasher hasher) {
        this.users = users;
        this.hasher = hasher;
    }

    /**
     * Creates an account.
     *
     * @return the new user - id and name only, never the stored hash
     * @throws InvalidInputException when a rule is broken
     * @throws com.recipebuilder.exception.UsernameTakenException when the name
     *         or the email is already in use. The repository raises that one,
     *         because the database's own UNIQUE constraint is the only place
     *         that can answer it without a race.
     */
    public UserDto signUp(SignUpRequest request) {

        // STEP 1: tidy the text before measuring it, so " a " is not a
        // three-character username.
        String username = request.username() == null ? "" : request.username().trim();
        String email = request.email() == null ? "" : request.email().trim();
        String password = request.password() == null ? "" : request.password();

        // STEP 2: the rules, before anything is hashed or stored.
        if (username.isEmpty()) {
            throw new InvalidInputException(USERNAME_MISSING);
        }
        if (email.isEmpty()) {
            throw new InvalidInputException(EMAIL_MISSING);
        }
        if (password.length() < SHORTEST_PASSWORD) {
            throw new InvalidInputException(PASSWORD_TOO_SHORT);
        }
        if (username.length() > LONGEST_USERNAME) {
            throw new InvalidInputException(USERNAME_TOO_LONG);
        }
        if (email.length() > LONGEST_EMAIL) {
            throw new InvalidInputException(EMAIL_TOO_LONG);
        }

        // STEP 3: scramble the password BEFORE the repository is called, so no
        // layer below this one has ever held a real password.
        String passwordHash = hasher.hash(password);

        // STEP 4: store it, and convert what came back into our outgoing type.
        StoredUser stored = users.insert(username, email, passwordHash);

        return new UserDto(stored.id(), stored.username());
    }
}

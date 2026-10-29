package com.recipebuilder.exception;

/**
 * A new user could not be stored because a constraint refused it: the name or
 * the email is already in use, or a value was too long for its column.
 *
 * All three reach us as the same kind of database error, so the message does
 * not promise which one it was.
 */
public class UsernameTakenException extends RuntimeException {

    public UsernameTakenException(String message, Throwable cause) {
        super(message, cause);
    }
}
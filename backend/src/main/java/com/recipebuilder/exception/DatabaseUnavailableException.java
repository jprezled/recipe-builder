package com.recipebuilder.exception;

/** The database could not be reached, or refused what we asked it to do. */
public class DatabaseUnavailableException extends RuntimeException {

    public DatabaseUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}

package com.recipebuilder.exception;

/** The caller sent us something we cannot search with. */
public class InvalidInputException extends RuntimeException {

    public InvalidInputException(String message) {
        super(message);
    }
}

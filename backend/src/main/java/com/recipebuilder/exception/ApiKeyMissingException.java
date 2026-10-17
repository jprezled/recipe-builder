package com.recipebuilder.exception;

/** Our API key is absent, blank, or was rejected by Spoonacular. */
public class ApiKeyMissingException extends RuntimeException {

    public ApiKeyMissingException(String message) {
        super(message);
    }
}

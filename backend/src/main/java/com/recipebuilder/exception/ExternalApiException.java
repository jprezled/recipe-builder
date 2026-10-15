package com.recipebuilder.exception;

/** Spoonacular failed in a way we have no specific handling for. */
public class ExternalApiException extends RuntimeException {

    public ExternalApiException(String message, Throwable cause) {
        super(message, cause);
    }
}

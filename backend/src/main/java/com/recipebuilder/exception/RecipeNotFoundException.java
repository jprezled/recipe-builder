package com.recipebuilder.exception;

/**
 * No recipe exists with the id that was asked for.
 *
 * Separate from ExternalApiException so an unknown id reads as the link being
 * wrong rather than our recipe service being down. The message is the one
 * agreed in docs/error-shape.md.
 */
public class RecipeNotFoundException extends RuntimeException {

    public RecipeNotFoundException(String message) {
        super(message);
    }
}

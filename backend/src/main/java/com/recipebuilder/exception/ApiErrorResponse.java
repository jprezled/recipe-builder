package com.recipebuilder.exception;

/**
 * The single JSON shape every failure comes back as: {"message": "..."}
 *
 * One field on purpose. The frontend displays it and nothing else, which is
 * what stops a second set of messages growing in React. See
 * docs/error-shape.md.
 */
public record ApiErrorResponse(String message) {
}

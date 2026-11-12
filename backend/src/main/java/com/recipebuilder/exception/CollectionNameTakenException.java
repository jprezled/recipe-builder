package com.recipebuilder.exception;

/**
 * The cook already has a collection with that name. The message is the one
 * agreed in docs/error-shape.md.
 */
public class CollectionNameTakenException extends RuntimeException {

    public CollectionNameTakenException(String message) {
        super(message);
    }
}

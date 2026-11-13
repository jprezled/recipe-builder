package com.recipebuilder.exception;

/**
 * The collection does not exist, or belongs to somebody else. Both answer the
 * same way, so a cook cannot learn which ids other cooks have. The message is
 * the one agreed in docs/error-shape.md.
 */
public class CollectionNotFoundException extends RuntimeException {

    public CollectionNotFoundException(String message) {
        super(message);
    }
}

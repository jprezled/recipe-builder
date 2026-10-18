package com.recipebuilder.exception;

/**
 * Saving failed because the row favorites hang off is not there.
 *
 * saved_recipes.user_id is a foreign key to users(user_id). Until accounts
 * ship, that row comes from Database/migrations/V2__demo_user.sql - so this
 * almost always means a teammate applied V1 and skipped V2, and the fix is a
 * setup step rather than a code change.
 */
public class DemoUserMissingException extends RuntimeException {

    public DemoUserMissingException(String message, Throwable cause) {
        super(message, cause);
    }
}

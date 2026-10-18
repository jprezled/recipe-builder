package com.recipebuilder.exception;

/**
 * Our shared daily Spoonacular allowance is spent. Nothing anyone can do but
 * wait, so the message says so.
 */
public class ApiLimitReachedException extends RuntimeException {

    public ApiLimitReachedException() {
        super("Daily recipe search limit reached. Please try again tomorrow.");
    }
}

package com.recipebuilder.dto;

/**
 * What the sign-up form sends us.
 *
 * This one carries the password; UserDto does not carry anything secret. Two
 * types rather than one, so a hash cannot reach a browser by accident.
 */
public record SignUpRequest(String username, String email, String password, String pantry) {
}
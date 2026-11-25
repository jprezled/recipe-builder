package com.recipebuilder.dto;

/** RB-290: what the change-password form sends. */
public record ChangePasswordRequest(String currentPassword, String newPassword) {
}

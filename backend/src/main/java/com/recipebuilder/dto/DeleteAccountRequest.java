package com.recipebuilder.dto;

/**
 * RB-290: what the delete-account confirmation sends.
 *
 * The password, even though the session already says who the cook is - see
 * docs/account-management-contract.md for why.
 */
public record DeleteAccountRequest(String currentPassword) {
}

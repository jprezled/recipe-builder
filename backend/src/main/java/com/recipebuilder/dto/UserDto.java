package com.recipebuilder.dto;

/**
 * A user as the browser sees one.
 *
 * No email and no password hash - the screen shows a name, and anything more
 * is a detail a page has no use for. StoredUser is the type that carries the
 * hash, and it never leaves the service layer.
 */
public record UserDto(long id, String username) {
}

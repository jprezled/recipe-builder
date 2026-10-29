package com.recipebuilder.repository;

/**
 * One row of the users table, exactly as the database holds it - password
 * scramble included. This type never leaves the service layer; the web layer
 * gets a different type with no passwordHash in it.
 */
public record StoredUser(long id, String username, String email, String passwordHash) {
    
}
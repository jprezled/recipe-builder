package com.recipebuilder.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class PasswordHasherTest {

    private final PasswordHasher hasher = new PasswordHasher();

    @Test
    void hashDoesNotContainPlainPassword() {
        String password = "examplePassword123!";
        String hash = hasher.hash(password);

        assertNotNull(hash);
        assertFalse(hash.contains(password));
    }

    @Test
    void samePasswordProducesDifferentHashesThatBothVerify() {
        String password = "examplePassword123!";

        String firstHash = hasher.hash(password);
        String secondHash = hasher.hash(password);

        assertNotEquals(firstHash, secondHash);
        assertTrue(hasher.matches(password, firstHash));
        assertTrue(hasher.matches(password, secondHash));
    }

    @Test
    void wrongPasswordDoesNotMatch() {
        String hash = hasher.hash("examplePassword123!");

        assertFalse(hasher.matches("wrongPassword", hash));
    }
}
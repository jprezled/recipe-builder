package com.recipebuilder.client;

import com.recipebuilder.exception.ApiKeyMissingException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.client.RestClientTest;

import static org.assertj.core.api.Assertions.assertThatExceptionOfType;

/**
 * RB-85: with no key configured, fail immediately with a clear message rather
 * than sending an empty key and getting a confusing 401 back.
 */
@RestClientTest(
        value = SpoonacularClient.class,
        properties = {
                "spoonacular.base-url=https://api.spoonacular.invalid",
                "spoonacular.api-key="
        })
class MissingKeyTest {

    @Autowired
    private SpoonacularClient client;

    @Test
    void aBlankKeyFailsBeforeAnyNetworkCall() {
        assertThatExceptionOfType(ApiKeyMissingException.class)
                .isThrownBy(() -> client.searchByIngredients("apple", 10))
                .withMessageContaining("SPOONACULAR_API_KEY");
    }
}

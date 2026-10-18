package com.recipebuilder.client;

import com.recipebuilder.exception.ApiKeyMissingException;
import com.recipebuilder.exception.ApiLimitReachedException;
import com.recipebuilder.exception.ExternalApiException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.client.RestClientTest;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.client.MockRestServiceServer;

import static org.assertj.core.api.Assertions.assertThatExceptionOfType;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.anything;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;

/**
 * RB-85: Spoonacular's failures become our own named errors, so nothing above
 * the client has to know what status codes they use.
 */
@RestClientTest(
        value = SpoonacularClient.class,
        properties = {
                "spoonacular.base-url=https://api.spoonacular.invalid",
                "spoonacular.api-key=test-key-not-a-real-key"
        })
class SpoonacularErrorsTest {

    @Autowired
    private SpoonacularClient client;

    @Autowired
    private MockRestServiceServer server;

    @Test
    void quotaExhaustedBecomesApiLimitReached() {
        // 402 Payment Required is how Spoonacular reports a spent free quota.
        server.expect(anything()).andRespond(withStatus(HttpStatus.PAYMENT_REQUIRED));

        assertThatExceptionOfType(ApiLimitReachedException.class)
                .isThrownBy(() -> client.searchByIngredients("apple", 10));
    }

    @Test
    void rejectedKeyBecomesApiKeyMissing() {
        server.expect(anything()).andRespond(withStatus(HttpStatus.UNAUTHORIZED));

        assertThatExceptionOfType(ApiKeyMissingException.class)
                .isThrownBy(() -> client.searchByIngredients("apple", 10));
    }

    @Test
    void forbiddenAlsoBecomesApiKeyMissing() {
        server.expect(anything()).andRespond(withStatus(HttpStatus.FORBIDDEN));

        assertThatExceptionOfType(ApiKeyMissingException.class)
                .isThrownBy(() -> client.searchByIngredients("apple", 10));
    }

    @Test
    void anyOtherFailureBecomesExternalApiError() {
        server.expect(anything()).andRespond(withStatus(HttpStatus.INTERNAL_SERVER_ERROR));

        assertThatExceptionOfType(ExternalApiException.class)
                .isThrownBy(() -> client.searchByIngredients("apple", 10));
    }
}

package com.recipebuilder.client;

import com.recipebuilder.client.dto.SpoonacularSearchResult;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.client.RestClientTest;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.queryParam;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

@RestClientTest(
        value = SpoonacularClient.class,
        properties = {
                "spoonacular.base-url=https://api.spoonacular.invalid",
                "spoonacular.api-key=test-key-not-a-real-key"
        })
class SpoonacularClientTest {

    @Autowired
    private SpoonacularClient client;

    @Autowired
    private MockRestServiceServer server;

    @Test
    void parsesRecipesFromAStubbedComplexSearchResponse() throws IOException {
        server.expect(requestTo(startsWith("https://api.spoonacular.invalid/recipes/complexSearch")))
                .andExpect(method(HttpMethod.GET))
                .andExpect(queryParam("includeIngredients", "apple"))
                .andExpect(queryParam("fillIngredients", "true"))
                .andExpect(queryParam("sort", "max-used-ingredients"))
                .andExpect(queryParam("number", "2"))
                .andExpect(queryParam("apiKey", "test-key-not-a-real-key"))
                .andRespond(withSuccess(stubbedResponse(), MediaType.APPLICATION_JSON));

        List<SpoonacularSearchResult> results = client.searchByIngredients("apple", 2);

        assertThat(results).hasSize(2);

        SpoonacularSearchResult first = results.get(0);
        assertThat(first.id()).isEqualTo(716433L);
        assertThat(first.title()).isEqualTo("Easiest Breakfast Ever: Sunny Fruit Parfait");
        assertThat(first.usedIngredientCount()).isEqualTo(1);
        assertThat(first.missedIngredientCount()).isEqualTo(3);
        assertThat(first.usedIngredients())
                .extracting(SpoonacularSearchResult.Ingredient::name)
                .containsExactly("apple");
        assertThat(first.missedIngredients())
                .extracting(SpoonacularSearchResult.Ingredient::name)
                .containsExactly("raisins", "sunflower seeds", "yogurt");

        assertThat(results.get(1).title()).isEqualTo("Swiss Bircher Muesli");

        // Fails if the expected request was never made.
        server.verify();
    }

    private String stubbedResponse() throws IOException {
        return new ClassPathResource("stubs/complex-search.json")
                .getContentAsString(StandardCharsets.UTF_8);
    }
}
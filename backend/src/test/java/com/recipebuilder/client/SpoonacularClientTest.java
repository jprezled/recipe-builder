package com.recipebuilder.client;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.startsWith;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.client.RestClientTest;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.queryParam;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import com.recipebuilder.client.dto.SpoonacularRecipeInformation;
import com.recipebuilder.client.dto.SpoonacularSearchResult;
import com.recipebuilder.dto.DietaryRestrictions;

/**
 * Specifies SpoonacularClient against a stubbed HTTP response.
 *
 * MockRestServiceServer replaces the RestTemplate's request factory, so no socket
 * is ever opened: the response comes from a file on the classpath, an
 * unexpected call fails the test, and the suite needs no API key and burns no
 * quota. The deliberately fake base-url below means a real network call would
 * fail loudly rather than quietly succeed.
 *
 * The stub in src/test/resources/stubs/ is a REAL response captured from
 * Spoonacular, not a hand-written guess. Recapture it with:
 *
 *   curl -s "https://api.spoonacular.com/recipes/complexSearch\
 *     ?includeIngredients=apple&number=2&fillIngredients=true\
 *     &sort=max-used-ingredients&apiKey=$KEY" | python3 -m json.tool \
 *     > src/test/resources/stubs/complex-search.json
 *
 * Both of those last two parameters are load-bearing: without fillIngredients
 * the counts this test asserts are absent, and without sort a multi-ingredient
 * search returns an empty results array.
 *
 * Doing so changes the ids and titles below, which is the point: the
 * assertions are tied to data we actually received.
 */
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

        List<SpoonacularSearchResult> results = client.searchByIngredients("apple", 2, new DietaryRestrictions("none", "none"));

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

    @Test
    void dietAndIntolerancesAreSentToSpoonacular() throws IOException {
        server.expect(requestTo(startsWith("https://api.spoonacular.invalid/recipes/complexSearch")))
                .andExpect(queryParam("includeIngredients", "apple"))
                .andExpect(queryParam("diet", "vegetarian"))
                .andExpect(queryParam("intolerances", "peanut"))
                .andExpect(queryParam("apiKey", "test-key-not-a-real-key"))
                .andRespond(withSuccess(stubbedResponse(), MediaType.APPLICATION_JSON));

        client.searchByIngredients("apple", 2, new DietaryRestrictions("vegetarian", "peanut"));

        server.verify();
    }

    @Test
    void noneMeansNeitherFilterIsSent() throws IOException {
        server.expect(requestTo(startsWith("https://api.spoonacular.invalid/recipes/complexSearch")))
                .andExpect(request -> assertThat(request.getURI().getQuery())
                        .doesNotContain("diet=")
                        .doesNotContain("intolerances="))
                .andRespond(withSuccess(stubbedResponse(), MediaType.APPLICATION_JSON));

        client.searchByIngredients("apple", 2, new DietaryRestrictions("none", "none"));

        server.verify();
    }

    @Test
    void onlyTheChoiceThatIsSetIsSent() throws IOException {
        server.expect(requestTo(startsWith("https://api.spoonacular.invalid/recipes/complexSearch")))
                .andExpect(queryParam("includeIngredients", "apple"))
                .andExpect(queryParam("diet", "vegetarian"))
                .andExpect(queryParam("apiKey", "test-key-not-a-real-key"))
                .andExpect(request -> assertThat(request.getURI().getQuery())
                        .doesNotContain("intolerances="))
                .andRespond(withSuccess(stubbedResponse(), MediaType.APPLICATION_JSON));

        client.searchByIngredients("apple", 2, new DietaryRestrictions("vegetarian", "none"));

        server.verify();
    }

    /**
     * RB-175: the detail call, against a real captured response. Recapture with:
     *
     *   curl -s "https://api.spoonacular.com/recipes/660101/information\
     *     ?includeNutrition=false&apiKey=$KEY" | python3 -m json.tool \
     *     > src/test/resources/stubs/recipe-information.json
     *
     * The stub keeps all 37 of their top-level fields, including the `summary`
     * we never read. That is deliberate: if the record ever loses
     * @JsonIgnoreProperties, this is the test that fails.
     */
    @Test
    void parsesOneRecipeFromAStubbedInformationResponse() throws IOException {
        server.expect(requestTo(startsWith("https://api.spoonacular.invalid/recipes/660101/information")))
                .andExpect(method(HttpMethod.GET))
                .andExpect(queryParam("includeNutrition", "false"))
                .andExpect(queryParam("apiKey", "test-key-not-a-real-key"))
                .andRespond(withSuccess(stubbedRecipe("recipe-information.json"), MediaType.APPLICATION_JSON));

        SpoonacularRecipeInformation recipe = client.getRecipe(660101L);

        assertThat(recipe.id()).isEqualTo(660101L);
        assertThat(recipe.title()).isEqualTo("Simple Garlic Pasta");
        assertThat(recipe.image()).isEqualTo("https://img.spoonacular.com/recipes/660101-556x370.jpg");
        assertThat(recipe.servings()).isEqualTo(1);
        assertThat(recipe.readyInMinutes()).isEqualTo(45);

        assertThat(recipe.vegetarian()).isTrue();
        assertThat(recipe.vegan()).isTrue();
        assertThat(recipe.glutenFree()).isFalse();
        assertThat(recipe.dairyFree()).isTrue();

        assertThat(recipe.extendedIngredients())
                .extracting(SpoonacularRecipeInformation.ExtendedIngredient::original)
                .containsExactly(
                        "2 whole dried chili pepper",
                        "3 cloves of garlic (minced)",
                        "3 tablespoons olive oil",
                        "1 teaspoon Himalayan or sea salt, to taste",
                        "100 grams Spaghettini (thin spaghetti)");

        // The structured steps, not their plain `instructions` HTML string.
        assertThat(recipe.analyzedInstructions()).hasSize(1);
        assertThat(recipe.analyzedInstructions().get(0).steps()).hasSize(7);
        assertThat(recipe.analyzedInstructions().get(0).steps().get(1).step())
                .isEqualTo("Start with boiling water in a large pot.");

        server.verify();
    }

    /**
     * Some recipes genuinely list nothing. Empty lists rather than an exception
     * or a null - docs/recipe-detail-contract.md calls this a success, not a
     * failure.
     */
    @Test
    void aRecipeWithNothingListedGivesEmptyLists() throws IOException {
        server.expect(requestTo(startsWith("https://api.spoonacular.invalid/recipes/660101/information")))
                .andRespond(withSuccess(stubbedRecipe("recipe-information-no-steps.json"),
                        MediaType.APPLICATION_JSON));

        SpoonacularRecipeInformation recipe = client.getRecipe(660101L);

        assertThat(recipe.title()).isEqualTo("Simple Garlic Pasta");
        assertThat(recipe.extendedIngredients()).isEmpty();
        assertThat(recipe.analyzedInstructions()).isEmpty();

        server.verify();
    }

    private String stubbedRecipe(String fileName) throws IOException {
        return new ClassPathResource("stubs/" + fileName)
                .getContentAsString(StandardCharsets.UTF_8);
    }
}

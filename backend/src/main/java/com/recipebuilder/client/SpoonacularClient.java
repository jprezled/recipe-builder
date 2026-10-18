package com.recipebuilder.client;

import com.recipebuilder.client.dto.SpoonacularSearchResult;
import com.recipebuilder.exception.ApiKeyMissingException;
import com.recipebuilder.exception.ApiLimitReachedException;
import com.recipebuilder.exception.ExternalApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.Arrays;
import java.util.List;

/**
 * The ONLY class that talks to spoonacular.com.
 *
 * Everything else in the app goes through here. That keeps the API key in one
 * place, and it means the rest of the code can be tested without a network
 * connection by faking this one class.
 */
@Component
public class SpoonacularClient {

    /** Does the actual HTTP work. Spring hands us one in the constructor. */
    private final RestTemplate restTemplate;

    /** "https://api.spoonacular.com" - set in application.properties. */
    private final String baseUrl;

    /** Read from .env. Never written in the code. */
    private final String apiKey;

    public SpoonacularClient(RestTemplateBuilder builder,
                             @Value("${spoonacular.base-url}") String baseUrl,
                             @Value("${spoonacular.api-key}") String apiKey) {
        this.restTemplate = builder.build();
        this.baseUrl = baseUrl;
        this.apiKey = apiKey;
    }

    /**
     * Asks Spoonacular for recipes that use the given ingredients.
     *
     * @param ingredients comma-separated names, e.g. "apple" or "apple,flour"
     * @param number      how many recipes to ask for
     * @return the recipes Spoonacular sent back, or an empty list if it sent none
     */
    public List<SpoonacularSearchResult> searchByIngredients(String ingredients, int number) {

        // STEP 0: refuse to call Spoonacular without a key. Sending an empty one
        // comes back as a confusing 401 rather than telling us what is wrong.
        if (apiKey == null || apiKey.isBlank()) {
            throw new ApiKeyMissingException(
                    "SPOONACULAR_API_KEY is not set. Add it to the .env file at the repo root.");
        }

        // STEP 1: build the web address we are going to call.
        //
        // The {words} in braces are placeholders, filled in at step 2. We do not
        // paste the real values in here ourselves, because a value like
        // "green onion" contains a space and spaces are not legal in a URL.
        String url = baseUrl
                + "/recipes/findByIngredients"
                + "?ingredients={ingredients}"
                + "&number={number}"
                + "&apiKey={apiKey}";

        // STEP 2: send the request and convert the reply into Java objects.
        //
        // getForObject means "do a GET request, then turn the response into this
        // type". The last three arguments fill the three placeholders above, in
        // the order they appear in the URL.
        //
        // We ask for an array - that is the [] in the type - because Spoonacular
        // replies with a JSON list of recipes.
        SpoonacularSearchResult[] recipes;
        try {
            recipes = restTemplate.getForObject(
                    url,
                    SpoonacularSearchResult[].class,
                    ingredients,
                    number,
                    apiKey);
        } catch (HttpStatusCodeException failure) {
            // Spoonacular answered, but with an error status.
            throw translate(failure.getStatusCode().value(), failure);
        } catch (RestClientException failure) {
            // No answer at all: no network, DNS failed, or a timeout.
            throw new ExternalApiException("Could not reach Spoonacular.", failure);
        }

        // STEP 3: hand back a List instead of an array.
        //
        // An empty response would leave recipes as null, and returning null
        // forces every caller to check for it. An empty list is safer.
        if (recipes == null) {
            return List.of();
        }
        return Arrays.asList(recipes);
    }

    /**
     * Turns Spoonacular's HTTP status into one of our own errors, so nothing
     * above this class has to know what status codes they use.
     *
     * Plain if/else on purpose - one branch per status, so adding a case later
     * means three obvious lines.
     */
    private RuntimeException translate(int status, Exception cause) {
        if (status == 402) {
            // 402 Payment Required is how Spoonacular reports a spent quota.
            return new ApiLimitReachedException();
        }
        if (status == 401 || status == 403) {
            return new ApiKeyMissingException(
                    "Spoonacular rejected our API key. Check SPOONACULAR_API_KEY in .env.");
        }
        return new ExternalApiException("Spoonacular returned HTTP " + status + ".", cause);
    }
}

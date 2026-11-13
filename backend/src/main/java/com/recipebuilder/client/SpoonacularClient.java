package com.recipebuilder.client;

import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import com.recipebuilder.client.dto.SpoonacularRecipeInformation;
import com.recipebuilder.client.dto.SpoonacularSearchResponse;
import com.recipebuilder.client.dto.SpoonacularSearchResult;
import com.recipebuilder.dto.DietaryRestrictions;
import com.recipebuilder.exception.ApiKeyMissingException;
import com.recipebuilder.exception.ApiLimitReachedException;
import com.recipebuilder.exception.ExternalApiException;
import com.recipebuilder.exception.RecipeNotFoundException;

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
     * @param choices     the cook's diet and allergy picks; "none" means no filter
     * @param sort        the sort order to ask for, already cleaned and checked
     * @return the recipes Spoonacular sent back, or an empty list if it sent none
     */
    public List<SpoonacularSearchResult> searchByIngredients(
            String ingredients, int number, DietaryRestrictions choices, String sort) {

        // STEP 0: refuse to call Spoonacular without a key. Sending an empty one
        // comes back as a confusing 401 rather than telling us what is wrong.
        if (apiKey == null || apiKey.isBlank()) {
            throw new ApiKeyMissingException(
                    "SPOONACULAR_API_KEY is not set. Add it to the .env file at the repo root.");
        }

        // STEP 1: build the web address we are going to call.
        String url = baseUrl
                + "/recipes/complexSearch"
                + "?includeIngredients={ingredients}"
                + "&fillIngredients=true"
                + "&sort={sort}"
                + "&number={number}"
                + "&apiKey={apiKey}";

        // The values for the placeholders, in the order they appear in the url.
        List<Object> values = new ArrayList<>(List.of(ingredients, sort, number, apiKey));

        // Each filter adds its placeholder AND its value in the same step,
        // so the two can never get out of line.
        if (hasValue(choices.diet())) {
            url += "&diet={diet}";
            values.add(choices.diet());
        }
        if (hasValue(choices.intolerances())) {
            url += "&intolerances={intolerances}";
            values.add(choices.intolerances());
        }

        // STEP 2: send the request and convert the reply into Java objects.
        SpoonacularSearchResponse response;
        try {
            response = restTemplate.getForObject(
                    url,
                    SpoonacularSearchResponse.class,
                    values.toArray());
        } catch (HttpStatusCodeException failure) {
            // Spoonacular answered, but with an error status.
            throw translate(failure.getStatusCode().value(), failure);
        } catch (RestClientException failure) {
            // No answer at all: no network, DNS failed, or a timeout.
            throw new ExternalApiException("Could not reach Spoonacular.", failure);
        }

        // STEP 3: extract and hand back the list of results.
        if (response == null || response.results() == null) {
            return List.of();
        }
        return response.results();
    }

    /**
     * Asks Spoonacular for everything about one recipe.
     *
     * @param id Spoonacular's recipe id, the same one search returned
     * @return their full reply for that recipe
     */
    public SpoonacularRecipeInformation getRecipe(long id) {

        // STEP 0: same guard as the search. An empty key comes back as a
        // confusing 401 rather than telling us what is actually wrong.
        if (apiKey == null || apiKey.isBlank()) {
            throw new ApiKeyMissingException(
                    "SPOONACULAR_API_KEY is not set. Add it to the .env file at the repo root.");
        }

        // STEP 1: build the address. includeNutrition=false because nothing on
        // the page shows nutrition, and asking for it makes their reply much
        // larger for no benefit.
        String url = baseUrl
                + "/recipes/{id}/information"
                + "?includeNutrition=true"
                + "&apiKey={apiKey}";

        // STEP 2: send it and convert the reply into Java objects.
        try {
            return restTemplate.getForObject(
                    url,
                    SpoonacularRecipeInformation.class,
                    id,
                    apiKey);
        } catch (HttpStatusCodeException failure) {
            // Spoonacular answered, but with an error status.
            throw translate(failure.getStatusCode().value(), failure);
        } catch (RestClientException failure) {
            // No answer at all: no network, DNS failed, or a timeout.
            throw new ExternalApiException("Could not reach Spoonacular.", failure);
        }
    }

    /** A choice counts only if the cook picked something real. */
    private static boolean hasValue(String choice) {
        return choice != null && !choice.isBlank() && !choice.equalsIgnoreCase("none");
    }

    /**
     * Turns Spoonacular's HTTP status into one of our own errors, so nothing
     * above this class has to know what status codes they use.
     */
    private RuntimeException translate(int status, Exception cause) {
        if (status == 402) {
            // 402 Payment Required is how Spoonacular reports a spent quota.
            return new ApiLimitReachedException();
        }
        if (status == 404) {
            // Only getRecipe can produce this - the search endpoint answers
            // 200 with an empty list rather than 404.
            return new RecipeNotFoundException("That recipe could not be found.");
        }
        if (status == 401 || status == 403) {
            return new ApiKeyMissingException(
                    "Spoonacular rejected our API key. Check SPOONACULAR_API_KEY in .env.");
        }
        return new ExternalApiException("Spoonacular returned HTTP " + status + ".", cause);
    }
}
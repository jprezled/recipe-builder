package com.recipebuilder.service;

import java.lang.reflect.Method;

import org.springframework.cache.interceptor.KeyGenerator;
import org.springframework.stereotype.Component;

import com.recipebuilder.dto.DietaryRestrictions;

/**
 * Decides what the cache calls a search.
 *
 * Spring's default would use the raw text, so "eggs,milk" and "milk,eggs" would
 * be stored twice and each would spend a Spoonacular point. Running the text
 * through IngredientList.normalise first makes them one entry.
 *
 * This is a named class rather than a SpEL expression in the @Cacheable
 * annotation because sorting a list is not something a one-line expression can
 * do readably - and a class can be tested on its own.
 */
@Component("ingredientsCacheKey")
public class IngredientsCacheKeyGenerator implements KeyGenerator {

    /**
     * @param target the object whose method was called (unused)
     * @param method the method that was called (unused)
     * @param params its arguments - params[0] is the ingredient text
     * @return the cleaned, sorted list, used as the cache key
     */
    @Override
    public Object generate(Object target, Method method, Object... params) {
        if (params.length == 0 || params[0] == null) {
            return "";
        }
        String ingredients = IngredientList.normalise(String.valueOf(params[0]));

        // The cook's choices are part of the search, so they are part of the key.
        // Without them a Vegan search would be answered from a saved unfiltered one.
        String diet = "none";
        String allergies = "none";
        if (params.length > 1 && params[1] instanceof DietaryRestrictions choices) {
            diet = choices.diet();
            allergies = choices.allergies();
        }

        return ingredients + "|" + diet + "|" + allergies;
    }
}

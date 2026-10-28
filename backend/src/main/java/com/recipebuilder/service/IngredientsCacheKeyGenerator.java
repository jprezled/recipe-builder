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
 * through IngredientList.normalise first makes them one entry. The diet and
 * intolerances are part of the question too, so they are part of the key.
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
     * @param params params[0] is the ingredient text, params[1] the diet and intolerances
     * @return the cleaned ingredients alone when nothing is filtered, otherwise
     *         the cleaned ingredients plus the cleaned filters
     */
    @Override
    public Object generate(Object target, Method method, Object... params) {
        if (params.length == 0 || params[0] == null) {
            return "";
        }
        String ingredients = IngredientList.normalise(String.valueOf(params[0]));

        // Without the filters a vegetarian search would be answered from a saved
        // unfiltered one. Cleaned the same way the service cleans them.
        DietaryRestrictions raw = null;
        if (params.length > 1 && params[1] instanceof DietaryRestrictions found) {
            raw = found;
        }
        DietaryRestrictions choices = RestrictionsCleaner.clean(raw);

        // An unfiltered search keys on the ingredients alone, so entries cached
        // before restrictions existed are still found.
        if (choices.diet().equals(RestrictionsCleaner.NONE)
                && choices.intolerances().equals(RestrictionsCleaner.NONE)) {
            return ingredients;
        }

        return ingredients + "|" + choices.diet() + "|" + choices.intolerances();
    }
}
package com.recipebuilder.service;

import static org.assertj.core.api.Assertions.assertThat;
import org.junit.jupiter.api.Test;

import com.recipebuilder.dto.DietaryRestrictions;

/**
 * RB-171: the cache files an answer under a name, and the name has to describe
 * the whole question. The restrictions are part of the question now, so they
 * are part of the name.
 */
class IngredientsCacheKeyGeneratorTest {

    private final IngredientsCacheKeyGenerator generator =
            new IngredientsCacheKeyGenerator();

    // generate() is called reflectively by Spring, so the arguments arrive as a
    // loose Object[] and this builds them the same way.
    private Object keyFor(String ingredients, DietaryRestrictions choices) {
        return generator.generate(null, null, new Object[]{ingredients, choices});
    }

    @Test
    void noRestrictionsKeysOnTheIngredientsAlone() {
        // Anything cached before restrictions existed must still be found, so
        // this name may not change.
        assertThat(keyFor("milk,eggs", new DietaryRestrictions("none", "none")))
                .isEqualTo("eggs,milk");
    }

    @Test
    void aMissingRestrictionsArgumentIsTreatedAsNoRestrictions() {
        assertThat(generator.generate(null, null, new Object[]{"milk,eggs"}))
                .isEqualTo("eggs,milk");
    }

    @Test
    void twoDietsAreTwoDifferentNames() {
        assertThat(keyFor("tomato", new DietaryRestrictions("vegan", "none")))
                .isNotEqualTo(keyFor("tomato", new DietaryRestrictions("vegetarian", "none")));
    }

    @Test
    void allergyOrderDoesNotMatter() {
        assertThat(keyFor("tomato", new DietaryRestrictions("vegetarian", "peanut,dairy")))
                .isEqualTo(keyFor("tomato", new DietaryRestrictions("vegetarian", "dairy,peanut")));
    }

    @Test
    void capitalisationAndSpacingDoNotMakeANewName() {
        assertThat(keyFor("tomato", new DietaryRestrictions(" Vegetarian ", " Dairy , Peanut ")))
                .isEqualTo(keyFor("tomato", new DietaryRestrictions("vegetarian", "dairy,peanut")));
    }
}
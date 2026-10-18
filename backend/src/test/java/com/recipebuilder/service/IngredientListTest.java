package com.recipebuilder.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The cache key and the text we send Spoonacular both come from here, so this
 * is the class that decides whether two searches are "the same search".
 */
class IngredientListTest {

    @Test
    void trimsAndLowercasesEachIngredient() {
        assertThat(IngredientList.normalise(" Eggs , MILK ")).isEqualTo("eggs,milk");
    }

    @Test
    void sortsSoOrderDoesNotMatter() {
        // THE point of this class. Without sorting these are two cache entries
        // for one search, and that costs two of our 150 daily points.
        assertThat(IngredientList.normalise("milk,eggs"))
                .isEqualTo(IngredientList.normalise("eggs,milk"));
    }

    @Test
    void dropsEmptyPieces() {
        assertThat(IngredientList.normalise("eggs,,  ,milk")).isEqualTo("eggs,milk");
    }

    @Test
    void dropsDuplicates() {
        assertThat(IngredientList.normalise("eggs, Eggs ,milk")).isEqualTo("eggs,milk");
    }

    @Test
    void blankInputBecomesEmpty() {
        assertThat(IngredientList.normalise("")).isEmpty();
        assertThat(IngredientList.normalise("   ")).isEmpty();
        assertThat(IngredientList.normalise(",,,")).isEmpty();
        assertThat(IngredientList.normalise(null)).isEmpty();
    }

    @Test
    void singleIngredientStillWorks() {
        assertThat(IngredientList.normalise("apple")).isEqualTo("apple");
    }

    @Test
    void keepsAccentedCharactersIntact() {
        // Review Focus: a cook typing "jalapeño" or "crème fraîche" must get
        // those exact characters through to Spoonacular and the cache key.
        // toLowerCase() on a non-ASCII string is where this would break.
        assertThat(IngredientList.normalise("Jalapeño, Crème Fraîche"))
                .isEqualTo("crème fraîche,jalapeño");
    }
}

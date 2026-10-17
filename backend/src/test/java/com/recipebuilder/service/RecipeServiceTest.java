package com.recipebuilder.service;

import com.recipebuilder.client.SpoonacularClient;
import com.recipebuilder.client.dto.SpoonacularSearchResult;
import com.recipebuilder.dto.RecipeSummaryDto;
import com.recipebuilder.exception.InvalidInputException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.anyString;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * RB-37: we produce our own object with the right values.
 *
 * The client is mocked, so these tests describe the conversion only - no HTTP,
 * no API key, no quota.
 */
@ExtendWith(MockitoExtension.class)
class RecipeServiceTest {

    @Mock
    private SpoonacularClient client;

    @InjectMocks
    private RecipeService service;

    /** A result in Spoonacular's shape, as the client would hand it over. */
    private static SpoonacularSearchResult theirResult() {
        return new SpoonacularSearchResult(
                716433L,
                "Easiest Breakfast Ever: Sunny Fruit Parfait",
                "https://img.spoonacular.com/recipes/716433-312x231.jpg",
                1,
                3,
                List.of(new SpoonacularSearchResult.Ingredient("apple")),
                List.of(new SpoonacularSearchResult.Ingredient("raisins"),
                        new SpoonacularSearchResult.Ingredient("sunflower seeds"),
                        new SpoonacularSearchResult.Ingredient("yogurt")));
    }

    @Test
    void theirFieldsBecomeOursWithTheRightValues() {
        when(client.searchByIngredients(anyString(), anyInt()))
                .thenReturn(List.of(theirResult()));

        List<RecipeSummaryDto> ours = service.searchByIngredient("apple");

        assertThat(ours).hasSize(1);
        RecipeSummaryDto recipe = ours.get(0);
        assertThat(recipe.id()).isEqualTo(716433L);
        assertThat(recipe.title()).isEqualTo("Easiest Breakfast Ever: Sunny Fruit Parfait");
        assertThat(recipe.imageUrl()).isEqualTo("https://img.spoonacular.com/recipes/716433-312x231.jpg");
        // Their "usedIngredientCount" is our "ingredientsYouHave".
        assertThat(recipe.ingredientsYouHave()).isEqualTo(1);
        // Their "missedIngredientCount" is our "ingredientsYouNeed".
        assertThat(recipe.ingredientsYouNeed()).isEqualTo(3);
    }

    @Test
    void weAskSpoonacularForTheIngredientTheUserTyped() {
        when(client.searchByIngredients(anyString(), anyInt())).thenReturn(List.of());

        service.searchByIngredient("apple");

        verify(client).searchByIngredients(eq("apple"), anyInt());
    }

    @Test
    void noMatchesGivesAnEmptyListNotNull() {
        when(client.searchByIngredients(anyString(), anyInt())).thenReturn(List.of());

        assertThat(service.searchByIngredient("unobtanium")).isNotNull().isEmpty();
    }

    // ---- RB-85: refuse input we cannot search with -----------------------

    @Test
    void blankIngredientIsRejectedWithoutSpendingAPoint() {
        assertThatExceptionOfType(InvalidInputException.class)
                .isThrownBy(() -> service.searchByIngredient("   "));

        // The point of the test: no quota is spent on a meaningless search.
        verifyNoInteractions(client);
    }

    @Test
    void emptyIngredientIsRejectedWithoutSpendingAPoint() {
        assertThatExceptionOfType(InvalidInputException.class)
                .isThrownBy(() -> service.searchByIngredient(""));

        verifyNoInteractions(client);
    }
}

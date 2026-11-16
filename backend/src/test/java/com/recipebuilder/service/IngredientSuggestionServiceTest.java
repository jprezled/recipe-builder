package com.recipebuilder.service;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.recipebuilder.client.SpoonacularClient;
import com.recipebuilder.client.dto.SpoonacularIngredientSuggestion;
import com.recipebuilder.dto.IngredientSuggestionDto;

class IngredientSuggestionServiceTest {

    private SpoonacularClient client;
    private IngredientSuggestionService service;

    @BeforeEach
    void setUp() {
        client = mock(SpoonacularClient.class);
        service = new IngredientSuggestionService(client);
    }

    @Test
    void oneLetterIsRefusedWithoutCallingSpoonacular() {
        assertThat(service.suggest("y")).isEmpty();

        verifyNoInteractions(client);
    }

    @Test
    void blankAndNullAreRefusedWithoutCallingSpoonacular() {
        assertThat(service.suggest("   ")).isEmpty();
        assertThat(service.suggest(null)).isEmpty();

        verifyNoInteractions(client);
    }

    @Test
    void queryIsTrimmedAndLowercasedBeforeCallingSpoonacular() {
        when(client.suggestIngredients("to", 10))
                .thenReturn(List.of());

        assertThat(service.suggest(" To ")).isEmpty();

        verify(client).suggestIngredients("to", 10);
    }

    @Test
    void suggestionsKeepTheirOriginalRelevanceOrder() {
        when(client.suggestIngredients("to", 10))
                .thenReturn(List.of(
                        new SpoonacularIngredientSuggestion("tofu", "tofu.png"),
                        new SpoonacularIngredientSuggestion("toast", "toast.jpg"),
                        new SpoonacularIngredientSuggestion("tonic water", "soda-can.jpg"),
                        new SpoonacularIngredientSuggestion("tomato", "tomato.png")));

        assertThat(service.suggest("to"))
                .extracting(IngredientSuggestionDto::name)
                .containsExactly("tofu", "toast", "tonic water", "tomato");
    }

    @Test
    void imageFilenameBecomesACompleteUrl() {
        when(client.suggestIngredients("yuz", 10))
                .thenReturn(List.of(
                        new SpoonacularIngredientSuggestion("yuzu", "yuzu.png")));

        assertThat(service.suggest("yuz"))
                .containsExactly(new IngredientSuggestionDto(
                        "yuzu",
                        "https://img.spoonacular.com/ingredients_100x100/yuzu.png"));
    }

    @Test
    void missingImagesBecomeNullRatherThanBrokenUrls() {
        when(client.suggestIngredients("to", 10))
                .thenReturn(List.of(
                        new SpoonacularIngredientSuggestion("tofu", null),
                        new SpoonacularIngredientSuggestion("toast", "   ")));

        assertThat(service.suggest("to"))
                .containsExactly(
                        new IngredientSuggestionDto("tofu", null),
                        new IngredientSuggestionDto("toast", null));
    }

    @Test
    void noSuggestionsReturnsAnEmptyList() {
        when(client.suggestIngredients("zzzzzz", 10))
                .thenReturn(List.of());

        assertThat(service.suggest("zzzzzz")).isEmpty();
    }
}
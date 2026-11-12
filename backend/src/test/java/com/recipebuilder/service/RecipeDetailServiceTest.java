package com.recipebuilder.service;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;

import com.recipebuilder.client.SpoonacularClient;
import com.recipebuilder.client.dto.SpoonacularRecipeInformation;
import com.recipebuilder.dto.RecipeDetailDto;
import com.recipebuilder.exception.InvalidInputException;

/**
 * RB-176: one recipe in Spoonacular's shape becomes one recipe in ours.
 *
 * The client is mocked, so these describe the conversion only - no HTTP, no
 * API key, no quota. The field mapping itself is fixed by
 * docs/recipe-detail-contract.md.
 */
@ExtendWith(MockitoExtension.class)
class RecipeDetailServiceTest {

    @Mock
    private SpoonacularClient client;

    @InjectMocks
    private RecipeService service;

    /**
     * A recipe in THEIR shape, as the client would hand it over. The values
     * are the real ones from stubs/recipe-information.json.
     */
    private static SpoonacularRecipeInformation theirRecipe(
            List<SpoonacularRecipeInformation.ExtendedIngredient> ingredients,
            List<SpoonacularRecipeInformation.AnalyzedInstruction> instructions) {

        return new SpoonacularRecipeInformation(
                660101L,
                "Simple Garlic Pasta",
                "https://img.spoonacular.com/recipes/660101-556x370.jpg",
                1,
                45,
                true,    // vegetarian
                true,    // vegan
                false,   // glutenFree
                true,    // dairyFree
                ingredients,
                instructions);
    }

    private static SpoonacularRecipeInformation theirFullRecipe() {
        return theirRecipe(
                List.of(new SpoonacularRecipeInformation.ExtendedIngredient("dried chili pepper", "2 whole dried chili pepper", "Produce"),
                        new SpoonacularRecipeInformation.ExtendedIngredient("garlic", "3 cloves of garlic (minced)", "Produce"),
                        new SpoonacularRecipeInformation.ExtendedIngredient("olive oil", "3 tablespoons olive oil", "Oil, Vinegar, Salad Dressing")),
                List.of(new SpoonacularRecipeInformation.AnalyzedInstruction(
                        List.of(new SpoonacularRecipeInformation.Step(1, "Important: timing is everything"),
                                new SpoonacularRecipeInformation.Step(2, "Start with boiling water in a large pot."),
                                new SpoonacularRecipeInformation.Step(3, "While you are boiling, mince the garlic")))));
    }

    @Test
    void theirFieldsBecomeOursWithTheRightValues() {
        when(client.getRecipe(660101L)).thenReturn(theirFullRecipe());

        RecipeDetailDto ours = service.getRecipe(660101L);

        assertThat(ours.id()).isEqualTo(660101L);
        assertThat(ours.title()).isEqualTo("Simple Garlic Pasta");
        // Their "image" is our "imageUrl".
        assertThat(ours.imageUrl()).isEqualTo("https://img.spoonacular.com/recipes/660101-556x370.jpg");
        assertThat(ours.servings()).isEqualTo(1);
        assertThat(ours.readyInMinutes()).isEqualTo(45);

        assertThat(ours.diets().vegetarian()).isTrue();
        assertThat(ours.diets().vegan()).isTrue();
        assertThat(ours.diets().glutenFree()).isFalse();
        assertThat(ours.diets().dairyFree()).isTrue();
    }

    @Test
    void ingredientsComeFromTheWholeOriginalPhrase() {
        when(client.getRecipe(660101L)).thenReturn(theirFullRecipe());

        RecipeDetailDto ours = service.getRecipe(660101L);

        assertThat(ours.ingredients()).containsExactly(
                "2 whole dried chili pepper",
                "3 cloves of garlic (minced)",
                "3 tablespoons olive oil");
    }

    @Test
    void stepsComeFromTheStructuredListInOrder() {
        when(client.getRecipe(660101L)).thenReturn(theirFullRecipe());

        RecipeDetailDto ours = service.getRecipe(660101L);

        assertThat(ours.steps()).containsExactly(
                "Important: timing is everything",
                "Start with boiling water in a large pot.",
                "While you are boiling, mince the garlic");
    }

    /**
     * A recipe with no instruction block at all. Reading position zero of that
     * list without checking is the mistake this test exists to catch, and it
     * throws on a perfectly ordinary recipe.
     */
    @Test
    void aRecipeWithNoInstructionsGivesAnEmptyStepList() {
        when(client.getRecipe(660101L)).thenReturn(theirRecipe(List.of(), List.of()));

        RecipeDetailDto ours = service.getRecipe(660101L);

        assertThat(ours.steps()).isEmpty();
        // Still a successful conversion, not an error.
        assertThat(ours.title()).isEqualTo("Simple Garlic Pasta");
    }

    @Test
    void aRecipeWithNoIngredientsGivesAnEmptyIngredientList() {
        when(client.getRecipe(660101L)).thenReturn(theirRecipe(List.of(), List.of()));

        RecipeDetailDto ours = service.getRecipe(660101L);

        assertThat(ours.ingredients()).isEmpty();
    }

    /**
     * Refused before the call, so a nonsense id cannot spend one of our 150
     * daily points.
     */
    @Test
    void anIdOfZeroOrLessIsRefusedWithoutCallingTheClient() {
        assertThatExceptionOfType(InvalidInputException.class)
                .isThrownBy(() -> service.getRecipe(0L))
                .withMessage("That recipe link is not valid.");

        assertThatExceptionOfType(InvalidInputException.class)
                .isThrownBy(() -> service.getRecipe(-5L));

        verifyNoInteractions(client);
    }
}

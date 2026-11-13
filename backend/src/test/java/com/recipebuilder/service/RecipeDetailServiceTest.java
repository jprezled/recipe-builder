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
import com.recipebuilder.dto.ShoppingItemDto;
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
                instructions,
                null );
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
    void aRecipeWithNoIngredientListAtAllGivesEmptyLists() {
        when(client.getRecipe(660101L)).thenReturn(theirRecipe(null, List.of()));

        RecipeDetailDto ours = service.getRecipe(660101L);

        assertThat(ours.ingredients()).isEmpty();
        assertThat(ours.allIngredients()).isEmpty();
    }
    @Test
    void aRecipeWithNoIngredientsGivesAnEmptyIngredientList() {
        when(client.getRecipe(660101L)).thenReturn(theirRecipe(List.of(), List.of()));

        RecipeDetailDto ours = service.getRecipe(660101L);

        assertThat(ours.ingredients()).isEmpty();
    }
    /**
    * RB-203: every ingredient comes back with its name, its readable line and
    * its aisle. All of them, not a filtered subset.
    */
    @Test
    void everyIngredientComesBackWithItsAisle() {
        when(client.getRecipe(660101L)).thenReturn(theirFullRecipe());

        RecipeDetailDto ours = service.getRecipe(660101L);

        assertThat(ours.allIngredients()).containsExactly(
                new ShoppingItemDto("dried chili pepper", "2 whole dried chili pepper", "Produce"),
                new ShoppingItemDto("garlic", "3 cloves of garlic (minced)", "Produce"),
                new ShoppingItemDto("olive oil", "3 tablespoons olive oil", "Oil, Vinegar, Salad Dressing"));
    }

    /**
     * Their aisle is free text and sometimes empty. The fallback happens here
     * in the service so every screen sees the same thing.
     */
    @Test
    void anIngredientWithNoAisleLandsInOther() {
        when(client.getRecipe(660101L)).thenReturn(theirRecipe(
                List.of(new SpoonacularRecipeInformation.ExtendedIngredient("salt", "1 pinch of salt", null)),
                List.of()));

        RecipeDetailDto ours = service.getRecipe(660101L);

        assertThat(ours.allIngredients()).containsExactly(
                new ShoppingItemDto("salt", "1 pinch of salt", "Other"));
    }

    @Test
    void aRecipeWithNoIngredientsGivesAnEmptyAllIngredientsList() {
        when(client.getRecipe(660101L)).thenReturn(theirRecipe(List.of(), List.of()));

        RecipeDetailDto ours = service.getRecipe(660101L);

        assertThat(ours.allIngredients()).isEmpty();
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

    @Test
    void theSixNutritionFiguresArePickedOutByExactName() {
        SpoonacularRecipeInformation.Nutrition nutrition =
                new SpoonacularRecipeInformation.Nutrition(List.of(
                        new SpoonacularRecipeInformation.Nutrient(
                                "Fat", 13.424, "g"),
                        new SpoonacularRecipeInformation.Nutrient(
                                "Saturated Fat", 5.234, "g"),
                        new SpoonacularRecipeInformation.Nutrient(
                                "Net Carbohydrates", 60.0, "g"),
                        new SpoonacularRecipeInformation.Nutrient(
                                "Carbohydrates", 69.024, "g"),
                        new SpoonacularRecipeInformation.Nutrient(
                                "Calories", 591.126, "kcal"),
                        new SpoonacularRecipeInformation.Nutrient(
                                "Sugar", 2.544, "g"),
                        new SpoonacularRecipeInformation.Nutrient(
                                "Protein", 18.104, "g"),
                        new SpoonacularRecipeInformation.Nutrient(
                                "Sodium", 400.0, "mg")));

        SpoonacularRecipeInformation recipe =
                new SpoonacularRecipeInformation(
                        660101L,
                        "Simple Garlic Pasta",
                        "https://img.spoonacular.com/recipes/660101-556x370.jpg",
                        2,
                        45,
                        true,
                        true,
                        false,
                        true,
                        List.of(),
                        List.of(),
                        nutrition);

        when(client.getRecipe(660101L)).thenReturn(recipe);

        RecipeDetailDto ours = service.getRecipe(660101L);

        assertThat(ours.nutrition()).isNotNull();
        assertThat(ours.nutrition().calories()).isEqualTo(591.13);
        assertThat(ours.nutrition().fat()).isEqualTo(13.42);
        assertThat(ours.nutrition().saturatedFat()).isEqualTo(5.23);
        assertThat(ours.nutrition().carbohydrates()).isEqualTo(69.02);
        assertThat(ours.nutrition().sugar()).isEqualTo(2.54);
        assertThat(ours.nutrition().protein()).isEqualTo(18.1);
    }

    @Test
    void aRecipeWithNoNutritionBlockStillConverts() {
        when(client.getRecipe(660101L)).thenReturn(theirFullRecipe());

        RecipeDetailDto ours = service.getRecipe(660101L);

        assertThat(ours.title()).isEqualTo("Simple Garlic Pasta");
        assertThat(ours.nutrition()).isNull();
    }


}

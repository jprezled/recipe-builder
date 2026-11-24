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
                195.54,   // RB-193: price per serving, in cents
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

    /**
     * RB-193b: a recipe at a chosen price and serving count, so the
     * arithmetic can be checked at more than one serving.
     */
    private static SpoonacularRecipeInformation theirRecipeWithPrice(
            double pricePerServingInCents, int servings) {

        return new SpoonacularRecipeInformation(
                660101L,
                "Simple Garlic Pasta",
                "https://img.spoonacular.com/recipes/660101-556x370.jpg",
                servings,
                45,
                pricePerServingInCents,
                true,
                true,
                false,
                true,
                List.of(),
                List.of(),
                null);
    }

    /**
     * RB-193b: Spoonacular reports pricePerServing in CENTS - 195.54 is $1.96.
     * Converting in the service means every screen receives dollars and only
     * one place can get it wrong. See docs/cost-contract.md.
     */
    @Test
    void centsBecomeDollarsAndTheTotalIsPerServingTimesServings() {
        when(client.getRecipe(660101L)).thenReturn(theirRecipeWithPrice(195.54, 2));

        RecipeDetailDto ours = service.getRecipe(660101L);

        assertThat(ours.costPerServing()).isEqualTo(1.96);
        assertThat(ours.costTotal()).isEqualTo(3.92);
    }

    @Test
    void theTotalFollowsTheServingCountRatherThanBeingTheirFigure() {
        // Four servings is twice the total of two at the same per-serving
        // price. Passing their number straight through would look right on a
        // one-serving recipe and be wrong on every other.
        when(client.getRecipe(660101L)).thenReturn(theirRecipeWithPrice(195.54, 4));

        RecipeDetailDto ours = service.getRecipe(660101L);

        assertThat(ours.costPerServing()).isEqualTo(1.96);
        assertThat(ours.costTotal()).isEqualTo(7.84);
    }

    @Test
    void aRecipeWithNoPriceCostsNothingRatherThanThrowing() {
        when(client.getRecipe(660101L)).thenReturn(theirRecipeWithPrice(0.0, 2));

        RecipeDetailDto ours = service.getRecipe(660101L);

        assertThat(ours.costPerServing()).isEqualTo(0.0);
        assertThat(ours.costTotal()).isEqualTo(0.0);
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
    void theLabelRowsArePickedOutByExactNameInPrintedOrder() {
        // Sent out of order on purpose, with Net Carbohydrates as a near-miss name.
        RecipeDetailDto ours = detailWithNutrients(
                new SpoonacularRecipeInformation.Nutrient("Protein", 18.104, "g", 36.21),
                new SpoonacularRecipeInformation.Nutrient("Calories", 591.126, "kcal", 29.56),
                new SpoonacularRecipeInformation.Nutrient("Net Carbohydrates", 60.0, "g", 21.82),
                new SpoonacularRecipeInformation.Nutrient("Carbohydrates", 69.024, "g", 23.01),
                new SpoonacularRecipeInformation.Nutrient("Sugar", 2.544, "g", 2.83),
                new SpoonacularRecipeInformation.Nutrient("Saturated Fat", 5.234, "g", 32.71),
                new SpoonacularRecipeInformation.Nutrient("Sodium", 400.0, "mg", 17.39),
                new SpoonacularRecipeInformation.Nutrient("Fat", 13.424, "g", 20.65));

        assertThat(ours.nutrition().calories()).isEqualTo(591.13);
        assertThat(ours.nutrition().rows())
                .extracting(RecipeDetailDto.NutritionRow::label)
                .containsExactly("Total Fat", "Saturated Fat", "Sodium",
                        "Total Carbohydrate", "Total Sugars", "Protein");
        assertThat(rowLabelled(ours, "Total Fat").amount()).isEqualTo(13.42);
        assertThat(rowLabelled(ours, "Total Carbohydrate").amount()).isEqualTo(69.02);
        assertThat(rowLabelled(ours, "Sodium").unit()).isEqualTo("mg");
    }

    @Test
    void aRowIsMatchedByItsWholeNameNeverAPrefix() {
        // Only Saturated Fat is sent. A startsWith/contains match would wrongly
        // build a "Total Fat" row out of it.
        RecipeDetailDto ours = detailWithNutrients(
                new SpoonacularRecipeInformation.Nutrient("Saturated Fat", 5.234, "g", 32.71));

        assertThat(ours.nutrition().rows())
                .extracting(RecipeDetailDto.NutritionRow::label)
                .containsExactly("Saturated Fat");
        assertThat(rowLabelled(ours, "Saturated Fat").amount()).isEqualTo(5.23);
    }

    @Test
    void theRowsALabelPrintsNoPercentForComeBackBlank() {
        // Spoonacular sends a percentage on all four; the label prints only one.
        RecipeDetailDto ours = detailWithNutrients(
                new SpoonacularRecipeInformation.Nutrient("Fat", 13.424, "g", 20.65),
                new SpoonacularRecipeInformation.Nutrient("Trans Fat", 0.1, "g", 1.0),
                new SpoonacularRecipeInformation.Nutrient("Sugar", 2.544, "g", 2.83),
                new SpoonacularRecipeInformation.Nutrient("Protein", 18.104, "g", 36.21));

        assertThat(rowLabelled(ours, "Total Fat").percentDailyValue()).isEqualTo(20.65);
        assertThat(rowLabelled(ours, "Trans Fat").percentDailyValue()).isNull();
        assertThat(rowLabelled(ours, "Total Sugars").percentDailyValue()).isNull();
        assertThat(rowLabelled(ours, "Protein").percentDailyValue()).isNull();
    }

    @Test
    void rowsAreIndentedUnderTheirParentRow() {
        RecipeDetailDto ours = detailWithNutrients(
                new SpoonacularRecipeInformation.Nutrient("Fat", 13.424, "g", 20.65),
                new SpoonacularRecipeInformation.Nutrient("Saturated Fat", 5.234, "g", 32.71),
                new SpoonacularRecipeInformation.Nutrient("Carbohydrates", 69.024, "g", 23.01),
                new SpoonacularRecipeInformation.Nutrient("Fiber", 3.1, "g", 12.4),
                new SpoonacularRecipeInformation.Nutrient("Sugar", 2.544, "g", 2.83),
                new SpoonacularRecipeInformation.Nutrient("Added Sugars", 1.0, "g", 2.0));

        assertThat(rowLabelled(ours, "Total Fat").indent()).isEqualTo(0);
        assertThat(rowLabelled(ours, "Saturated Fat").indent()).isEqualTo(1);
        assertThat(rowLabelled(ours, "Total Carbohydrate").indent()).isEqualTo(0);
        assertThat(rowLabelled(ours, "Dietary Fiber").indent()).isEqualTo(1);
        assertThat(rowLabelled(ours, "Total Sugars").indent()).isEqualTo(1);
        assertThat(rowLabelled(ours, "Includes Added Sugars").indent()).isEqualTo(2);
    }

    @Test
    void aNutrientTheyDidNotSendIsLeftOffNotPrintedAsZero() {
        // No Fiber in the reply.
        RecipeDetailDto ours = detailWithNutrients(
                new SpoonacularRecipeInformation.Nutrient("Carbohydrates", 69.024, "g", 23.01),
                new SpoonacularRecipeInformation.Nutrient("Sugar", 2.544, "g", 2.83));

        assertThat(ours.nutrition().rows())
                .extracting(RecipeDetailDto.NutritionRow::label)
                .containsExactly("Total Carbohydrate", "Total Sugars");
    }

    /** RB-277: runs a recipe carrying just these nutrients through the service. */
    private RecipeDetailDto detailWithNutrients(SpoonacularRecipeInformation.Nutrient... nutrients) {
        SpoonacularRecipeInformation recipe = new SpoonacularRecipeInformation(
                660101L, "Simple Garlic Pasta",
                "https://img.spoonacular.com/recipes/660101-556x370.jpg",
                2, 45, 195.54, true, true, false, true,
                List.of(), List.of(),
                new SpoonacularRecipeInformation.Nutrition(List.of(nutrients)));

        when(client.getRecipe(660101L)).thenReturn(recipe);

        return service.getRecipe(660101L);
    }

    /** RB-277: the one row with this label; fails the test if there is none. */
    private static RecipeDetailDto.NutritionRow rowLabelled(RecipeDetailDto ours, String label) {
        return ours.nutrition().rows().stream()
                .filter(row -> row.label().equals(label))
                .findFirst()
                .orElseThrow(() -> new AssertionError("no row labelled " + label));
    }

    @Test
    void aRecipeWithNoNutritionBlockStillConverts() {
        when(client.getRecipe(660101L)).thenReturn(theirFullRecipe());

        RecipeDetailDto ours = service.getRecipe(660101L);

        assertThat(ours.title()).isEqualTo("Simple Garlic Pasta");
        assertThat(ours.nutrition()).isNull();
    }


}

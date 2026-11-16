package com.recipebuilder.service;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;

import com.recipebuilder.client.SpoonacularClient;
import com.recipebuilder.client.dto.SpoonacularPriceBreakdown;
import com.recipebuilder.dto.RecipeCostDto;

/**
 * RB-193d: what the cook still has to buy.
 *
 * The arithmetic is SUBTRACTION, not addition - total minus what they already
 * have. docs/cost-contract.md, Mistake 1: their price list gives names and no
 * ids, and the names differ between endpoints, so an ingredient that fails to
 * match must make the estimate slightly HIGH rather than silently cheap.
 */
@ExtendWith(MockitoExtension.class)
class RecipeCostServiceTest {

    @Mock
    private SpoonacularClient client;

    @InjectMocks
    private RecipeService service;

    /** Their reply: 392 cents total, three ingredients. */
    private static SpoonacularPriceBreakdown theirPrices() {
        return new SpoonacularPriceBreakdown(392.0, 196.0, List.of(
                new SpoonacularPriceBreakdown.PricedIngredient("garlic", 20.0),
                new SpoonacularPriceBreakdown.PricedIngredient("olive oil", 110.0),
                new SpoonacularPriceBreakdown.PricedIngredient("spaghettini", 262.0)));
    }

    @Test
    void centsBecomeDollarsThroughout() {
        when(client.getPriceBreakdown(660101L)).thenReturn(theirPrices());

        RecipeCostDto cost = service.getRecipeCost(660101L, "");

        assertThat(cost.total()).isEqualTo(3.92);
        assertThat(cost.items()).extracting(RecipeCostDto.CostItem::price)
                .containsExactly(0.20, 1.10, 2.62);
    }

    @Test
    void whatTheCookHasIsSubtractedFromTheTotal() {
        when(client.getPriceBreakdown(660101L)).thenReturn(theirPrices());

        RecipeCostDto cost = service.getRecipeCost(660101L, "garlic");

        assertThat(cost.youHave()).isEqualTo(0.20);
        assertThat(cost.youNeed()).isEqualTo(3.72);
        assertThat(cost.total()).isEqualTo(3.92);
    }

    @Test
    void anEmptyPantryMeansEverythingStillHasToBeBought() {
        when(client.getPriceBreakdown(660101L)).thenReturn(theirPrices());

        RecipeCostDto cost = service.getRecipeCost(660101L, "");

        assertThat(cost.youHave()).isEqualTo(0.0);
        assertThat(cost.youNeed()).isEqualTo(3.92);
    }

    @Test
    void eachItemSaysWhetherTheCookAlreadyHasIt() {
        when(client.getPriceBreakdown(660101L)).thenReturn(theirPrices());

        RecipeCostDto cost = service.getRecipeCost(660101L, "garlic,olive oil");

        assertThat(cost.items()).extracting(
                        RecipeCostDto.CostItem::name, RecipeCostDto.CostItem::inPantry)
                .containsExactly(
                        org.assertj.core.api.Assertions.tuple("garlic", true),
                        org.assertj.core.api.Assertions.tuple("olive oil", true),
                        org.assertj.core.api.Assertions.tuple("spaghettini", false));
    }

    @Test
    void theMatchIgnoresCaseAndSurroundingSpace() {
        when(client.getPriceBreakdown(660101L)).thenReturn(theirPrices());

        RecipeCostDto cost = service.getRecipeCost(660101L, "  GARLIC , Olive Oil ");

        assertThat(cost.youHave()).isEqualTo(1.30);
    }

    /**
     * Mistake 1, pinned. Their price list says "dried basil" where the search
     * said "basil", so some pantry words will never match. The estimate must
     * come out HIGH, never low - a cook who takes too much money to the shop
     * is fine; one who takes too little is not.
     */
    @Test
    void anIngredientThatDoesNotMatchIsLeftInTheShoppingRatherThanDiscounted() {
        when(client.getPriceBreakdown(660101L)).thenReturn(theirPrices());

        RecipeCostDto cost = service.getRecipeCost(660101L, "basil");

        assertThat(cost.youHave()).isEqualTo(0.0);
        assertThat(cost.youNeed()).isEqualTo(3.92);
    }

    @Test
    void aPantryWordMatchesAnIngredientThatContainsIt() {
        // The cook types "oil"; their list says "olive oil". Matching on
        // containment is what makes a short pantry word useful at all.
        when(client.getPriceBreakdown(660101L)).thenReturn(theirPrices());

        RecipeCostDto cost = service.getRecipeCost(660101L, "oil");

        assertThat(cost.youHave()).isEqualTo(1.10);
    }
}

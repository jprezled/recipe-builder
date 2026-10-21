package com.recipebuilder.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class MatchPercentageCalculatorTest {

    @Test
    void halfTheIngredientsIsFifty() {
        assertThat(MatchPercentageCalculator.calculate(2, 2)).isEqualTo(50);
    }

    @Test
    void allOfThemIsAHundred() {
        assertThat(MatchPercentageCalculator.calculate(4, 0)).isEqualTo(100);
    }

    @Test
    void noneOfThemIsZero() {
        assertThat(MatchPercentageCalculator.calculate(0, 5)).isEqualTo(0);
    }

    @Test
    void roundsRatherThanTruncating() {
        // 4 of 6 is 66.67 - we round, so 67 not 66.
        assertThat(MatchPercentageCalculator.calculate(4, 2)).isEqualTo(67);
    }

    @Test
    void aRecipeWithNoIngredientsIsZeroNotADivisionByZero() {
        assertThat(MatchPercentageCalculator.calculate(0, 0)).isEqualTo(0);
    }

    @Test
    void neverExceedsOneHundred() {
        // The denominator is the recipe's own count, so this is bounded by
        // construction - unlike dividing by what the cook typed.
        assertThat(MatchPercentageCalculator.calculate(5, 4)).isLessThanOrEqualTo(100);
    }
}

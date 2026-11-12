package com.recipebuilder.client.dto;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * Matches Spoonacular's /recipes/{id}/information reply.
 *
 * They send about 37 top-level fields; these eleven are the ones the detail
 * page needs. Their `summary` is deliberately not among them - see
 * docs/recipe-detail-contract.md before adding it.
 *
 * Every record here ignores unknown fields, because we declare eleven of
 * their 37 and Jackson refuses the whole reply over a single field it was not
 * told about.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record SpoonacularRecipeInformation(
        long id,
        String title,
        String image,
        int servings,
        int readyInMinutes,
        boolean vegetarian,
        boolean vegan,
        boolean glutenFree,
        boolean dairyFree,
        List<ExtendedIngredient> extendedIngredients,
        List<AnalyzedInstruction> analyzedInstructions) {

    /**
    * RB-203: "name" and "aisle" joined it when the shopping list moved to
    * this page. The name is what gets matched against the cook's pantry, and
    * the aisle is the supermarket section the list groups by. Both were
    * already arriving in this reply and being dropped.
    */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ExtendedIngredient(String name, String original, String aisle) {
    }

    /**
     * The structured instructions. Spoonacular also sends a plain
     * `instructions` string, but that one is HTML; this is the only form we
     * read.
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record AnalyzedInstruction(List<Step> steps) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Step(int number, String step) {
    }
}

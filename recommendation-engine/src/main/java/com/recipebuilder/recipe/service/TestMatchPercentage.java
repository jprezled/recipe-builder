package com.recipebuilder.recipe.service;


import java.util.ArrayList;
import java.util.List;

public class TestMatchPercentage {

    public static void main(String[] args) {

        List<String> userIngredients = new ArrayList<>();
        userIngredients.add("chicken");
        userIngredients.add("rice");
        userIngredients.add("onion");

        List<String> recipeIngredients = new ArrayList<>();
        recipeIngredients.add("chicken");
        recipeIngredients.add("rice");
        recipeIngredients.add("onion");
        recipeIngredients.add("garlic");
        recipeIngredients.add("olive oil");


        MatchPercentageCalculator.calculateMatch(userIngredients, recipeIngredients);
    }

}


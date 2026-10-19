package com.recipebuilder.recipe.service;

import java.util.ArrayList;
import java.util.List;

public class MatchPercentageCalculator {

    public static void calculateMatch(List<String> userIngredientList, List<String> recipeIngredientList) {

    List<String> matchedIngredients = new ArrayList<>();
    List<String> missingIngredients = new ArrayList<>();  

        for (String recipeIngredient : recipeIngredientList) {

            boolean matchFound = false; //for each recipe ingredient check, it is false

            for (String userIngredient : userIngredientList) { // Look at every ingredient in the user's list.
                if (recipeIngredient.equalsIgnoreCase(userIngredient)) { // Does the current recipe ingredient match the current user ingredient
                    matchFound = true; //If true, recipe and user ingredient match
                    break;
                }
            }

            if (matchFound) {
                matchedIngredients.add(recipeIngredient);
            } else {
                missingIngredients.add(recipeIngredient);
            }
        }

        int matchedCount = matchedIngredients.size();
        int totalCount = recipeIngredientList.size();

        double matchPercentage = 0;

        if (totalCount > 0) { // Avoid division by zero
            matchPercentage = (matchedCount * 100.0) / totalCount;
        }

        //Testing the output of the match percentage calculator
        System.out.println("\nUser ingredients: " + userIngredientList);
        System.out.println("Recipe ingredients: " + recipeIngredientList);
        System.out.println();
        System.out.println("Matched ingredients: " + matchedCount);
        System.out.println("Total ingredients: " + totalCount);
        System.out.println("Match percentage: " + matchPercentage + "%");
        System.out.println("Missing ingredients: " + missingIngredients);
        System.out.println();

    }
  
}
    



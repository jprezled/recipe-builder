package com.recipebuilder;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import org.springframework.boot.web.client.RestTemplateBuilder; // Fixed Spring Boot package path
import com.recipebuilder.client.SpoonacularClient;
import com.recipebuilder.client.dto.SpoonacularSearchResult;



public class TestSpoonacularMatch {
   
    public static void main(String[] args) {
        System.out.println("=== STARTING LIVE SPOONACULAR INTEGRATION TEST ===");

        // 1. Set up test ingredients
        List<String> userPantry = Arrays.asList("chicken", "rice", "onion");

        // 2. Instantiate your team's client manually for this isolated test
        String mockBaseUrl = "https://api.spoonacular.com";
        
        // The client reads the real key from your root .env file automatically
        String actualApiKey = "a548c263d3194c38bae89d4a087a6ce0";
        
        //System.getenv("SPOONACULAR_API_KEY"); 

        RestTemplateBuilder builder = new RestTemplateBuilder();
        SpoonacularClient client = new SpoonacularClient(builder, mockBaseUrl, actualApiKey);

        try {
            System.out.println("Reaching out to Spoonacular API via restTemplate...");
            List<SpoonacularSearchResult> liveRecipes = client.searchByIngredients("chicken,rice,onion", 3);

            if (liveRecipes == null || liveRecipes.isEmpty()) {
                System.out.println("No matching recipes returned from the API.");
                return;
            }

            // 3. Loop through every live recipe returned by their client record
            for (SpoonacularSearchResult recipe : liveRecipes) {
                List<String> recipeIngredientList = new ArrayList<>();

                // Using record accessor syntax: recipe.usedIngredients() instead of getUsedIngredients()
                if (recipe.usedIngredients() != null) {
                    for (SpoonacularSearchResult.Ingredient ing : recipe.usedIngredients()) { 
                        recipeIngredientList.add(ing.name()); // record accessor syntax: ing.name()
                    }
                }
                if (recipe.missedIngredients() != null) {
                    for (SpoonacularSearchResult.Ingredient ing : recipe.missedIngredients()) { 
                        recipeIngredientList.add(ing.name()); 
                    }
                }

                // 4. Run your Match Calculator logic locally right here!
                System.out.println("==================================================");
                System.out.println("CALCULATING MATCH FOR: " + recipe.title().toUpperCase());
                MatchPercentageCalculator.calculateMatch(userPantry, recipeIngredientList);
            }

        } catch (Exception e) {
            System.err.println("\n[TEST FAILED] Error details: " + e.getMessage());
            e.printStackTrace();
        }

        System.out.println("=== INTEGRATION TEST COMPLETE ===");
    }


}

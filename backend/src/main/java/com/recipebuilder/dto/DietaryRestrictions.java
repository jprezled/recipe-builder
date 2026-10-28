package com.recipebuilder.dto;
import java.util.List;

/**
 * The customer's diet and allergy choices, plus the values we accept for each
 * "none"
 * 
 * 
 * 
 */
public record DietaryRestrictions (

        String diet, 
        String allergies) {

        public static final List<String> APPROVED_DIETS = List.of(
                "Gluten Free", "Ketogenic", "Vegetarian", "Lacto-Vegetarian",
            "Ovo-Vegetarian", "Vegan", "Pescetarian", "Paleo", "Primal");

        public static final List<String> APPROVED_ALLERGIES = List.of(
            "Dairy", "Egg", "Gluten", "Grain", "Peanut", "Seafood",
            "Sesame", "Shellfish", "Soy", "Sulfite", "Tree Nut", "Wheat");
}


package com.recipebuilder.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class PantryRequest {

    @NotBlank(message = "Pantry item cannot be blank")
    @Size(min = 1, max = 100, message = "Pantry item must be between 1 and 100 characters")
    private String pantry;

    public String getPantry() {
        return pantry;
    }

    public void setPantry(String pantry) {
        this.pantry = pantry;
    }

    public void cleanInput() {
        if (this.pantry != null) {
            this.pantry = this.pantry.trim().replaceAll("\\s+", " ");
        }
    }
}
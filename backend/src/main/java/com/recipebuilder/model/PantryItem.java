package com.recipebuilder.model;

public class PantryItem {
    private Long id;
    private Long userId;
    private String pantry;

    public PantryItem() {}

    public PantryItem(Long id, Long userId, String pantry) {
        this.id = id;
        this.userId = userId;
        this.pantry = pantry;
    }

    public PantryItem(Long userId, String pantry) {
        this.userId = userId;
        this.pantry = pantry;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getPantry() { return pantry; }
    public void setPantry(String pantry) { this.pantry = pantry; }
}
package com.recipebuilder.controller;

import com.recipebuilder.dto.PantryRequest;
import com.recipebuilder.model.PantryItem;
import com.recipebuilder.service.PantryService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/pantry")
public class PantryController {

    @Autowired
    private PantryService pantryService;

    @PostMapping
    public ResponseEntity<?> savePantryItem(@Valid @RequestBody PantryRequest request) {
        request.cleanInput();
        Long userId = 1L; // Hardcoded for now, can be tied to authentication later

        try {
            PantryItem saved = pantryService.savePantryItem(userId, request.getPantry());
            return ResponseEntity.ok(saved);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
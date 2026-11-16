package com.recipebuilder.service;

import com.recipebuilder.model.PantryItem;
import com.recipebuilder.repository.PantryRepository;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class PantryService {

    private final PantryRepository pantryRepository;

    public PantryService(PantryRepository pantryRepository) {
        this.pantryRepository = pantryRepository;
    }

    public PantryItem savePantryItem(Long userId, String cleanedPantryName) {
        Optional<PantryItem> existing = pantryRepository.findByUserIdAndPantryIgnoreCase(userId, cleanedPantryName);

        if (existing.isPresent()) {
            throw new IllegalArgumentException("Item already exists in your pantry.");
        }

        return pantryRepository.save(userId, cleanedPantryName);
    }
}
package com.recipebuilder.service;

import com.recipebuilder.model.PantryItem;
import com.recipebuilder.repository.PantryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class PantryService {

    @Autowired
    private PantryRepository pantryRepository;

    public PantryItem savePantryItem(Long userId, String cleanedPantryName) {
        Optional<PantryItem> existing = pantryRepository.findByUserIdAndPantryIgnoreCase(userId, cleanedPantryName);

        if (existing.isPresent()) {
            throw new IllegalArgumentException("Item already exists in your pantry.");
        }

        return pantryRepository.save(userId, cleanedPantryName);
    }
}
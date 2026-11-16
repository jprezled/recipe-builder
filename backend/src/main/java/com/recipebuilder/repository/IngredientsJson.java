package com.recipebuilder.repository;

import java.util.List;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.recipebuilder.dto.ShoppingItemDto;
/**
 * RB-262: turns a saved recipe's ingredient list into text and back.
 *
 * The list goes into one TEXT column (see V7), so something has to do the
 * conversion. Keeping it in one small class means the repository stays about
 * SQL and nothing else in the app has to know the column holds JSON.
 *
 * Both directions are deliberately forgiving. A stored list that cannot be
 * read is not worth failing a page for - the shopping list is a convenience,
 * and the fallback is to fetch it again. So a broken value answers "nothing
 * stored" rather than throwing.
 */

final class IngredientsJson {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private IngredientsJson() {
    }

    static String toText(List<ShoppingItemDto> items) {
        if (items == null || items.isEmpty()) {
            return null;
        }
        try {
            return MAPPER.writeValueAsString(items);
        } catch (JsonProcessingException cannotWrite) {
            return null;
        }
    }

    static List<ShoppingItemDto> fromText(String text) {
        if (text == null || text.isBlank()) {
            return null;
        }
        try {
            return MAPPER.readValue(text, new TypeReference<List<ShoppingItemDto>>() {
            });
        } catch (JsonProcessingException cannotRead) {
            return null;
        }
    }
}
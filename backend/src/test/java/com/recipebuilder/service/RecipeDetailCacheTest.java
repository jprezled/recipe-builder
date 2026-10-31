package com.recipebuilder.service;

import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.cache.CacheManager;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import com.recipebuilder.client.SpoonacularClient;
import com.recipebuilder.client.dto.SpoonacularRecipeInformation;

/**
 * RB-177: opening a recipe we have already opened must not spend a second
 * Spoonacular point.
 *
 * The search cache saves a point per repeated search; this one saves a point
 * per repeated recipe, and the two are counted separately because browsing
 * back to a recipe already seen is the common move on a detail page.
 *
 * Needs a real Spring context, like RecipeServiceCacheTest: @Cacheable works
 * through a generated wrapper, and a plain Mockito test calls the method
 * directly and walks straight past it.
 */
@SpringBootTest
class RecipeDetailCacheTest {

    @Autowired
    private RecipeService service;

    @MockitoBean
    private SpoonacularClient client;

    @Autowired
    private CacheManager cacheManager;

    /** A recipe in THEIR shape. Only the id matters to these tests. */
    private static SpoonacularRecipeInformation theirRecipe(long id) {
        return new SpoonacularRecipeInformation(
                id,
                "Simple Garlic Pasta",
                "https://img.spoonacular.com/recipes/660101-556x370.jpg",
                1,
                45,
                true,    // vegetarian
                true,    // vegan
                false,   // glutenFree
                true,    // dairyFree
                List.of(),
                List.of());
    }

    @BeforeEach
    void emptyTheCacheBetweenTests() {
        // The Spring context is reused across tests, so without this an
        // earlier test's entries decide whether a later one passes.
        cacheManager.getCacheNames()
                .forEach(name -> cacheManager.getCache(name).clear());
        when(client.getRecipe(anyLong())).thenReturn(theirRecipe(660101L));
    }

    @Test
    void openingTheSameRecipeTwiceAsksSpoonacularOnce() {
        service.getRecipe(660101L);
        service.getRecipe(660101L);

        verify(client, times(1)).getRecipe(anyLong());
    }

    @Test
    void twoDifferentRecipesAreTwoEntries() {
        service.getRecipe(660101L);
        service.getRecipe(716429L);

        verify(client, times(2)).getRecipe(anyLong());
    }
}

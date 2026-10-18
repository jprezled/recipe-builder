package com.recipebuilder.service;

import com.recipebuilder.client.SpoonacularClient;
import com.recipebuilder.client.dto.SpoonacularSearchResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.cache.CacheManager;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * RB-74: a repeated search must not spend another Spoonacular point.
 *
 * @Cacheable works through a Spring proxy, so unlike RecipeServiceTest this
 * needs a real Spring context - a plain Mockito test would call the method
 * directly and bypass the cache entirely.
 *
 * The client is mocked, so no HTTP happens and the only thing being counted is
 * how many times the service reaches for it.
 */
@SpringBootTest
class RecipeServiceCacheTest {

    @Autowired
    private RecipeService service;

    @MockitoBean
    private SpoonacularClient client;

    @Autowired
    private CacheManager cacheManager;

    private static final SpoonacularSearchResult A_RECIPE = new SpoonacularSearchResult(
            716433L, "Easiest Breakfast Ever: Sunny Fruit Parfait",
            "https://img.spoonacular.com/recipes/716433-312x231.jpg", 1, 3,
            List.of(new SpoonacularSearchResult.Ingredient("tomato")),
            List.of(new SpoonacularSearchResult.Ingredient("basil")));

    @BeforeEach
    void emptyTheCacheBetweenTests() {
        // The Spring context is reused across tests, so without this a later
        // test would see an earlier test's cached entries.
        cacheManager.getCacheNames()
                .forEach(name -> cacheManager.getCache(name).clear());
        when(client.searchByIngredients(anyString(), anyInt())).thenReturn(List.of(A_RECIPE));
    }

    @Test
    void searchingTheSameIngredientTwiceOnlyCallsSpoonacularOnce() {
        service.searchByIngredients("tomato");
        service.searchByIngredients("tomato");

        verify(client, times(1)).searchByIngredients(anyString(), anyInt());
    }

    @Test
    void theSecondSearchStillReturnsTheResults() {
        List<?> first = service.searchByIngredients("tomato");
        List<?> second = service.searchByIngredients("tomato");

        assertThat(second).hasSize(1).isEqualTo(first);
    }

    @Test
    void differentIngredientsAreCachedSeparately() {
        service.searchByIngredients("tomato");
        service.searchByIngredients("apple");

        verify(client, times(2)).searchByIngredients(anyString(), anyInt());
    }

    @Test
    void ingredientOrderDoesNotCreateASecondCacheEntry() {
        // The sprint 2 version of the test below. "eggs,milk" and "milk,eggs"
        // are the same search, and charging two of our 150 daily points for it
        // would pass the letter of RB-74 while defeating its purpose.
        service.searchByIngredients("eggs,milk");
        service.searchByIngredients("milk,eggs");
        service.searchByIngredients(" MILK , eggs ");

        verify(client, times(1)).searchByIngredients(anyString(), anyInt());
    }

    @Test
    void capitalisationAndSpacingHitTheSameCacheEntry() {
        // Without normalising the key these would be three separate entries and
        // three API points, which passes the letter of the story and fails its
        // point.
        service.searchByIngredients("tomato");
        service.searchByIngredients("Tomato");
        service.searchByIngredients("  tomato  ");

        verify(client, times(1)).searchByIngredients(anyString(), anyInt());
    }
}

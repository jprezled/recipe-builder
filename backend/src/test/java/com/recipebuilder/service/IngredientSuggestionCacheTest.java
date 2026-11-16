package com.recipebuilder.service;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;

import com.recipebuilder.client.SpoonacularClient;
import com.recipebuilder.client.dto.SpoonacularIngredientSuggestion;

@SpringJUnitConfig(IngredientSuggestionCacheTest.TestConfig.class)
@TestPropertySource(locations = "classpath:application.properties")
class IngredientSuggestionCacheTest {

    @Autowired
    private IngredientSuggestionService service;

    @Autowired
    private SpoonacularClient client;

    @Autowired
    private CaffeineCacheManager cacheManager;

    @BeforeEach
    void setUp() {
        reset(client);

        for (String cacheName : cacheManager.getCacheNames()) {
            cacheManager.getCache(cacheName).clear();
        }
    }

    @Test
    void differentlyFormattedQueriesShareOneCachedResult() {
        when(client.suggestIngredients("to", 10))
                .thenReturn(List.of(
                        new SpoonacularIngredientSuggestion("tofu", "tofu.png")));

        var first = service.suggest(" To ");
        var second = service.suggest("to");
        var third = service.suggest("TO");

        assertThat(first).hasSize(1);
        assertThat(second).isEqualTo(first);
        assertThat(third).isEqualTo(first);

        verify(client, times(1)).suggestIngredients("to", 10);
    }

    @Test
    void shortQueriesStillAvoidSpoonacularThroughSpring() {
        assertThat(service.suggest(null)).isEmpty();
        assertThat(service.suggest("   ")).isEmpty();
        assertThat(service.suggest(" y ")).isEmpty();

        verifyNoInteractions(client);
    }

    @Test
    void emptyResultsAreCachedToo() {
        when(client.suggestIngredients("zzzzzz", 10))
                .thenReturn(List.of());

        assertThat(service.suggest("zzzzzz")).isEmpty();
        assertThat(service.suggest(" ZZZZZZ ")).isEmpty();

        verify(client, times(1)).suggestIngredients("zzzzzz", 10);
    }

    @Configuration(proxyBeanMethods = false)
    @EnableCaching
    static class TestConfig {

        @Bean
        SpoonacularClient spoonacularClient() {
            return mock(SpoonacularClient.class);
        }

        @Bean
        IngredientSuggestionService ingredientSuggestionService(
                SpoonacularClient client) {
            return new IngredientSuggestionService(client);
        }

        @Bean
        CaffeineCacheManager cacheManager(
                @Value("${spring.cache.cache-names}") String[] cacheNames,
                @Value("${spring.cache.caffeine.spec}") String specification) {

            CaffeineCacheManager manager =
                    new CaffeineCacheManager(cacheNames);
            manager.setCacheSpecification(specification);
            return manager;
        }
    }
}
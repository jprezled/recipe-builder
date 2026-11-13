package com.recipebuilder;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import org.junit.jupiter.api.Test;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import com.recipebuilder.client.SpoonacularClient;
import com.recipebuilder.client.dto.SpoonacularSearchResult;
import com.recipebuilder.dto.DietaryRestrictions;
import com.recipebuilder.service.RecipeService;

/**
 * Searching must keep working when Postgres is not there.
 *
 * Six people share this repo and not all of them will have a database running
 * on any given evening. Search does not need one, so it should not be taken
 * down by one - only favorites should fail.
 *
 * The datasource URL below points at a port nothing listens on, so any attempt
 * to connect fails. If the context still starts and a search still returns,
 * the connection pool is opening connections lazily and the property holds.
 *
 * If this test ever starts failing, the app has gained something that connects
 * to Postgres at startup, and a teammate without a database will be unable to
 * run anything at all.
 */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:postgresql://localhost:65432/definitely_not_running",
        "spring.datasource.username=nobody",
        "spring.datasource.password=nothing"
})
class ContextStartsWithoutDatabaseTest {

    @Autowired
    private RecipeService recipeService;

    @MockitoBean
    private SpoonacularClient client;

    @Test
    void searchStillWorksWithNoDatabaseBehindIt() {
        when(client.searchByIngredients(anyString(), anyInt(), any(DietaryRestrictions.class), anyString())).thenReturn(List.of(
                new SpoonacularSearchResult(716429L, "Pasta", "http://img/1.jpg", 1, 2,
                        List.of(), List.of())));

        List<?> found = recipeService.searchByIngredients("eggs", new DietaryRestrictions("none", "none"), null);

        assertThat(found).hasSize(1);
    }
}

package com.recipebuilder;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * Smoke test: proves the Spring context starts and the build is wired correctly.
 *
 * This exists so that a red test from here on means a missing feature, not
 * broken tooling.
 */
@SpringBootTest
class RecipeBuilderApplicationTest {

    @Test
    void contextLoads() {
    }
}

package com.recipebuilder;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;

@SpringBootApplication
// Without this, every @Cacheable in the project is silently ignored - no error,
// no warning, the cache simply never happens.
@EnableCaching
public class RecipeBuilderApplication {

    public static void main(String[] args) {
        SpringApplication.run(RecipeBuilderApplication.class, args);
    }
}

package com.recipebuilder.client.dto;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

/**
 * RB-37: unknown extra fields must not cause a failure.
 *
 * Spoonacular's payload carries many fields we deliberately do not declare,
 * and they add more over time without warning. Jackson's default behaviour is
 * to throw on an unrecognised property, so without
 * @JsonIgnoreProperties(ignoreUnknown = true) a field we never asked for would
 * break the whole app.
 *
 * No Spring and no HTTP here - this is about the data classes alone.
 */
class SpoonacularSearchResultTest {

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void declaredFieldsAreRead() throws Exception {
        String json = """
                {
                  "id": 716433,
                  "title": "Easiest Breakfast Ever: Sunny Fruit Parfait",
                  "image": "https://img.spoonacular.com/recipes/716433-312x231.jpg",
                  "usedIngredientCount": 1,
                  "missedIngredientCount": 3,
                  "usedIngredients": [ { "name": "apple" } ],
                  "missedIngredients": [ { "name": "raisins" } ]
                }
                """;

        SpoonacularSearchResult result = mapper.readValue(json, SpoonacularSearchResult.class);

        assertThat(result.id()).isEqualTo(716433L);
        assertThat(result.title()).isEqualTo("Easiest Breakfast Ever: Sunny Fruit Parfait");
        assertThat(result.usedIngredientCount()).isEqualTo(1);
        assertThat(result.missedIngredientCount()).isEqualTo(3);
        assertThat(result.usedIngredients()).extracting(SpoonacularSearchResult.Ingredient::name)
                .containsExactly("apple");
    }

    @Test
    void fieldsWeNeverDeclaredAreIgnoredRatherThanThrowing() {
        // Every field below is real Spoonacular output that we do not declare,
        // plus one invented field standing in for something they add later.
        String json = """
                {
                  "id": 716433,
                  "title": "Easiest Breakfast Ever: Sunny Fruit Parfait",
                  "imageType": "jpg",
                  "likes": 93,
                  "unusedIngredients": [],
                  "somethingSpoonacularAddsNextYear": { "nested": [1, 2, 3] },
                  "usedIngredients": [
                    {
                      "name": "apple",
                      "aisle": "Produce",
                      "unitLong": "serving",
                      "extendedName": "chopped apple",
                      "meta": [ "organic", "chopped" ]
                    }
                  ]
                }
                """;

        assertThatCode(() -> mapper.readValue(json, SpoonacularSearchResult.class))
                .doesNotThrowAnyException();
    }
}

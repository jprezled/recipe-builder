# How to write a controller test

A **controller test** checks one of our own web addresses — a request comes in,
JSON goes out. No real server and no network: `MockMvc` sends fake requests
straight into the controller.

Use this for **subtask 4** (`GET /api/recipes/search`).

Follow the steps in order. Do not skip step 4.

---

## Step 1 — Create the file

```
backend/src/test/java/com/recipebuilder/controller/RecipeControllerTest.java
```

The folder `controller/` may not exist yet. Create it.

## Step 2 — Paste this skeleton in

```java
package com.recipebuilder.controller;

import com.recipebuilder.dto.RecipeSummaryDto;
import com.recipebuilder.service.RecipeService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(RecipeController.class)
class RecipeControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean                // a fake service
    private RecipeService service;

    @Test
    void nameWhatShouldHappen() throws Exception {
        // step 3 goes here
    }
}
```

Note `throws Exception` on the method — `mockMvc.perform` requires it.

Use `@MockitoBean`, not `@MockBean`. The older one is deprecated.

## Step 3 — Write the one test method

Three parts:

```java
when(service...).thenReturn(...);     // tell the fake service what to return
mockMvc.perform(get(...))             // send a fake request
       .andExpect(...)                // check status and JSON
```

### Pick ONE to start with

**A — the happy path.** Start here for subtask 4.

```java
@Test
void returnsRecipesAsJson() throws Exception {
    when(service.searchByIngredient(anyString())).thenReturn(List.of(
            new RecipeSummaryDto(716433L, "Easiest Breakfast Ever: Sunny Fruit Parfait",
                    "https://img.spoonacular.com/recipes/716433-312x231.jpg", 1, 3)));

    mockMvc.perform(get("/api/recipes/search").param("ingredient", "apple"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].id").value(716433))
            .andExpect(jsonPath("$[0].title").value("Easiest Breakfast Ever: Sunny Fruit Parfait"))
            .andExpect(jsonPath("$[0].ingredientsYouHave").value(1));
}
```

**B — an error becomes readable JSON.** Make the fake service throw.

```java
@Test
void quotaSpentReturns429() throws Exception {
    when(service.searchByIngredient(anyString())).thenThrow(new ApiLimitReachedException());

    mockMvc.perform(get("/api/recipes/search").param("ingredient", "apple"))
            .andExpect(status().isTooManyRequests())
            .andExpect(jsonPath("$.message").value(
                    "Daily recipe search limit reached. Please try again tomorrow."));
}
```

B only passes once `GlobalExceptionHandler` exists — the
`@RestControllerAdvice` that turns our exceptions into `{"message": "..."}`
plus a status code. Do A first.

## Step 4 — Run it and watch it FAIL

```bash
cd backend
./mvnw test -Dtest=RecipeControllerTest
```

It will fail to compile, because `RecipeController` does not exist yet. **That
is correct.**

> **If it passes here, stop.** Either the behaviour already existed, or your
> test is not running.

## Step 5 — Write the code that makes it pass

Create `controller/RecipeController.java` with `@RestController`, a
`@GetMapping("/api/recipes/search")` method taking `@RequestParam String
ingredient`, which calls the service and returns the result.

Keep it thin — no logic. It unpacks the request and delegates.

## Step 6 — Run it again

```bash
./mvnw test
```

Then see it for real:

```bash
./mvnw spring-boot:run
# in another terminal:
curl "http://localhost:8080/api/recipes/search?ingredient=apple"
```

---

# Reference

## Reading jsonPath

| Expression | Means |
|---|---|
| `$` | the whole response |
| `$[0]` | first item of an array |
| `$[0].title` | `title` of the first item |
| `$.message` | `message` on an object |
| `$.length()` | how many items |

## Which status for which failure

| Our exception | Status | Why |
|---|---|---|
| `InvalidInputException` | 400 | the caller sent something unusable |
| `ApiLimitReachedException` | 429 | too many requests, come back tomorrow |
| `ApiKeyMissingException` | 500 | our misconfiguration, not the user's fault |
| `ExternalApiException` | 502 | the upstream service failed |

## Debugging a failing one

```java
mockMvc.perform(get("/api/recipes/search").param("ingredient", "apple"))
        .andDo(print())        // dumps the whole request and response
        .andExpect(status().isOk());
```

## Common mistakes

- **`@MockBean` instead of `@MockitoBean`.** The first is deprecated.
- **Forgetting `throws Exception`** on the test method.
- **Naming the wrong class in `@WebMvcTest`.** Only that controller loads;
  everything else must be a `@MockitoBean`.
- **Putting logic in the controller.** If the test needs complicated setup, the
  logic belongs in the service.

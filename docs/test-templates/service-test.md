# How to write a service test

A **service test** checks business rules and data conversion — the layer
between the controller and the client. No HTTP is involved at all.

Use this for **subtask 3** (`RecipeService`, converting Spoonacular's shape
into ours).

Follow the steps in order. Do not skip step 4.

---

## Step 1 — Create the file

```
backend/src/test/java/com/recipebuilder/service/RecipeServiceTest.java
```

The folder `service/` may not exist yet. Create it.

## Step 2 — Paste this skeleton in

```java
package com.recipebuilder.service;

import com.recipebuilder.client.SpoonacularClient;
import com.recipebuilder.client.dto.SpoonacularSearchResult;
import com.recipebuilder.dto.RecipeSummaryDto;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RecipeServiceTest {

    @Mock                       // a fake client - returns whatever you tell it
    private SpoonacularClient client;

    @InjectMocks                // the real service, handed the fake above
    private RecipeService service;

    @Test
    void nameWhatShouldHappen() {
        // step 3 goes here
    }
}
```

`@Mock` goes on the dependency. `@InjectMocks` goes on the class you are
testing. Getting those backwards is the most common mistake here.

## Step 3 — Write the one test method

Three parts:

```java
when(fake...).thenReturn(...);   // tell the fake client what to return
<call the service>               // run your code
<check the outcome>              // assert
```

### Pick ONE to start with

**A — the conversion.** This is the heart of subtask 3.

```java
@Test
void convertsSpoonacularFieldsIntoOurOwn() {
    SpoonacularSearchResult theirs = new SpoonacularSearchResult(
            716433L,
            "Easiest Breakfast Ever: Sunny Fruit Parfait",
            "https://img.spoonacular.com/recipes/716433-312x231.jpg",
            1,
            3,
            List.of(new SpoonacularSearchResult.Ingredient("apple")),
            List.of(new SpoonacularSearchResult.Ingredient("raisins")));

    when(client.searchByIngredients(anyString(), anyInt())).thenReturn(List.of(theirs));

    List<RecipeSummaryDto> ours = service.searchByIngredient("apple");

    assertThat(ours).hasSize(1);
    assertThat(ours.get(0).title()).isEqualTo("Easiest Breakfast Ever: Sunny Fruit Parfait");
    assertThat(ours.get(0).ingredientsYouHave()).isEqualTo(1);
    assertThat(ours.get(0).ingredientsYouNeed()).isEqualTo(3);
}
```

**B — nothing found.**

```java
@Test
void noRecipesFoundGivesAnEmptyListNotNull() {
    when(client.searchByIngredients(anyString(), anyInt())).thenReturn(List.of());

    assertThat(service.searchByIngredient("unobtanium")).isEmpty();
}
```

**C — bad input refused without spending a point.** No `when(...)` needed here,
because the client should never be called.

```java
@Test
void blankIngredientIsRejectedWithoutCallingSpoonacular() {
    assertThatExceptionOfType(InvalidInputException.class)
            .isThrownBy(() -> service.searchByIngredient("   "));

    verifyNoInteractions(client);
}
```

That last line is what makes C worth writing. Without it you have only checked
that an exception was thrown, not that quota was saved.

## Step 4 — Run it and watch it FAIL

```bash
cd backend
./mvnw test -Dtest=RecipeServiceTest
```

It will fail to compile, because `RecipeService` and `RecipeSummaryDto` do not
exist yet. **That is correct** — it is the test telling you what to build.

> **If it passes here, stop.** Either the behaviour already existed, or your
> test is not running.

## Step 5 — Write the code that makes it pass

Create `dto/RecipeSummaryDto.java` with our own field names, and
`service/RecipeService.java` that calls the client and copies each result into
our shape with a plain `for` loop.

## Step 6 — Run it again

```bash
./mvnw test
```

The whole suite. `BUILD SUCCESS` means the subtask is done.

---

# Reference

## What belongs in a service test

- their field names becoming ours
- empty results giving back an empty list, never `null`
- blank or missing input refused before any call
- anything a user would notice that is not about HTTP

## Common mistakes

- **`@Mock` and `@InjectMocks` swapped.** Fake the dependency, inject into the
  real class.
- **Asserting on the mock.** `verify(client).search(...)` only proves you called
  your own fake. Assert on what the service *returned*.
- **Unnecessary stubbing.** Mockito fails the test if you `when(...)` something
  the code never calls — that means your test described something that does not
  happen.
- **Testing HTTP here.** Status codes and URLs belong in the client test. A
  service knows nothing about the web.

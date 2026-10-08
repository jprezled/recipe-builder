# How to write a client test

A **client test** checks our code that calls someone else's API — right now
`SpoonacularClient`, the only class in the project that touches the network.

Use this for **subtask 2** (error translation).

Follow the steps in order. Do not skip step 4.

---

## Step 1 — Create the file

```
backend/src/test/java/com/recipebuilder/client/SpoonacularErrorsTest.java
```

Rules: the name must end in `Test.java` or Maven will not run it, and the class
name inside must match the filename exactly.

## Step 2 — Paste this skeleton in

Change `SpoonacularErrorsTest` if you named your file something else.

```java
package com.recipebuilder.client;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.client.RestClientTest;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.anything;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

@RestClientTest(
        value = SpoonacularClient.class,
        properties = {
                "spoonacular.base-url=https://api.spoonacular.invalid",
                "spoonacular.api-key=test-key-not-a-real-key"
        })
class SpoonacularErrorsTest {

    @Autowired
    private SpoonacularClient client;

    @Autowired
    private MockRestServiceServer server;

    @Test
    void nameWhatShouldHappen() {
        // step 3 goes here
    }
}
```

Leave the two `properties` lines alone. The `.invalid` address can never
resolve, so if a real network call ever escaped it would fail loudly instead of
quietly working.

## Step 3 — Write the one test method

Every client test is three lines of structure:

```java
server.expect(...).andRespond(...);     // what the fake Spoonacular answers
<call the method>                       // run your code
<check the outcome>                     // assert
```

### Pick ONE response for `.andRespond(...)`

You need exactly one. Pick by what you are testing.

**A — an error status.** No stub file needed. **This is what subtask 2 uses.**

```java
@Test
void dailyQuotaSpentBecomesApiLimitReached() {
    server.expect(anything()).andRespond(withStatus(HttpStatus.PAYMENT_REQUIRED));

    assertThatExceptionOfType(ApiLimitReachedException.class)
            .isThrownBy(() -> client.searchByIngredients("apple", 2));
}
```

**B — an empty success**, when you only care that nothing blew up.

```java
@Test
void noMatchesGivesAnEmptyList() {
    server.expect(anything()).andRespond(withSuccess("[]", MediaType.APPLICATION_JSON));

    assertThat(client.searchByIngredients("unobtanium", 2)).isEmpty();
}
```

**C — a real saved response**, when you are testing parsing. `SpoonacularClientTest`
already does this, so you probably do not need it again. It needs two extra
imports and a helper method — copy both from `SpoonacularClientTest.java`.

```java
.andRespond(withSuccess(stubbedResponse(), MediaType.APPLICATION_JSON));
```

## Step 4 — Run it and watch it FAIL

```bash
cd backend
./mvnw test -Dtest=SpoonacularErrorsTest
```

Windows PowerShell: `.\mvnw.cmd` instead of `./mvnw`.

For subtask 2 it will fail to compile, because `ApiLimitReachedException` does
not exist yet. **That is correct.** The failure is the test telling you what to
build.

> **If it passes here, stop.** Either the behaviour already existed, or your
> test is not running. A test you never saw fail has not proved it can catch
> anything.

## Step 5 — Write the code that makes it pass

For subtask 2 that means creating the exception classes and adding a
`try`/`catch` in `SpoonacularClient` that converts status codes into them.

## Step 6 — Run it again

```bash
./mvnw test
```

The whole suite, not just your one class — so you know you broke nothing.
`BUILD SUCCESS` means the subtask is done.

---

# Reference

## Statuses Spoonacular actually sends

| Status | Means | Should become |
|---|---|---|
| 402 | daily points spent | `ApiLimitReachedException` |
| 401 / 403 | key rejected | `ApiKeyMissingException` |
| 404 | no such recipe | `RecipeNotFoundException` |
| anything else | their problem | `ExternalApiException` |

402 is the surprising one — "Payment Required" is how they report a spent free
quota.

## Capturing a real response (only for option C)

One API point, and the test becomes evidence about reality rather than about
your assumptions:

```bash
curl -s "https://api.spoonacular.com/recipes/findByIngredients?ingredients=apple&number=2&apiKey=$KEY" \
  | python3 -m json.tool > src/test/resources/stubs/whatever.json
```

Replacing a stub changes the ids and titles, so assertions tied to them must be
updated too.

## Common mistakes

- **Using the real base URL.** Keep `.invalid`.
- **Two calls, one expectation.** Each call the code makes needs its own
  `server.expect(...)`, in order.
- **Expecting a JSON array into `List.class`.** Java erases generics — use an
  array type like `SpoonacularSearchResult[].class`.
- **Calling the real API.** Tests must run offline, need no key, and spend no
  quota.

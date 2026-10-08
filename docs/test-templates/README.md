# How to write a test

These are **instructions to read**, not files to run. Each one walks you
through creating a `.java` file, step by step.

Only `.java` files under `backend/src/test/` are ever compiled and executed.
Nothing in this folder runs.

## Pick your file

| Your subtask | Read this | You will create |
|---|---|---|
| **2** — handle Spoonacular's errors | [client-test.md](client-test.md) | `client/SpoonacularErrorsTest.java` |
| **3** — convert their data into ours | [service-test.md](service-test.md) | `service/RecipeServiceTest.java` |
| **4** — the `/api/recipes/search` address | [controller-test.md](controller-test.md) | `controller/RecipeControllerTest.java` |

## All three follow the same six steps

1. Create the `.java` file
2. Paste the skeleton
3. Write one test method — **pick one option**, not all of them
4. Run it and **watch it fail**
5. Write the code that makes it pass
6. Run the whole suite

Step 4 is the one people skip and the one that matters. A test written after the
code passes the instant you write it, which proves nothing — you never saw it
catch anything. A test you watched fail, then made pass, has demonstrated it
can detect the problem it exists for.

**If a brand-new test passes immediately, something is wrong.** Either the
behaviour already existed, or the test is not running.

## What "pick one option" means

Each file offers two or three ways to write the test method, labelled **A**,
**B** and **C**. They are alternatives. Choose the one matching what you are
proving and ignore the rest — you do not work through them in order.

## Reading these files

- **On GitHub** — click the file. Tables and code blocks render, and each code
  block has a copy button.
- **In VS Code** — open it and press `Cmd+Shift+V` for the rendered preview.
  Without that you see raw markdown, which is the same text with `#` and `|`
  showing.

## Running tests

```bash
cd backend
./mvnw test                                  # everything
./mvnw test -Dtest=RecipeServiceTest         # one class, much faster
```

Windows PowerShell: `.\mvnw.cmd` instead of `./mvnw`.

When the output scrolls past, the readable version is saved to a file:

```bash
cat target/surefire-reports/com.recipebuilder.service.RecipeServiceTest.txt
```

## Two rules that apply to every test here

**Fake the layer below.** That is the whole trick, and it is why there are three
templates rather than one:

```
Controller  →  Service  →  Client  →  Spoonacular
     ↑             ↑          ↑
  fake the      fake the   fake the
   service       client     response
```

**Never call the real API.** Tests must run offline, need no API key, and spend
none of our 150 daily points. A test hitting the real Spoonacular is slow,
costs quota, breaks when their servers hiccup, and fails outright for a
teammate who has not registered yet.

## Naming

- The file must end in `Test.java`, or Maven will not run it
- The class name inside must match the filename exactly
- Put it in the same package as the thing it tests
- Name methods after what should happen:
  `blankIngredientIsRejectedWithoutCallingSpoonacular`, not `test1`

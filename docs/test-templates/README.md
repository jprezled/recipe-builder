# How to write a test

These are **instructions to read**, not files to run. Each one walks you
through creating a `.java` file, step by step.

Only `.java` files under `backend/src/test/` are ever compiled and executed.
Nothing in this folder runs.

## Pick your file

Go by **what you are testing**, not by which sprint you are in.

| What you are testing | Read this | Example |
|---|---|---|
| our code that calls Spoonacular | [client-test.md](client-test.md) | `client/SpoonacularClientTest.java` |
| rules and conversions, no HTTP | [service-test.md](service-test.md) | `service/RecipeServiceTest.java` |
| one of our own web addresses | [controller-test.md](controller-test.md) | `controller/RecipeControllerTest.java` |
| a React component or page | [component-test.md](component-test.md) | `components/RecipeNote.test.jsx` |

**Database tests have no template.** There is only one —
`repository/FavoriteRepositoryTest.java` — so read that file instead. It shows
the two things that make it different: it needs Postgres running, and
`@Transactional` rolls every test back so one test cannot see another's rows.

## All four follow the same six steps

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

Backend:

```bash
cd backend
./mvnw test                                  # everything
./mvnw test -Dtest=RecipeServiceTest         # one class, much faster
```

Windows PowerShell: `.\mvnw.cmd` instead of `./mvnw`.

Frontend:

```bash
cd frontend
npm test                                     # everything
npm test -- RecipeNote                       # one file
```

**Read the `Tests run:` line, not the exit code.** `./mvnw test | tail` reports
the exit code of `tail`, not of Maven, so a failing suite can look like a
passing one.

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
none of our 50 daily points. A test hitting the real Spoonacular is slow,
costs quota, breaks when their servers hiccup, and fails outright for a
teammate who has not registered yet.

The frontend version of the same rule is `vi.mock('../api/recipes')`, which
replaces our whole API module with fakes.

## Naming

- The file must end in `Test.java`, or Maven will not run it
- The class name inside must match the filename exactly
- Put it in the same package as the thing it tests
- Name methods after what should happen:
  `blankIngredientIsRejectedWithoutCallingSpoonacular`, not `test1`

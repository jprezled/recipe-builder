# Commands

Everything you need to type, in one place. Copy the line, paste it, run it.

All paths assume you are at the **repo root** — the folder containing
`backend/`, `docs/` and `README.md`. If a command fails with "no such file or
directory", run `pwd` to see where you actually are.

**Windows:** use **Git Bash**, not PowerShell. Every line below works there
unchanged. In PowerShell, `./mvnw` becomes `.\mvnw.cmd`.

---

## Tests

Run the whole backend suite. This is the one you will use most.

```bash
cd backend && ./mvnw test
```

Expect `Tests run: 7, Failures: 0, Errors: 0` and `BUILD SUCCESS`.

Run one test class — much faster while you are working on it:

```bash
cd backend && ./mvnw test -Dtest=SpoonacularClientTest
```

Run one single test method:

```bash
cd backend && ./mvnw test -Dtest=RecipeServiceTest#noMatchesGivesAnEmptyListNotNull
```

Delete all compiled output first, for when a build behaves strangely:

```bash
cd backend && ./mvnw clean test
```

Read a failure that scrolled past:

```bash
cat backend/target/surefire-reports/com.recipebuilder.client.SpoonacularClientTest.txt
```

### Prove the tests need no API key (RB-64)

Hide your key, run the suite, put it back. Still 7 green.

```bash
mv .env .env.hidden && (cd backend && ./mvnw test); mv .env.hidden .env
```

Useful when a teammate asks whether they need a key to run tests. They do not.

---

## Running the app

Start the backend on port 8080. Leave it running; stop it with `Ctrl+C`.

```bash
cd backend && ./mvnw spring-boot:run
```

There are no endpoints yet, so `http://localhost:8080/` returns 404. That is
correct, not broken. `GET /api/recipes/search` arrives with RB-38.

Check whether it is already running:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/
```

Stop a backend you lost track of:

```bash
pkill -f "spring-boot:run"
```

---

## Checking the real Spoonacular API

**Each of these spends one of our 150 daily points.** Use them when something
unexplained is happening, not routinely.

Does my key work?

```bash
KEY=$(awk -F= '/SPOONACULAR_API_KEY/{v=$2; gsub(/[ \t\r\n]/,"",v); print v}' .env) && curl -s -o /dev/null -w "HTTP %{http_code}\n" "https://api.spoonacular.com/recipes//complexSearch?ingredients=apple&number=1&apiKey=${KEY}"
```

`HTTP 200` means the key is good. `401` means it is wrong or has whitespace
around it. `402` means today's quota is gone.

See what they actually return:

```bash
KEY=$(awk -F= '/SPOONACULAR_API_KEY/{v=$2; gsub(/[ \t\r\n]/,"",v); print v}' .env) && curl -s "https://api.spoonacular.com/recipes/complexSearch?ingredients=apple&number=2&apiKey=${KEY}" | python3 -m json.tool | head -30
```

Recapture the test stub from live data:

```bash
KEY=$(awk -F= '/SPOONACULAR_API_KEY/{v=$2; gsub(/[ \t\r\n]/,"",v); print v}' .env) && curl -s "https://api.spoonacular.com/recipes/complexSearch?ingredients=apple&number=2&apiKey=${KEY}" | python3 -m json.tool > backend/src/test/resources/stubs/find-by-ingredients.json
```

**This breaks the tests on purpose** — the assertions name specific ids and
titles, and new data has different ones. Update them to match. The red step is
the proof the test really reads the stub.

The key is read out of `.env` in all three, so you never type it and it never
reaches your shell history.

---

## Checking your .env

Is it the right size? One key plus a newline is exactly 53 bytes.

```bash
wc -c < .env
```

Anything larger usually means **trailing spaces after the key**. Spring keeps
them, sends them to Spoonacular as part of the key, and the request fails with
"rejected our API key" — which looks like a bad key and is not.

Strip them:

```bash
perl -pi -e 's/[ \t\r]+$//' .env
```

Create it from the template:

```bash
cp .env.example .env
```

Then put your own key in it. Register at <https://spoonacular.com/food-api> —
**get your own**, the 150 points are per key.

---

## Git

Get everyone else's work. Do this before you start, every time.

```bash
git pull
```

Start a ticket. Name the branch after it so Jira links the work:

```bash
git checkout -b RB-38-search-endpoint
```

See what you have changed:

```bash
git status
git diff
```

Commit. Put the Jira key first:

```bash
git add -A
git commit -m "RB-38 Expose GET /api/recipes/search"
```

Push and open a pull request:

```bash
git push -u origin RB-38-search-endpoint
```

Throw away all your uncommitted changes:

```bash
git restore .
```

Which branch am I on, and what is committed?

```bash
git branch --show-current
git log --oneline -5
```

---

## Versions, for docs/setup-notes.md

```bash
sw_vers -productVersion   # macOS version (Mac only)
java -version
node -v
psql --version
```

---

## When something looks wrong

| Symptom | Try |
|---|---|
| "no such file or directory" | `pwd` — you are in the wrong folder |
| "command not found" after installing something | close and reopen the terminal |
| `./mvnw` not recognized on Windows | use Git Bash, or `.\mvnw.cmd` |
| Test fails and you did not touch that code | `git pull`, then `cd backend && ./mvnw clean test` |
| "rejected our API key" | `wc -c < .env` — probably trailing spaces |
| "SPOONACULAR_API_KEY is not set" | `.env` is missing, empty, or unsaved |
| Backend will not start, port in use | `pkill -f "spring-boot:run"` |

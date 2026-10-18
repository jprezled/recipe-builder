# Recipe Builder

Find recipes from the ingredients you already have. React frontend, Spring Boot
backend, recipe data from the Spoonacular API.

---

## Before you start

Install these, whichever computer you are on:

- **JDK 17 or newer** — <https://adoptium.net>
- **Node.js 20.19+ or 22.12+** — <https://nodejs.org>
- **Your own free Spoonacular key** — <https://spoonacular.com/food-api>

**PostgreSQL is not needed to run the app.**

**Everyone needs their own API key.** The free tier allows 150 searches a day
per key, so a shared one runs out before everyone has finished testing.

Then follow the section for your computer.

---

# Running on Mac

### 1. Add your API key

From the repo root:

```bash
cp .env.example .env
```

Open `.env` and replace the placeholder with your key. **No spaces after it:**

```
SPOONACULAR_API_KEY=your_key_here
```

### 2. Start the backend

```bash
cd backend
```

```bash
./mvnw spring-boot:run
```

Leave this terminal open. Wait until it stops printing — that means it started.

### 3. Start the frontend

Open a **second terminal window** with `Cmd+N`:

```bash
cd frontend
```

```bash
npm install
```

```bash
npm run dev
```

Run `npm install` the first time, and again whenever a `git pull` changes
`package.json`. The file only lists which libraries the project needs — the
libraries themselves are not in git, so `npm install` is how a new one actually
reaches your machine. If nothing is missing it finishes in a second and changes
nothing, so running it after a pull is never wrong.

### 4. Open the app

<http://localhost:5173>

### To stop

Press `Ctrl+C` in each terminal.

---

# Running on Windows

Use **Git Bash**, which came with Git for Windows. Right-click the project
folder and choose "Git Bash Here".

*(If you prefer PowerShell, see the note at the end of this section.)*

### 1. Add your API key

From the repo root:

```bash
cp .env.example .env
```

Open `.env` and replace the placeholder with your key. **No spaces after it:**

```
SPOONACULAR_API_KEY=your_key_here
```

### 2. Start the backend

```bash
cd backend
```

```bash
./mvnw spring-boot:run
```

Leave this window open. Wait until it stops printing — that means it started.

### 3. Start the frontend

Open a **second Git Bash window**:

```bash
cd frontend
```

```bash
npm install
```

```bash
npm run dev
```

Run `npm install` the first time, and again whenever a `git pull` changes
`package.json`. The file only lists which libraries the project needs — the
libraries themselves are not in git, so `npm install` is how a new one actually
reaches your machine. If nothing is missing it finishes in a second and changes
nothing, so running it after a pull is never wrong.

### 4. Open the app

<http://localhost:5173>

### To stop

Press `Ctrl+C` in each window.

### If you use PowerShell instead

Two commands change. Everything else is the same:

```powershell
Copy-Item .env.example .env
```

```powershell
.\mvnw.cmd spring-boot:run
```

`npm` commands are identical in every shell.

---

## Running the tests

No API key or internet needed. Works the same on both systems:

```bash
cd backend && ./mvnw test
```

```bash
cd frontend && npm test
```

On Windows PowerShell, `./mvnw` becomes `.\mvnw.cmd`.

---

## If it does not start

| What you see | Fix |
|---|---|
| `Port 8080 was already in use` | a backend is already running — `pkill -f "spring-boot:run"` |
| `./mvnw: not recognized` | you are in PowerShell — use `.\mvnw.cmd`, or switch to Git Bash |
| `SPOONACULAR_API_KEY is not set` | `.env` is missing, empty, or was not saved |
| `Spoonacular rejected our API key` | trailing spaces after the key in `.env` |
| `Could not reach the recipe service` | the backend is not running — check terminal 1 |
| `no such file or directory` | run `pwd` — you are in the wrong folder |

More commands and troubleshooting: [`docs/commands.md`](docs/commands.md)
Database setup, for later: [`database/README.md`](database/README.md)

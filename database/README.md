# Database setup

PostgreSQL setup for recipe-builder. Follow these four sections in order -
each one depends on the one before it.

## Requirements

- PostgreSQL installed
- A PostgreSQL client such as pgAdmin or `psql`
- Access to the project repository
  
> **Run every command below from the repository root** - the folder holding
> `backend/`, `frontend/` and `database/`. The file paths are relative, so
> running them from inside `database/` gives "No such file or directory".

## Create the databases

Two of them. The second exists only for tests, which truncate tables to clean
up after themselves - pointed at the development database that would delete the
favorites saved for a demo.

```bash
createdb recipe_builder_db
createdb recipe_builder_test_db
```

Or in pgAdmin, or with `CREATE DATABASE recipe_builder_db;` and
`CREATE DATABASE recipe_builder_test_db;` from a `psql` prompt - whichever you
already have open.

Unlike the migration files below, `createdb` is **not** safe to re-run. If you
already have the database you will see:

```
createdb: error: database creation failed: ERROR:  database "recipe_builder_db" already exists
```

Nothing is broken - you already have it. Skip to the migrations.

On Windows, `createdb` has the same PATH problem as `psql` described below. If
it is not recognised, use the full path:

```powershell
& "C:\Program Files\PostgreSQL\18\bin\createdb.exe" -U postgres recipe_builder_db
& "C:\Program Files\PostgreSQL\18\bin\createdb.exe" -U postgres recipe_builder_test_db
```

## Apply the migrations

In order, to **both** databases. V1 creates the five tables. V2 creates the one
hardcoded user that saved recipes belong to until accounts ship.

#### On Mac, Linux, or Git Bash

```bash
psql -d recipe_builder_db      -f database/migrations/V1__initial_schema.sql
psql -d recipe_builder_db      -f database/migrations/V2__demo_user.sql
psql -d recipe_builder_test_db -f database/migrations/V1__initial_schema.sql
psql -d recipe_builder_test_db -f database/migrations/V2__demo_user.sql
```

#### On Windows

The same two commands, with two differences.

**`psql` is often not on your PATH.** The installer does not always add it, so
`psql` may come back as "not recognized". Either add
`C:\Program Files\PostgreSQL\18\bin` to your PATH, or call it by full path:

```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d recipe_builder_db -f database/migrations/V1__initial_schema.sql
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d recipe_builder_db -f database/migrations/V2__demo_user.sql
```

Then the same two again with `-d recipe_builder_test_db`. Four runs in total,
same as the Mac block above.

Adjust `18` to your version. Forward slashes in the file path are fine - psql
accepts them on Windows.

**You need `-U postgres` and it will ask for a password.** The Windows installer
sets one during setup; a Homebrew install on a Mac usually trusts local
connections and needs neither.

**Or skip the command line.** Open each `.sql` file in pgAdmin's Query Tool and
run it. V1 then V2, against both databases. That is four runs and no PATH
problems.

Git Bash behaves like the Mac instructions above, as long as `psql` is on the
PATH it sees.

---

V2 is not optional, and it is not the same as `seeds/sample_data.sql`.
`saved_recipes.user_id` is a foreign key to `users(user_id)`, so without that
row the very first attempt to save a favorite fails with a constraint violation
that looks like a bug in the application rather than missing setup.

Both files are safe to run more than once.

## Configure Connection

- This will run locally unless we get server

Put these in the **`.env` at the repo root** - not in this folder.
`backend/src/main/resources/application.properties` imports `../.env` relative
to the `backend` directory, so a `.env` anywhere else is silently never read and
the app starts with no database configured.

```text
DATABASE_URL=jdbc:postgresql://localhost:5432/recipe_builder_db
DATABASE_USER=your_username
DATABASE_PASSWORD=your_password
```

`DATABASE_USER` is your Postgres role. On a Homebrew install that is usually
your own macOS username; on the Windows installer it is usually `postgres`.
Leave `DATABASE_PASSWORD` empty if your local server trusts local connections.

No trailing spaces after any value. Spring reads `.env` as a properties file and
keeps whitespace *after* a value, which then travels as part of the value.

Example:
```
DATABASE_URL=jdbc:postgresql://localhost:5432/recipe_builder_db
DATABASE_USER=postgres
DATABASE_PASSWORD=Password1234
```

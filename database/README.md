# receipe-builder
application that helps user make receipes from ingredients they have at home

## PostgreSQL Database Setup
### Requirements

- PostgreSQL installed
- A PostgreSQL client such as pgAdmin or `psql`
- Access to the project repository
  
### Create the databases

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

### Apply the migrations

In order, to **both** databases. V1 creates the five tables. V2 creates the one
hardcoded user that saved recipes belong to until accounts ship.

```bash
psql -d recipe_builder_db      -f database/migrations/V1__initial_schema.sql
psql -d recipe_builder_db      -f database/migrations/V2__demo_user.sql
psql -d recipe_builder_test_db -f database/migrations/V1__initial_schema.sql
psql -d recipe_builder_test_db -f database/migrations/V2__demo_user.sql
```

V2 is not optional, and it is not the same as `seeds/sample_data.sql`.
`saved_recipes.user_id` is a foreign key to `users(user_id)`, so without that
row the very first attempt to save a favorite fails with a constraint violation
that looks like a bug in the application rather than missing setup.

Both files are safe to run more than once.

### Configure Connection

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

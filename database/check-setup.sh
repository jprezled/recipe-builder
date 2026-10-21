#!/usr/bin/env bash
#
# Reports the state of the local database setup. Changes nothing.
#
# Run it from the repository root:
#   bash database/check-setup.sh
#
# Paste the whole output into the team chat. It never prints your password -
# only whether one is set.

echo "================= recipe-builder database check ================="
echo

# ---------------------------------------------------------------- where am I
if [ ! -d backend ] || [ ! -d database ]; then
    echo "WRONG FOLDER"
    echo "  Run this from the repository root - the folder holding backend/,"
    echo "  frontend/ and database/."
    echo "  You are in: $(pwd)"
    exit 1
fi
echo "[1] Folder ................. OK  ($(pwd))"

# ------------------------------------------------------------ is psql there?
if ! command -v psql > /dev/null 2>&1; then
    echo "[2] psql command ........... NOT FOUND"
    echo
    echo "    Postgres may still be installed - on Windows the installer often"
    echo "    does not add it to the PATH. Try the full path:"
    echo '      "/c/Program Files/PostgreSQL/18/bin/psql" --version'
    echo "    If that works, the rest of this script needs that full path too."
    echo "    If it does not, Postgres is not installed: postgresql.org/download"
    exit 1
fi
echo "[2] psql command ........... OK  ($(psql --version))"

# -------------------------------------------------------- is the server up?
if ! psql -l > /dev/null 2>&1; then
    # Retry as the postgres role, which is how the Windows installer sets up.
    if psql -U postgres -l > /dev/null 2>&1; then
        echo "[3] Server ................. OK  (reachable as role 'postgres')"
        AS="-U postgres"
    else
        echo "[3] Server ................. CANNOT CONNECT"
        echo
        echo "    The error was:"
        psql -l 2>&1 | head -3 | sed 's/^/      /'
        echo
        echo "    Start it:"
        echo "      Mac  (Homebrew)  brew services start postgresql@18"
        echo "      Windows          services.msc -> postgresql-x64-18 -> Start"
        exit 1
    fi
else
    echo "[3] Server ................. OK  (reachable as $(whoami))"
    AS=""
fi

# ------------------------------------------------- what roles can log in?
roles=$(psql $AS -d postgres -tAc "SELECT rolname FROM pg_roles WHERE rolcanlogin AND rolname NOT LIKE 'pg_%' ORDER BY rolname" 2>/dev/null | tr '\n' ' ')
echo "[4] Roles that can log in .. ${roles:-could not read}"
echo "    ^^ DATABASE_USER in .env must be ONE OF THESE."

# ---------------------------------------------------- do the databases exist?
for db in recipe_builder_db recipe_builder_test_db; do
    if psql $AS -lqt 2>/dev/null | cut -d'|' -f1 | grep -qw "$db"; then
        tables=$(psql $AS -d "$db" -tAc \
          "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'" 2>/dev/null)
        demo=$(psql $AS -d "$db" -tAc \
          "SELECT count(*) FROM users WHERE user_id=1" 2>/dev/null)

        printf "[5] %-22s OK  - %s tables, demo user rows: %s\n" \
               "$db" "${tables:-?}" "${demo:-0 (users table missing)}"

        if [ "$tables" != "5" ]; then
            echo "    EXPECTED 5 TABLES. Migration V1 was not applied to this database."
        fi
        if [ "$demo" != "1" ]; then
            echo "    NO DEMO USER. Migration V2 was not applied. Saving a favorite"
            echo "    will fail with a foreign key error."
        fi
    else
        printf "[5] %-22s MISSING\n" "$db"
        echo "    Create it:  createdb $AS $db"
    fi
done

# ---------------------------------------------------------------- the .env
echo
if [ ! -f .env ]; then
    echo "[6] .env ................... MISSING at the repo root"
    echo "    cp .env.example .env     then fill it in"
    exit 1
fi
echo "[6] .env ................... found ($(wc -c < .env | tr -d ' ') bytes)"

for key in SPOONACULAR_API_KEY DATABASE_URL DATABASE_USER DATABASE_PASSWORD; do
    line=$(grep -m1 "^${key}=" .env)
    if [ -z "$line" ]; then
        printf "    %-20s NOT SET\n" "$key"
        continue
    fi
    value="${line#*=}"
    # Report shape, never the secret itself.
    if [ -z "$value" ]; then
        printf "    %-20s empty\n" "$key"
    elif [ "$value" != "${value%[[:space:]]}" ]; then
        printf "    %-20s TRAILING WHITESPACE - this breaks it, delete it\n" "$key"
    elif [ "$key" = "DATABASE_USER" ] || [ "$key" = "DATABASE_URL" ]; then
        printf "    %-20s %s\n" "$key" "$value"
    else
        printf "    %-20s set (%s characters)\n" "$key" "${#value}"
    fi
done

# ------------------------------- the real test: can the app's values connect?
echo
USER_IN_ENV=$(grep -m1 '^DATABASE_USER=' .env | cut -d= -f2-)
PASS_IN_ENV=$(grep -m1 '^DATABASE_PASSWORD=' .env | cut -d= -f2-)

if [ -z "$USER_IN_ENV" ]; then
    echo "[7] Connecting as .env says .... SKIPPED, DATABASE_USER is empty"
else
    out=$(PGPASSWORD="$PASS_IN_ENV" psql -U "$USER_IN_ENV" -d recipe_builder_db \
            -tAc "SELECT 'connected'" 2>&1)
    if [ "$out" = "connected" ]; then
        echo "[7] Connecting as .env says .... OK"
        echo
        echo "    Your database setup is correct. If favorites still fail, the"
        echo "    problem is elsewhere - send the backend terminal output."
    else
        echo "[7] Connecting as .env says .... FAILED"
        echo "    This is almost certainly the problem. Postgres said:"
        echo "$out" | head -3 | sed 's/^/      /'
        echo
        echo "    Fix DATABASE_USER in .env to one of the roles listed in [4]."
    fi
fi
echo
echo "================================================================"

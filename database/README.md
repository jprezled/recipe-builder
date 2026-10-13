# receipe-builder
application that helps user make receipes from ingredients they have at home

## PostgreSQL Database Setup
### Requirements

- PostgreSQL installed
- A PostgreSQL client such as pgAdmin or `psql`
- Access to the project repository
  
### Create the Database

Create a local database named:
`recipe_builder_db`

Create it using pgAdmin or this PostgreSQL command:
`CREATE DATABASE recipe_builder_db;`

### Configure Connection
- This will run locally unless we get server

Create a local .env file:
```text
DATABASE_URL=jdbc:postgresql://localhost:5432/recipe_builder_db
DATABASE_USER=your_username
DATABASE_PASSWORD=your_password
```

Example:
```
DATABASE_URL=jdbc:postgresql://localhost:5432/recipe_builder_db
DATABASE_USER=postgres
DATABASE_PASSWORD=Password1234
```


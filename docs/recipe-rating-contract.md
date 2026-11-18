# RB-297 / RB-294 — recipe ratings

The short, final record. The working draft with the reasoning is
`docs/superpowers/specs/2026-11-17-recipe-ratings-design.md` (local only).

## The short version

1. A signed-in cook rates a recipe **1 to 5 stars**, from the recipe detail
   page only. Rating again **replaces** their rating; there is no way to
   remove one.
2. Everyone — signed in or not — sees one shared **average and count**, on the
   detail page and on every results-page card. The card is read-only.
3. A recipe nobody has rated reads **`No rating`**, never `0.0 ★ (0)`.
4. Ratings are keyed on **Spoonacular's recipe id** (`recipe_ratings`, V10),
   not on `recipes`, so a recipe can be rated before anybody favorites it.

## The three addresses

| Address | Signed in? | Answers |
|---|---|---|
| `GET /api/recipes/{id}/rating` | not needed | `{average, count, yourRating}`; `yourRating` is `null` when signed out or never rated |
| `POST /api/recipes/{id}/rating` with `{"rating": 1-5}` | required | the same shape, after saving |
| `GET /api/recipes/ratings?ids=1,2,3` | not needed | `[{id, average, count}]`, one per id asked, in order; `count: 0` when unrated |

Errors are in `docs/error-shape.md` under "Ratings (RB-297)".

## The mistake to avoid

**Never add rating fields to `RecipeDetailDto` or `RecipeSummaryDto`.**
`RecipeService.getRecipe` and `searchByIngredients` are cached once per recipe
for every cook at once. A per-cook `yourRating` baked into that would be served
to the next cook, and the average would go stale the moment anyone rated.
Ratings are read through their own uncached addresses above.

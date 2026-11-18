# RB-291 — scaling a recipe's servings

## The short version

1. A stepper on the recipe detail page changes the serving count from 1 up
   to 20.
2. At the recipe's own serving count, the Ingredients section is unchanged —
   it still shows Spoonacular's original phrases exactly, prep notes and all.
3. At any other serving count, each ingredient line is rebuilt from its
   numeric amount, scaled by the ratio of chosen servings to the recipe's
   own, and rounded to two decimal places.
4. The scaling is entirely a frontend calculation. The backend's only job is
   to stop throwing the numeric amount away.

## Why the original phrase only survives at the original serving count

Spoonacular's `original` field is rich text: `"3 cloves of garlic (minced)"`
carries a prep note a plain `amount + unit + name` reconstruction cannot
reproduce. At the recipe's own servings, showing that exact text is strictly
better than rebuilding it from parts.

Once the servings are no longer 1:1 with the recipe, there is no way to
scale a prep note — "minced" doesn't become "2x minced" when the garlic
count doubles. So a scaled line is necessarily a plainer
`${amount} ${unit} ${name}`, and that's accepted as the cost of scaling at
all, not something to work around.

## What was being thrown away

Spoonacular's `extendedIngredients` reply already carries `amount` (a
number) and `unit` (a string) on every ingredient. The backend's
`ExtendedIngredient` DTO only declared `name`, `original`, and `aisle` — the
numbers were arriving and being dropped before this story needed them.

Added rather than replacing the existing fields, with a second,
backward-compatible constructor so the three existing call sites in
`RecipeDetailServiceTest` don't have to change:

```java
public record ExtendedIngredient(String name, String original, String aisle,
        double amount, String unit) {
    public ExtendedIngredient(String name, String original, String aisle) {
        this(name, original, aisle, 0, null);
    }
}
```

## The new field

`RecipeDetailDto` gains one new field, appended at the end so the existing
positional constructor calls in `RecipeControllerTest` only need one new
trailing argument, not a rewrite:

```java
List<IngredientAmountDto> ingredientAmounts
```

`IngredientAmountDto(String name, double amount, String unit)` is a new
record in `dto/`, built the same way `ShoppingItemDto` already is — one per
extended ingredient, in the same order as `ingredients`.

## Rounding and limits

- Scaled amount: `round(original amount * chosenServings / recipe.servings, 2)`.
- Servings stepper range: **1 to 20**. Below 1 a recipe stops making sense;
  above 20 nobody is actually cooking for that many people from this app.
- An ingredient whose original amount is `0` (Spoonacular sometimes sends
  this for "to taste" items) stays at `0` scaled, and is shown without a
  number rather than as `0 g salt`.

## What this does not touch

Nutrition figures stay per-serving, exactly as RB-204 built them — the
nutrition panel already means "per serving," so it is already correct at any
serving count without scaling. Cost figures are untouched for the same
reason: `costPerServing` already is what it says.

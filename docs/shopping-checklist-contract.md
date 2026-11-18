# RB-298 — checking off shopping list items

**Revised.** The original version of this contract said the checked set was
local to one page visit and backend-free. The backend-free part still holds;
"local to one visit" turned out to be wrong the first time it was actually
used — a cook checking things off on the recipe detail page expects the same
checks to still be there on the Favorites page's own shopping list, and
after closing the tab entirely.

## The short version

1. Each line in a shopping list — the recipe detail page's Shopping List
   panel, and the Favorites page's per-recipe shopping list — gets a
   checkbox.
2. Checking one is saved to **this browser's `localStorage`**, keyed by
   recipe id. Still no backend call, still nothing tied to the account - a
   different browser, or signing in as someone else on this one, starts
   with nothing checked.
3. Because both pages read the same storage key for a given recipe id,
   checking an item on either page shows it checked on the other the next
   time that page is opened. Neither page watches the other live - this is
   "correct next time you look," not real-time syncing between two open
   tabs.
4. The checked set **survives closing the tab, the browser, and the
   computer** - it is real `localStorage`, not component state.
5. Checking something off one recipe's list **never appears on a
   different recipe's list** - the storage key carries the recipe id.

## What identifies an item

The ingredient's `line` (the same whole phrase the list already displays,
e.g. `"3 cloves of garlic (minced)"`) is the key within one recipe's stored
set. Two different ingredients never share a line on one recipe's list, so
this needs no new id.

## Where it lives

`frontend/src/lib/shoppingChecklist.js` — `getChecked(recipeId)` and
`setChecked(recipeId, checkedSet)`, shared by `RecipeDetailPage.jsx` and
`RecipeShoppingList.jsx` (the Favorites page's version) rather than each
page inventing its own storage key or format.

## What this does not do

No backend call, no new column, no account-level sync between browsers or
devices. If `localStorage` is unavailable (private browsing in some
browsers, or storage disabled), checking an item simply fails to persist -
the checkbox still visibly toggles for the rest of that page view, so the
feature degrades rather than crashing the page.

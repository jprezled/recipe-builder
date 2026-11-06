# Recipe cost — what we agreed

**RB-193a.** Every decision here has been built and tested, and every warning
below is something that actually went wrong. **Read this before RB-193b.**

---

## The short version

1. This story is **two features**, and they cost very different amounts.
2. The price-per-serving line is **free** — the data already arrives.
3. The *What I need to buy* panel costs **1 full point**, so it is a button.
4. Spoonacular reports prices in **cents**. We convert once, in the service.
5. We work out the shopping cost by **subtracting** what the cook has, not by
   adding up what they lack. The reason is in Mistake 1.

---

## Two features, two prices

| On screen | Where the data comes from | Points |
|---|---|---|
| "About $1.96 a serving · $3.92 in total" | already in the recipe reply | **free** |
| *What I need to buy* panel | `/recipes/{id}/priceBreakdownWidget.json` | **1.0** |

The per-serving figure was already arriving on every recipe before this story
and we were throwing it away. Showing it costs nothing, so it is part of the
page.

The panel costs as much as loading the whole recipe, so it is a **button** and
never part of the page load.

---

## Cents to dollars, in one place

Spoonacular's `pricePerServing` is in **cents**. `195.54` means $1.96.

```java
double costPerServing = round2(theirs.pricePerServing() / 100.0);
double costTotal      = round2(costPerServing * theirs.servings());
```

Do this in the service, not on the page. Every screen then receives dollars,
and there is only one place that can get the conversion wrong.

The test `centsBecomeDollarsAndTheTotalIsPerServingTimesServings` checks both
numbers.

---

## Mistake 1 — adding up the missing ingredients

There are two ways to answer "how much shopping is this?" Only one works.

**Way A — add up the ingredients the cook does not have.**
To do that you must match each priced ingredient to the cook's pantry.

**Way B — take the total, then subtract the cost of what they already have.**

**We use Way B.** The reason is a property of Spoonacular's data:

> `priceBreakdownWidget.json` gives you an ingredient **name** and no **id**.

And the names are not consistent between endpoints. The search calls something
`basil`; the price breakdown calls the same thing `dried basil`. So there is no
reliable value to match on.

**What goes wrong with Way A:** an ingredient whose name fails to match is left
out of the total, so the shopping looks **cheaper** than it is.

**What happens with Way B instead:** an ingredient whose name fails to match is
simply not discounted, so the estimate is slightly **high**. That is the safe
direction to be wrong in — a cook who takes too much money to the shop is fine.

The panel says as much on screen: *"Prices are national averages, so treat them
as a guide."*

---

## Mistake 2 — putting the pantry in the cache key

```java
@Cacheable(cacheNames = "recipeDetails", key = "'price-' + #id")
public SpoonacularPriceBreakdown cachedPriceBreakdown(long id) { ... }
```

The thing being cached is **Spoonacular's price list**, which is a fact about
the recipe. It has nothing to do with who is looking at it. The subtraction
happens afterwards, in the service.

**What goes wrong if the pantry is in the key:** two cooks with different
pantries each spend a point to receive the *same* answer from Spoonacular. With
six teammates and a room of graders all opening the same demo recipe, that is
the difference between paying once and paying six times out of fifty.

The `'price-'` text in front of the id lets this share the `recipeDetails`
cache without clashing with the recipe itself, which is stored under the plain
id.

---

## What our endpoint sends back

```json
{
  "total": 3.92,
  "youHave": 0.20,
  "youNeed": 3.72,
  "items": [
    { "name": "garlic", "price": 0.20, "inPantry": true },
    { "name": "olive oil", "price": 1.10, "inPantry": false }
  ]
}
```

Dollars everywhere. `inPantry` is worked out fresh on each request from the
pantry in the web address — which is exactly why it cannot be cached and the
price list can.

---

## Which pantry it compares against

The **web address**. The pantry travels in the query string across the whole app
(that is what RB-188 and RB-192 built), so the panel is correct from a search
and from a recipe page opened from that search.

**A known gap we accepted:** the recipe detail page reads only the address, so
it ignores a signed-in cook's *saved* pantry from RB-208. Open a recipe from a
bare link and nothing gets discounted. Fixing it means the page falling back to
the saved pantry — a small change, deliberately not made, because RB-208a
decided the address always wins.

---

## Words used here

- **Cache key** — the value Spring uses to decide whether it has already
  answered this exact question. Two requests with the same key share one
  answer. Choosing it badly is the most common bug in this project.
- **`@Cacheable`** — a Spring annotation. The first call runs the method; later
  calls with the same key return the stored result without running it.
- **Quota / points** — Spoonacular charges each request a number of points. We
  get 50 free per key per day.

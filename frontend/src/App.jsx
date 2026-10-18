import IngredientSearch from './IngredientSearch'

/**
 * IngredientSearch is the search screen: type ingredients, see recipes that
 * use them. It was finished and tested in RB-40, but nothing ever rendered it,
 * so the app showed a hardcoded mockup instead and no search was reachable in
 * a browser.
 *
 * The mockup pages - HomePage, ResultsPage, FavoritesPage, RecipeDetailPage -
 * stay in the repo. They each get an address once the route table lands, and
 * this file becomes that table.
 *
 * Until then, do not point this at a single page to preview it: App.test.jsx
 * fails if the app stops putting a search box on screen. Render the page you
 * want to look at from its own test, or wait for the router.
 */
export default function App() {
  return <IngredientSearch />
}

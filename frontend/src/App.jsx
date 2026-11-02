import { Route, Routes } from 'react-router-dom'
import HomePage from './pages/HomePage'
import ResultsPage from './pages/ResultsPage'
import FavoritesPage from './pages/FavoritesPage'
import RecipeDetailPage from './pages/RecipeDetailPage'
import SignInPage from './pages/SignInPage'
import SignUpPage from './pages/SignUpPage'
import NavigationBar from './components/NavigationBar'

/**
 * Every address the app answers to.
 *
 * Each page has its own route, so the app can show the right screen based on
 * the browser's address. Routes are declared here; each page's layout and
 * behavior live in that page's component.
 *
 * The Home page now shows a recipe preview after a search. Its Expand link
 * navigates to /results, where the full recipe results are displayed.
 */

export default function App() {
  return (
    <>
      <NavigationBar />
      <Routes>
        {/* The Add page: enter ingredients and preview matching recipes. */}
        <Route path="/" element={<HomePage />} />

        {/* The full results page, opened from the Home page's Expand link. */}
        <Route path="/results" element={<ResultsPage />} />

        {/* Saved recipes are shown separately from search results. */}
        <Route path="/favorites" element={<FavoritesPage />} />

        {/* A recipe's ID in the address tells this page which recipe to show. */}
        <Route path="/recipe/:id" element={<RecipeDetailPage />} />

        {/* Accounts. Neither page carries the pantry list, so neither takes
            the query string the other routes pass around. */}
        <Route path="/signin" element={<SignInPage />} />
        <Route path="/signup" element={<SignUpPage />} />

        {/* Later sprints: /budget and /health go here. Nothing else has to
            change to add them - that is the point of a route table. */}
      </Routes>
    </>
  )
}

import { Route, Routes } from 'react-router-dom'
import HomePage from './pages/HomePage'
import ResultsPage from './pages/ResultsPage'
import FavoritesPage from './pages/FavoritesPage'
import RecipeDetailPage from './pages/RecipeDetailPage'

/**
 * Every address the app answers to.
 *
 * Before this, App.jsx rendered one hardcoded page, which is why the app did
 * not work in a browser even though the search code was finished and tested -
 * and why previewing a page meant editing this file and overwriting whatever
 * someone else had put here.
 *
 * Each page now has its own address, so previewing one is a matter of visiting
 * it. Please do not go back to naming a single component here; App.test.jsx
 * fails if a route stops resolving.
 */
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/results" element={<ResultsPage />} />
      <Route path="/favorites" element={<FavoritesPage />} />
      <Route path="/recipe/:id" element={<RecipeDetailPage />} />

      {/* Later sprints: /budget and /health go here. Nothing else has to
          change to add them - that is the point of a route table. */}
    </Routes>
  )
}

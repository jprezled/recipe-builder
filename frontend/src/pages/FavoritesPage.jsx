import RecipeCard from '../components/RecipeCard'

export default function FavoritesPage() {
  return (
    <main className="results-page favorites-page">
      <h1>Your Favorites</h1>
      <p className="tagline">Recipes you have saved to make again.</p>

      <div className="empty-state">
        <p className="empty-title">No favorites yet</p>
        <p>Find a recipe you like and tap Favorites. It will show up here.</p>
        <button type="button" className="button">Find Recipes</button>
      </div>


      <div className="recipe-grid">
        <RecipeCard
          title="Swiss Bircher Muesli"
          description="A creamy overnight oat breakfast with apple, yogurt, and nuts."
          imageUrl="https://img.spoonacular.com/recipes/662665-312x231.jpg"
        />
        <RecipeCard
          title="Berry Parfait"
          description="Layers of yogurt, fresh berries, and crunchy granola."
          imageUrl="https://img.spoonacular.com/recipes/662665-312x231.jpg"
        />
      </div>

      <div className="button-group">
        <button type="button" className="button button-secondary">Back to Home</button>
      </div>
    </main>
  )
}
export default function RecipeDetailPage() {
  return (
    <main className="detail-page">
      <button type="button" className="button button-secondary">Back to Recipes</button>

      <h1>Swiss Bircher Muesli</h1>
      <img
        className="detail-image"
        src="https://img.spoonacular.com/recipes/662665-312x231.jpg"
        alt="Swiss Bircher Muesli"
      />
      <p className="detail-description">
        A creamy overnight oat breakfast with apple, yogurt, and nuts. Prepare it
        the night before and it is ready to eat when you wake up.
      </p>

      <div className="button-group">
        <button type="button" className="button">Save to Favorites</button>
      </div>

      <section className="detail-section">
        <h2>Ingredients</h2>
        <ul>
          <li>1 cup rolled oats</li>
          <li>1 cup milk</li>
          <li>1/2 cup plain yogurt</li>
          <li>1 apple, grated</li>
          <li>2 tablespoons chopped nuts</li>
          <li>1 tablespoon honey</li>
        </ul>
      </section>

      <section className="detail-section">
        <h2>Instructions</h2>
        <ol>
          <li>Mix the oats, milk, and yogurt in a bowl.</li>
          <li>Cover the bowl and refrigerate overnight.</li>
          <li>In the morning, stir in the grated apple.</li>
          <li>Top with nuts and drizzle with honey.</li>
        </ol>
      </section>
    </main>
  )
}
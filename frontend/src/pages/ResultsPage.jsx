import RecipeCard from '../components/RecipeCard'

export default function ResultsPage() {
    return (
        <main className="results-page">
            <h1>Your Recipes</h1>
            <p className="tagline">Here is what you can make with the ingredients you have added.</p>

        <div className="recipe-grid">
            <RecipeCard
            title="Swiss Bircher Muesli"
            description="A creamy overnight oat breakfast with apple, yogurt, and nuts."
            imageUrl="https://img.spoonacular.com/recipes/662665-312x231.jpg"
        />
            <RecipeCard
            title="Berry Parfait"
            description="Layers of yogurt, fresh berries, and crunchy granola."
            imageUrl="https://img.spoonacular.com/recipes/716433-312x231.jpg"
        />
            <RecipeCard
            title="Veggie Omlet"
            description="A quick, fluffy omlet filled with whatever vetables you have."
            imageUrl="https://img.spoonacular.com/recipes/662665-312x231.jpg"
        />
    </div>

    <div className="button-group">
        <button type="button" className="button button-secondary">Back to Ingredients</button>
    </div>
</main>
    )
}
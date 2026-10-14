

export default function HomePage() {
    return (
        <main className="home-page">
            <h1 className ="home-title">Recipe Builder</h1>
            <p className="tagline">Make the best of the ingredients you have.</p>
            <p>     
                Tell us what is in your pantry and we'll search for recipies that best fit
                what you already have, so you can waste less food and spend less time deciding
                what to cook.
            </p>

            <div className="ingredient-entry">
                <input type="text" placeholder="Type an ingredient, e.g. eggs" />
                <button type="button" className="button">Add</button>
            </div>
            
            <h2>Your ingredients</h2>
            <ul className="ingredient-list">
                <li>Eggs</li>
                <li>Milk</li>
                <li>Flour</li>
            </ul>
            
            <div className="button-group">
                <button type="button" className="button">Generate Recipes</button>
                <button type="button" className="button button-secondary">View Favorites</button>
            </div>
            </main>
    )
}
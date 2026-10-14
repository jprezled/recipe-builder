export default function RecipeCard({ title, description, imageUrl }) {
    return (
        <article className="recipe-card">
            <img src={imageUrl} alt={title} />
            <h3>{title}</h3>
            <p>{description}</p>
        <button type="button" className="button">View Recipe</button>
    </article>
    
    
    )
}
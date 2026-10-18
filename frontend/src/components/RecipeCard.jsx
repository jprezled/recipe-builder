import FavoriteButton from './FavoriteButton'

/**
 * One recipe, as a card. Andrew's markup and all of its styling.
 *
 * His three props - title, description, imageUrl - are unchanged, because his
 * pages pass exactly those and changing the signature would break them for no
 * gain. The star is additive: pass onFavoriteChange and it appears, leave it
 * off and the card renders exactly as he wrote it.
 *
 * @param {number} [props.id]                  Spoonacular's id, needed by the star
 * @param {string} props.title
 * @param {string} props.description
 * @param {string} props.imageUrl
 * @param {boolean} [props.isFavorite]         whether the star is filled
 * @param {Function} [props.onFavoriteChange]  (id, isNowFavorite) => void
 */
export default function RecipeCard({
  id, title, description, imageUrl, isFavorite, onFavoriteChange,
}) {
  // Spoonacular sometimes omits the image, and recipes.image_url is nullable in
  // our own table too, so neither page can assume there is one.
  const hasImage = Boolean(imageUrl)

  // No handler means no star. That is what lets this card be used anywhere,
  // including pages that have nothing to do with saving.
  const canFavorite = typeof onFavoriteChange === 'function'

  return (
    <article className="recipe-card">
      {hasImage && <img src={imageUrl} alt={title} />}
      <h3>{title}</h3>
      <p>{description}</p>

      {canFavorite && (
        <FavoriteButton
          recipe={{ id, title, imageUrl }}
          isFavorite={Boolean(isFavorite)}
          onChange={onFavoriteChange}
        />
      )}

      <button type="button" className="button">View Recipe</button>
    </article>
  )
}

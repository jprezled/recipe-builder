import { Link, useLocation } from 'react-router-dom'
import FavoriteButton from './FavoriteButton'
import { formatRating } from '../lib/ratingText'

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
 * @param {Function} [props.onDragStart]       RB-210: makes the card draggable
 * @param {Array} [props.collections]         RB-210: handed on to the star
 * @param {{ average?: number, count?: number }} [props.rating] RB-294: read-only rating summary
 * @param {React.ReactNode} [props.children]  extra content for the card's foot
 */
export default function RecipeCard({
  id, title, description, imageUrl, isFavorite, onFavoriteChange, collections, rating, onDragStart, children,
}) {
  // The recipe address carries the pantry list and the filters forward. The
  // nav bar passes on whatever the current address holds, so a detail page
  // reached by a bare /recipe/123 leaves it nothing to pass and the cook
  // comes back to an empty page.
  const { search } = useLocation()

  // Spoonacular sometimes omits the image, and recipes.image_url is nullable in
  // our own table too, so neither page can assume there is one.
  const hasImage = Boolean(imageUrl)

  // No handler means no star. That is what lets this card be used anywhere,
  // including pages that have nothing to do with saving.
  const canFavorite = typeof onFavoriteChange === 'function'
  // No rating prop means no rating line - also how the results page leaves it
  // off when the ratings could not be loaded, so that never reads "No rating".
  const showRating = Boolean(rating)

  return (
    <article className="recipe-card" draggable={onDragStart ? true : undefined}
             onDragStart={onDragStart}>
      {hasImage && <img src={imageUrl} alt={title} />}
      <h3>{title}</h3>
      <p>{description}</p>
      {showRating && (
        <p className="recipe-card-rating">{formatRating(rating.average, rating.count)}</p>
      )}

      {canFavorite && (
        <FavoriteButton
          recipe={{ id, title, imageUrl }}
          isFavorite={Boolean(isFavorite)}
          onChange={onFavoriteChange}
          collections={collections}
        />
      )}

      {/* A link on Andrew's own button rather than the whole card being
          clickable: the star is a button, and a link wrapping it would both
          read as ambiguous to a screen reader and navigate when the cook
          only meant to save. Keeping his .button class means it still looks
          exactly the same. */}
      <Link className="button" to={{ pathname: '/recipe/' + id, search }}>View Recipe</Link>

      {/* Anything a page wants to hang off a card - the favourites page puts
          the cook's note and shopping list here. Cards elsewhere pass nothing
          and look the same as they always did. */}
      {children}
    </article>
  )
}

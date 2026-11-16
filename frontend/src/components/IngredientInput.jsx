import { useEffect, useRef, useState } from 'react'
import { suggestIngredients } from '../api/recipes'
import { searchCommonIngredients } from '../lib/commonIngredients'

const WAIT_BEFORE_ASKING = 300
const SHORTEST_LOOKUP = 2

export default function IngredientInput({
  id,
  label,
  hideLabel = false,
  placeholder,
  onAdd,
}) {
  const [typed, setTyped] = useState('')
  const [highlighted, setHighlighted] = useState(-1)
  const [isOpen, setIsOpen] = useState(false)
  const [remoteResults, setRemoteResults] = useState({
    query: '',
    items: [],
  })

  const alreadyAsked = useRef(new Map())
  const inputRef = useRef(null)

  const wanted = typed.trim().toLowerCase()
  const localMatches = searchCommonIngredients(typed)

  // Only show backend results belonging to the current query.
  // This immediately hides old suggestions when the text changes.
  const suggestions = localMatches.length > 0
    ? localMatches.map((name) => ({ name, imageUrl: null }))
    : remoteResults.query === wanted
      ? remoteResults.items
      : []

  useEffect(() => {
    // Common ingredients are answered locally without a request.
    if (searchCommonIngredients(wanted).length > 0) {
      return
    }

    // Comma-separated entries can still be added manually.
    // They are not useful as autocomplete queries.
    if (wanted.length < SHORTEST_LOOKUP || wanted.includes(',')) {
      return
    }

    if (alreadyAsked.current.has(wanted)) {
      setRemoteResults({
        query: wanted,
        items: alreadyAsked.current.get(wanted),
      })
      return
    }

    let stillWanted = true

    const timer = setTimeout(() => {
      suggestIngredients(wanted)
        .then((found) => {
          alreadyAsked.current.set(wanted, found)

          if (stillWanted) {
            setRemoteResults({ query: wanted, items: found })
          }
        })
        .catch(() => {
          // Suggestions are optional. Manual entry keeps working.
        })
    }, WAIT_BEFORE_ASKING)

    return () => {
      stillWanted = false
      clearTimeout(timer)
    }
  }, [wanted])

  function add(name) {
    const ingredient = name.trim()

    if (!ingredient) {
      return
    }

    onAdd(ingredient)
    setTyped('')
    setHighlighted(-1)
    setIsOpen(false)
    setRemoteResults({ query: '', items: [] })
  }

  function handleSubmit(event) {
    event.preventDefault()

    // Clicking Add always uses the actual text in the input.
    add(typed)
  }

  function handleKeyDown(event) {
    if (event.nativeEvent.isComposing) {
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      setIsOpen(false)
      setHighlighted(-1)
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()

      if (isOpen && highlighted >= 0 && suggestions[highlighted]) {
        add(suggestions[highlighted].name)
      } else {
        add(typed)
      }

      return
    }

    if (suggestions.length === 0) {
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setIsOpen(true)
      setHighlighted((position) => (
        (position + 1) % suggestions.length
      ))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setIsOpen(true)
      setHighlighted((position) => (
        position <= 0 ? suggestions.length - 1 : position - 1
      ))
    }
  }

  const showList = isOpen && suggestions.length > 0
  const activeOption = showList && highlighted >= 0
    ? `${id}-suggestion-${highlighted}`
    : undefined

  return (
    <form
      className="ingredient-input"
      onSubmit={handleSubmit}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsOpen(false)
          setHighlighted(-1)
        }
      }}
    >
      <div className="ingredient-entry">
        <label
          htmlFor={id}
          className={hideLabel ? 'visually-hidden' : undefined}
        >
          {label}
        </label>

        <div className="ingredient-autocomplete">
          <input
            ref={inputRef}
            id={id}
            type="text"
            value={typed}
            placeholder={placeholder}
            onChange={(event) => {
              setTyped(event.target.value)
              setHighlighted(-1)
              setIsOpen(true)
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            role="combobox"
            aria-expanded={showList}
            aria-controls={showList ? `${id}-suggestions` : undefined}
            aria-autocomplete="list"
            aria-activedescendant={activeOption}
            autoComplete="off"
          />

          {showList && (
            <ul
              className="suggestions"
              id={`${id}-suggestions`}
              role="listbox"
              aria-label={`${label} suggestions`}
            >
              {suggestions.map((suggestion, position) => (
                <li
                  key={suggestion.name}
                  id={`${id}-suggestion-${position}`}
                  role="option"
                  aria-selected={position === highlighted}
                  className={
                    position === highlighted ? 'suggestion-on' : undefined
                  }
                  onPointerDown={(event) => {
                    // Keep input focus until the selection click runs.
                    event.preventDefault()
                  }}
                  onClick={() => {
                    add(suggestion.name)
                    inputRef.current?.focus()
                  }}
                >
                  {suggestion.name}
                </li>
              ))}
            </ul>
          )}
        </div>

        <button type="submit" className="button">
          Add
        </button>
      </div>
    </form>
  )
}

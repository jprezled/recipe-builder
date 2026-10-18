# First iteration — Peter's static prototype

Plain HTML and CSS, not part of the running app. Peter Tran committed it on
2026-10-11 as the first iteration of the interface, before the team moved to
React.

It is kept because the colours and the font in `style.css` are the ones the real
app uses. Andrew carried them into `../src/index.css` as CSS variables:

| `style.css` | `src/index.css` |
|---|---|
| `rgb(148, 199, 186)` page background | `--color-bg` |
| `rgb(6, 76, 69)` headings | `--color-title` |
| `rgb(12, 34, 64)` sub-headings | `--color-heading` |
| `'Franklin Gothic Medium', 'Arial Narrow', Arial` | same stack |

So this folder is where the design came from, and it is worth a look before
changing those variables.

## It is not wired to anything

Nothing serves `index.html`. Vite's entry point is `../index.html`, one level up.
`app.js` contains a single `console.log` and is not referenced even by the
`index.html` beside it.

**Editing these files changes nothing in the running app.** That is the whole
reason they moved out of the repository root, where they looked like the real
front end.

To view the prototype on its own, open `index.html` in a browser directly, or
with the dev server running visit `http://localhost:5173/prototype/`.

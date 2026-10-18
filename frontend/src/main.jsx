import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'

// BrowserRouter is what makes Link, useNavigate and useSearchParams work. It
// has to sit ABOVE App, because every one of those reads from it.
//
// StrictMode deliberately runs effects twice in development, so a page that
// fetches on mount sends two requests locally. That does not cost two
// Spoonacular points - the backend cache answers the second one. See RB-74.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)

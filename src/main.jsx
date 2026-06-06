import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

// Render the app IMMEDIATELY — never block on Clerk.
// useAuth() polls window.Clerk and picks it up once ready.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Load Clerk in the background (non-blocking). Any failure is swallowed
// so the dashboard always works, with or without auth.
if (PUBLISHABLE_KEY) {
  const script = document.createElement('script')
  script.src = 'https://cdn.jsdelivr.net/npm/@clerk/clerk-js@5/dist/clerk.browser.js'
  script.async = true
  script.crossOrigin = 'anonymous'
  script.setAttribute('data-clerk-publishable-key', PUBLISHABLE_KEY)
  script.onload = () => {
    window.Clerk?.load().catch((e) => console.warn('Clerk load failed:', e?.message || e))
  }
  script.onerror = () => console.warn('Clerk script failed to load')
  document.head.appendChild(script)
}

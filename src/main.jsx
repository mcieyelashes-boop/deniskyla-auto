import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

async function init() {
  if (PUBLISHABLE_KEY) {
    // Load Clerk via script tag — exposes window.Clerk
    await new Promise((resolve) => {
      const script = document.createElement('script')
      script.src = 'https://cdn.jsdelivr.net/npm/@clerk/clerk-js@5/dist/clerk.browser.js'
      script.setAttribute('data-clerk-publishable-key', PUBLISHABLE_KEY)
      script.onload = async () => {
        await window.Clerk?.load()
        resolve()
      }
      script.onerror = resolve // fail silently, app still works
      document.head.appendChild(script)
    })
  }

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}

init()

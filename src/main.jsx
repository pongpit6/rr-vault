import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './themes.css'

// apply the saved theme before the first paint
try { document.documentElement.dataset.theme = localStorage.getItem('vault:theme') || 'pixel' } catch { document.documentElement.dataset.theme = 'pixel' }
import { applySavedAccent } from './lib/accent'
applySavedAccent()
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

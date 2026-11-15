import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './themes.css'

// apply the saved theme before the first paint
import { bootTheme } from './lib/theme'
document.documentElement.dataset.theme = bootTheme()
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

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
// keep the installed app fresh: look for a new version when it comes back to the screen and every 20 min;
// a new version installs itself and the page reloads once
import { registerSW } from 'virtual:pwa-register'
registerSW({
  immediate: true,
  onRegisteredSW(_url, r) {
    if (!r) return
    const check = () => { if (navigator.onLine) r.update().catch(() => {}) }
    setInterval(check, 20 * 60e3)
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check() })
  },
})
import ErrorBoundary from './components/ErrorBoundary'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

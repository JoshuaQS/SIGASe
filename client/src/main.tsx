import { BrowserRouter } from 'react-router-dom'
import ReactDOM from 'react-dom/client'
import './shared/styles/global.css'
import App from './app/app'
import { ThemeProvider } from './shared/hooks/use-theme'
import { initTheme } from './shared/lib/theme'
import React from 'react'


if (import.meta.env.DEV) {
  window.addEventListener('error', (event) => {
    if (event.message?.includes('ResizeObserver loop completed with undelivered notifications.')) {
      event.stopImmediatePropagation()
    }
  })
}

initTheme()

const basename = window.location.pathname.startsWith('/client') ? '/client' : '/'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <BrowserRouter basename={basename}>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </BrowserRouter>,
)
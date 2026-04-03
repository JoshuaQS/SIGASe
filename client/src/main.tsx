import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './styles/global.css'
import App from './app/App';
import { ThemeProvider } from '@//hooks/use-theme';
import { initTheme } from '@//lib/theme';

if (import.meta.env.DEV) {
  window.addEventListener('error', (event) => {
    if (event.message?.includes('ResizeObserver loop completed with undelivered notifications.')) {
      event.stopImmediatePropagation();
    }
  });
}

initTheme();

const basename = window.location.pathname.startsWith('/client') ? '/client' : '/';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <BrowserRouter basename={basename}>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </BrowserRouter>
);

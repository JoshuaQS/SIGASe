import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './styles/global.css'
import App from './app/App';
import { ThemeProvider } from '@//hooks/use-theme';
import { initTheme } from '@//lib/theme';

initTheme();

const basename = window.location.pathname.startsWith('/client') ? '/client' : '/';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <BrowserRouter basename={basename}>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </BrowserRouter>
);
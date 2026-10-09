import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App';

// apply stored theme before paint
try {
  const t = localStorage.getItem('cm-theme');
  document.documentElement.setAttribute('data-theme', t === 'light' ? 'light' : 'dark');
} catch {
  document.documentElement.setAttribute('data-theme', 'dark');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);

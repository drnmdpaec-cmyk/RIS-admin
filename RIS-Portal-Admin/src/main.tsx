import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@/styles/globals.css';
import '@/i18n/config';
import App from './App';
import { setupServiceWorker } from './services/registerServiceWorker';

setupServiceWorker();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error(
    '[RIS Admin] Root mount point (#root) not found. The application cannot start.'
  );
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);

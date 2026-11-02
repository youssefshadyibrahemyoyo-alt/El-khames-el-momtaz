import React from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from './theme/ThemeContext';
import { LanguageProvider } from './i18n/LanguageContext';
import { AppSettingsProvider } from './settings/AppSettingsContext';
import App from './App';
import './styles/styles.css';
import './styles/animations.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <LanguageProvider>
        <AppSettingsProvider>
          <App />
        </AppSettingsProvider>
      </LanguageProvider>
    </ThemeProvider>
  </React.StrictMode>
);

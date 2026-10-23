import React from 'react';
import ReactDOM from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { AppConfigProvider } from './context/AppConfigContext';
import App from './App.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HelmetProvider>
      <AppConfigProvider>
        <App />
      </AppConfigProvider>
    </HelmetProvider>
  </React.StrictMode>
);

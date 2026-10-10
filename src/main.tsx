import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { TabulytixIntroSplash } from './components/loading/TabulytixIntroSplash';
import './index.css';

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <TabulytixIntroSplash />
      <App />
    </React.StrictMode>
  );
}

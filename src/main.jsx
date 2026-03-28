import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { useAppStore } from './store/useAppStore';
import './index.css';

const updateServiceWorker = registerSW({
  immediate: true,
  onNeedRefresh() {
    useAppStore.getState().setRuntimeUpdateReady(updateServiceWorker);
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

import App from './App';
import reportWebVitals from './reportWebVitals';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import rootReducer from './slices';
import { CurrencyProvider } from './contexts/CurrencyContext';

const store = configureStore({ reducer: rootReducer, devTools: true });

// ¡NUEVO! Exportamos los tipos directamente desde el store.
// Esta es la forma recomendada por Redux Toolkit.
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <Provider store={store}>
    <CurrencyProvider>
      <React.StrictMode>
        <BrowserRouter basename={process.env.PUBLIC_URL}>
          <App />
        </BrowserRouter>
      </React.StrictMode>
    </CurrencyProvider>
  </Provider>
);

reportWebVitals();
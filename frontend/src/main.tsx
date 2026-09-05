import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

import App from './App';
import { AuthProvider } from './context/AuthContext';

// Tailwind v4 + shadcn theme. Imported first: it declares the `legacy` cascade
// layer, and its unlayered :root wins the token overlap (--primary, --accent).
import './styles/globals.css';
// Legacy vanilla CSS for the not-yet-migrated app shell, confined to the low
// priority `legacy` layer so Tailwind utilities outrank it.
import './styles/legacy.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 30, // 30 seconds
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);

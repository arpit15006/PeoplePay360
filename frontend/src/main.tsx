import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

import App from './App';
import { AuthProvider } from './context/AuthContext';
import { TooltipProvider } from './components/ui/tooltip';
import { Toaster } from './components/ui/sonner';

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
          {/* Sidebar menu buttons render tooltips when collapsed to icons. */}
          <TooltipProvider>
            <App />
            {/* Toast host for payrun actions (Compute, Validate, Mark Paid, Send). */}
            <Toaster richColors position='top-right' />
          </TooltipProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);

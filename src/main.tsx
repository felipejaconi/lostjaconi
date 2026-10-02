import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from "./App.tsx";
import "./index.css";

const queryClient = new QueryClient();

// Clear CacheStorage that might have stale html files from past Service Workers
if ('caches' in window) {
  caches.keys().then((names) => {
    for (const name of names) {
      caches.delete(name);
    }
  }).catch(err => console.error('Error clearing caches:', err));
}

// Unregister any existing service workers that might be aggressively caching
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister().then(
        () => console.log('Service Worker unregistered successfully.'),
        (err) => console.error('Service Worker unregistration failed: ', err)
      );
    }
  }).catch(err => console.error('Error fetching service worker registrations:', err));
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);

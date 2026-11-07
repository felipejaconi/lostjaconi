import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from "./App.tsx";
import "./index.css";

// -------------------------------------------------------------
// Estratégia Avançada de Cache & Invalidação de Versões Antigas
// -------------------------------------------------------------

/**
 * Limpa completamente a CacheStorage do navegador e desregistra
 * quaisquer Service Workers ativos de versões anteriores.
 */
async function purgeAllCaches(): Promise<void> {
  try {
    // 1. Limpa todas as instâncias no CacheStorage
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(
        keys.map(async (key) => {
          try {
            await caches.delete(key);
            console.log(`[Cache] Cache removido: ${key}`);
          } catch (e) {
            console.warn(`[Cache] Falha ao remover cache ${key}:`, e);
          }
        })
      );
    }

    // 2. Desregistra todos os Service Workers registrados
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        try {
          await registration.unregister();
          console.log('[Cache] Service Worker desregistrado com sucesso.');
        } catch (e) {
          console.warn('[Cache] Falha ao desregistrar Service Worker:', e);
        }
      }
    }
  } catch (err) {
    console.error('[Cache] Erro durante a limpeza de caches:', err);
  }
}

/**
 * Se um Service Worker antigo estiver controlando ativamente a página e
 * interceptando requisições, remove e força um reload para conexão direta.
 */
function handleActiveServiceWorkerController() {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    console.warn('[Cache] Service Worker antigo detectado controlando requisições. Removendo...');
    purgeAllCaches().then(() => {
      const lastReloadKey = 'sw_controller_unreg_reload';
      const lastReload = sessionStorage.getItem(lastReloadKey);
      const now = Date.now();
      // Limite de segurança de 15 segundos para evitar loop infinito
      if (!lastReload || now - parseInt(lastReload, 10) > 15000) {
        sessionStorage.setItem(lastReloadKey, String(now));
        window.location.reload();
      }
    });
  }
}

/**
 * Trata erros de carregamento de chunks dinâmicos (muito comum quando há novo deploy
 * e o Vite altera os hashes dos arquivos estáticos).
 */
function setupDynamicImportErrorRecovery() {
  // Vite específico: quando um chunk dinâmico falha ao carregar
  window.addEventListener('vite:preloadError', (event) => {
    console.warn('[Cache] Falha ao carregar chunk dinâmico (vite:preloadError). Atualizando para a versão mais recente...');
    event.preventDefault();

    const lastReloadKey = 'vite_preload_last_reload';
    const lastReload = sessionStorage.getItem(lastReloadKey);
    const now = Date.now();

    if (!lastReload || now - parseInt(lastReload, 10) > 15000) {
      sessionStorage.setItem(lastReloadKey, String(now));
      purgeAllCaches().finally(() => {
        window.location.reload();
      });
    }
  });

  // Erros genéricos de importação dinâmica em navegadores antigos ou WebKit
  window.addEventListener('error', (event) => {
    const errorMsg = (event?.message || '').toLowerCase();
    if (
      errorMsg.includes('failed to fetch dynamically imported module') ||
      errorMsg.includes('loading chunk') ||
      errorMsg.includes('error loading dynamically imported module')
    ) {
      console.warn('[Cache] Erro de importação dinâmica detectado:', event.message);
      const lastReloadKey = 'dynamic_import_error_reload';
      const lastReload = sessionStorage.getItem(lastReloadKey);
      const now = Date.now();

      if (!lastReload || now - parseInt(lastReload, 10) > 15000) {
        sessionStorage.setItem(lastReloadKey, String(now));
        purgeAllCaches().finally(() => {
          window.location.reload();
        });
      }
    }
  });
}

/**
 * Verifica no servidor se existe uma nova versão de index.html com novos bundles.
 * Se houver novos hashes de scripts, limpa os caches e atualiza a aplicação.
 */
let isCheckingUpdate = false;
async function checkForAppUpdates() {
  if (isCheckingUpdate || import.meta.env.DEV) return;
  isCheckingUpdate = true;

  try {
    const response = await fetch(`/index.html?nocache=${Date.now()}`, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
      cache: 'no-store',
    });

    if (!response.ok) return;

    const htmlText = await response.text();

    // Scripts carregados atualmente na página
    const currentScriptUrls = Array.from(document.querySelectorAll('script[src]'))
      .map((el) => el.getAttribute('src'))
      .filter((src): src is string => Boolean(src && src.includes('/assets/')));

    // Extrai os caminhos de assets do HTML recebido
    const scriptMatches = htmlText.match(/src="(\/assets\/[^"]+)"/g) || [];
    const newScriptUrls = scriptMatches.map((m) => m.replace(/src="|"/g, ''));

    if (newScriptUrls.length > 0 && currentScriptUrls.length > 0) {
      const hasNewBundle = newScriptUrls.some((newUrl) => !currentScriptUrls.includes(newUrl));
      if (hasNewBundle) {
        console.log('[Cache] Nova versão detectada no servidor! Atualizando aplicação...');
        await purgeAllCaches();
        window.location.reload();
      }
    }
  } catch (err) {
    // Falha silenciosa de verificação de versão (ex: sem conexão de rede momentânea)
    console.debug('[Cache] Verificação de versão secundária:', err);
  } finally {
    isCheckingUpdate = false;
  }
}

// Inicializa proteções e limpezas
purgeAllCaches();
handleActiveServiceWorkerController();
setupDynamicImportErrorRecovery();

// Verifica novas versões quando o usuário retorna à aba ou periodicamente
if (typeof window !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkForAppUpdates();
    }
  });
  window.addEventListener('focus', () => {
    checkForAppUpdates();
  });

  // Verificação periódica a cada 5 minutos
  setInterval(checkForAppUpdates, 5 * 60 * 1000);

  // Verificação inicial após 4 segundos
  setTimeout(checkForAppUpdates, 4000);

  // Utilitário global para suporte/depuração se necessário
  (window as unknown as { __clearAppCacheAndReload?: () => Promise<void> }).__clearAppCacheAndReload = async () => {
    console.log('[Cache] Forçando limpeza total de cache e reload...');
    await purgeAllCaches();
    window.location.href = window.location.pathname + '?nocache=' + Date.now();
  };
}

// Configuração do React Query com invalidação e tempos adequados
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutos para dados da API
      gcTime: 1000 * 60 * 10,   // 10 minutos no lixo de memória
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 1,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);


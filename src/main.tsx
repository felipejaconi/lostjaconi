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
 * Revalida o HTML da rota atual ignorando o cache HTTP do navegador/proxy
 * e recarrega a página de forma limpa sem poluir a URL.
 */
async function performCleanReload(): Promise<void> {
  await purgeAllCaches();
  try {
    await fetch(window.location.pathname, {
      method: 'GET',
      cache: 'reload',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
    });
  } catch {
    // Segue para o reload mesmo se a revalidação prévia falhar
  }
  window.location.reload();
}

/**
 * Se um Service Worker antigo estiver controlando ativamente a página e
 * interceptando requisições, remove e força um reload para conexão direta.
 */
function isPreviewIframeOrDev(): boolean {
  if (import.meta.env.DEV) return true;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function handleActiveServiceWorkerController() {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    console.warn('[Cache] Service Worker antigo detectado controlando requisições. Removendo...');
    if (isPreviewIframeOrDev() || document.visibilityState !== 'visible') {
      purgeAllCaches();
      return;
    }
    const lastReloadKey = 'sw_controller_unreg_reload';
    const lastReload = sessionStorage.getItem(lastReloadKey);
    const now = Date.now();
    if (!lastReload || now - parseInt(lastReload, 10) > 15000) {
      sessionStorage.setItem(lastReloadKey, String(now));
      performCleanReload();
    } else {
      purgeAllCaches();
    }
  }
}

function isDynamicChunkErrorMessage(raw: string): boolean {
  const msg = (raw || '').toLowerCase();
  return (
    msg.includes('failed to fetch dynamically imported module') ||
    msg.includes('loading chunk') ||
    msg.includes('chunkloaderror') ||
    msg.includes('error loading dynamically imported module') ||
    msg.includes('importing a module script failed')
  );
}

function triggerChunkRecoveryReload(storageKey: string) {
  if (isPreviewIframeOrDev() || document.visibilityState !== 'visible') {
    return;
  }
  const lastReload = sessionStorage.getItem(storageKey);
  const now = Date.now();
  if (!lastReload || now - parseInt(lastReload, 10) > 15000) {
    sessionStorage.setItem(storageKey, String(now));
    performCleanReload();
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
    triggerChunkRecoveryReload('vite_preload_last_reload');
  });

  // Erros genéricos de importação dinâmica em navegadores
  window.addEventListener('error', (event) => {
    const errorMsg = event?.message || String((event as ErrorEvent)?.error?.message || '');
    if (isDynamicChunkErrorMessage(errorMsg)) {
      console.warn('[Cache] Erro de importação dinâmica detectado:', errorMsg);
      triggerChunkRecoveryReload('dynamic_import_error_reload');
    }
  });

  // Promessas rejeitadas de import() dinâmico (ex.: rotas lazy em Ubuntu/Nginx)
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event?.reason;
    const reasonMsg =
      typeof reason === 'string'
        ? reason
        : String(reason?.message || reason?.name || '');
    if (isDynamicChunkErrorMessage(reasonMsg)) {
      console.warn('[Cache] Rejeição de importação dinâmica detectada:', reasonMsg);
      event.preventDefault?.();
      triggerChunkRecoveryReload('dynamic_import_rejection_reload');
    }
  });
}

/**
 * Verifica no servidor (primeiro via /api/version, que nunca sofre cache de Nginx/Cloudflare,
 * e com fallback para /index.html) se existe um novo build publicado.
 */
let isCheckingUpdate = false;
async function checkForAppUpdates() {
  if (isCheckingUpdate || import.meta.env.DEV) return;

  // Scripts de produção carregados atualmente no DOM
  const currentScriptUrls = Array.from(document.querySelectorAll('script[src]'))
    .map((el) => el.getAttribute('src'))
    .filter((src): src is string => Boolean(src && src.includes('/assets/')));

  // Se não houver scripts /assets/ no DOM, não estamos num bundle compilado de produção
  if (currentScriptUrls.length === 0) return;

  isCheckingUpdate = true;

  try {
    let newScriptUrls: string[] = [];

    // 1. Tenta via /api/version (passa direto pelo proxy reverso no Ubuntu e na Hostinger)
    try {
      const apiRes = await fetch(`/api/version?_t=${Date.now()}`, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      });
      if (apiRes.ok) {
        const data = await apiRes.json();
        if (Array.isArray(data?.scripts) && data.scripts.length > 0) {
          newScriptUrls = data.scripts;
        }
      }
    } catch {
      // Fallback para /index.html abaixo
    }

    // 2. Fallback: lê /index.html diretamente se /api/version não trouxe scripts
    if (newScriptUrls.length === 0) {
      const response = await fetch(`/index.html?nocache=${Date.now()}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
        cache: 'no-store',
      });

      if (response.ok) {
        const htmlText = await response.text();
        const scriptMatches = htmlText.match(/src="(\/assets\/[^"]+)"/g) || [];
        newScriptUrls = scriptMatches.map((m) => m.replace(/src="|"/g, ''));
      }
    }

    if (newScriptUrls.length > 0) {
      const hasNewBundle = newScriptUrls.some((newUrl) => !currentScriptUrls.includes(newUrl));
      if (hasNewBundle) {
        const targetSignature = newScriptUrls.slice().sort().join('|');
        const lastTarget = sessionStorage.getItem('app_update_target_sig');
        const lastAttempt = parseInt(sessionStorage.getItem('app_update_last_reload') || '0', 10);
        const now = Date.now();

        // Proteção anti-loop caso um CDN externo demore alguns segundos a propagar o HTML
        if (lastTarget !== targetSignature || now - lastAttempt > 45000) {
          console.log('[Cache] Nova versão detectada no servidor! Atualizando aplicação...');
          sessionStorage.setItem('app_update_target_sig', targetSignature);
          sessionStorage.setItem('app_update_last_reload', String(now));
          await performCleanReload();
        }
      }
    }
  } catch (err) {
    console.debug('[Cache] Verificação de versão secundária:', err);
  } finally {
    isCheckingUpdate = false;
  }
}

// Inicializa proteções e limpezas
purgeAllCaches();
handleActiveServiceWorkerController();
setupDynamicImportErrorRecovery();

// Verifica novas versões quando o usuário retorna à aba, reconecta ou periodicamente
if (typeof window !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkForAppUpdates();
    }
  });
  window.addEventListener('focus', () => {
    checkForAppUpdates();
  });
  window.addEventListener('online', () => {
    checkForAppUpdates();
  });

  // Verificação periódica a cada 2 minutos
  setInterval(checkForAppUpdates, 2 * 60 * 1000);

  // Verificação inicial após 3 segundos
  setTimeout(checkForAppUpdates, 3000);

  // Utilitário global para suporte/depuração se necessário
  (window as unknown as { __clearAppCacheAndReload?: () => Promise<void> }).__clearAppCacheAndReload = async () => {
    console.log('[Cache] Forçando limpeza total de cache e reload...');
    await performCleanReload();
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


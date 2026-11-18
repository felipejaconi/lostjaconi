import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  errorType: "chunk_error" | "general_error" | null;
  reloadBlockedByCooldown?: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorType: null,
    reloadBlockedByCooldown: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    const msg = (error?.message || "").toLowerCase();
    const isChunkError =
      error?.name === "ChunkLoadError" ||
      msg.includes("dynamically imported module") ||
      msg.includes("loading chunk") ||
      msg.includes("importing a module script failed");

    return {
      hasError: true,
      errorType: isChunkError ? "chunk_error" : "general_error",
      reloadBlockedByCooldown: false,
    };
  }

  private forceFreshReload = async () => {
    const helper = (window as unknown as { __clearAppCacheAndReload?: () => Promise<void> })
      .__clearAppCacheAndReload;
    if (helper) {
      await helper();
    } else {
      window.location.reload();
    }
  };

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);

    if (this.state.errorType === "chunk_error") {
      const lastReload = sessionStorage.getItem("last_chunk_boundary_reload");
      const now = Date.now();

      if (!lastReload || now - parseInt(lastReload, 10) > 15000) {
        sessionStorage.setItem("last_chunk_boundary_reload", now.toString());
        this.forceFreshReload();
      } else {
        (this as any).setState({ reloadBlockedByCooldown: true });
      }
    }
  }

  public render() {
    if (this.state.hasError) {
      if (this.state.errorType === "chunk_error" && !this.state.reloadBlockedByCooldown) {
        return (
          <div className="h-screen w-full bg-[#050505] flex items-center justify-center">
            <img
              src="/pwa-192x192.png"
              alt="Atualizando..."
              className="w-12 h-12 animate-spin opacity-80"
            />
          </div>
        );
      }

      return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-[#050505] text-white p-6 text-center">
          <h1 className="text-2xl font-bold mb-4">
            {this.state.errorType === "chunk_error"
              ? "Nova versão disponível"
              : "Aconteceu um erro inesperado"}
          </h1>
          <p className="text-slate-400 mb-6 max-w-md mx-auto">
            {this.state.errorType === "chunk_error"
              ? "O sistema foi atualizado no servidor. Clique abaixo para abrir a versão mais recente."
              : "A aplicação encontrou um problema ao tentar carregar esta página."}
          </p>
          <button
            onClick={() => this.forceFreshReload()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] cursor-pointer"
          >
            Recarregar Página
          </button>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

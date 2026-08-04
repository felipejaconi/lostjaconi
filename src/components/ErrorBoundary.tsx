import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  errorType: "chunk_error" | "general_error" | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorType: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    const isChunkError =
      error.name === "ChunkLoadError" ||
      error.message.includes("dynamically imported module") ||
      error.message.includes("Failed to fetch dynamically imported module");
      
    return { hasError: true, errorType: isChunkError ? "chunk_error" : "general_error" };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    
    // Auto-reload on ChunkLoadError
    if (this.state.errorType === "chunk_error") {
      window.location.reload();
    }
  }

  public render() {
    if (this.state.hasError) {
      if (this.state.errorType === "chunk_error") {
         return (
           <div className="h-screen w-full bg-[#050505] flex items-center justify-center">
              <img src={`${import.meta.env.VITE_SUPABASE_URL || "https://ybaoaskddcmwoincsnwm.supabase.co"}/storage/v1/object/public/uploads/icon.png`} alt="Carregando..." className="w-12 h-12 animate-spin opacity-80" />
           </div>
         );
      }

      return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-[#050505] text-white p-6 text-center">
          <h1 className="text-2xl font-bold mb-4">Aconteceu um erro inesperado</h1>
          <p className="text-slate-400 mb-6 max-w-md mx-auto">
             A aplicação encontrou um problema ao tentar carregar esta página.
          </p>
          <button 
             onClick={() => window.location.reload()} 
             className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)]"
          >
             Recarregar Página
          </button>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

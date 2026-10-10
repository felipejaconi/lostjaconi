import React, { useEffect } from "react";
import { X, Package, Layers, CircleDollarSign } from "lucide-react";
import { OptimizedImage } from "./OptimizedImage";

interface ProductDescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: any | null;
  adminMode?: boolean; // Show admin stock details
}

export function ProductDescriptionModal({ isOpen, onClose, product, adminMode = false }: ProductDescriptionModalProps) {
  // To allow CSS transition on unmount, we could use framer-motion or simple timeout.
  // Since we want simple, let's just use standard conditional rendering with a backdrop click.
  
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => { document.body.style.overflow = "auto"; };
  }, [isOpen]);

  if (!isOpen || !product) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 "
      onClick={onClose}
    >
      <div 
        className="w-full max-w-sm bg-[#18181b] rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative w-full h-64 bg-black">
          {product.imagem_url ? (
            <OptimizedImage 
              src={product.imagem_url} 
              className="w-full h-full object-contain" 
              priority
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-black/60">
              <Package className="w-16 h-16 text-slate-500/50" />
            </div>
          )}
          
          <button 
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 border border-white/20 text-white flex items-center justify-center hover:bg-black/70  transition-all z-10"
          >
            <X size={16} />
          </button>
        </div>
        
        <div className="p-4 overflow-y-auto max-h-[50vh] custom-scrollbar">
          <h2 className="text-lg font-bold text-white leading-tight">
            {product.nome}
          </h2>
          {product.codigo_barras && adminMode && (
            <p className="text-[10px] font-mono text-zinc-500 mb-2 mt-1 uppercase tracking-widest">{product.codigo_barras}</p>
          )}

          {adminMode && (
            <div className="grid grid-cols-2 gap-2 mt-3 mb-3">
              <div className="bg-white/5 border border-white/10 rounded-xl p-2 flex flex-col justify-center">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 flex items-center gap-1"><Layers size={10}/> Quantidade</p>
                <p className="text-base font-black text-white">
                  {product.stock_armazem || 0} <span className="text-[10px] text-slate-500 font-bold uppercase">{product.unidade_base || 'un'}</span>
                </p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-2 flex flex-col justify-center">
                <p className="text-[9px] font-bold text-emerald-400/70 uppercase tracking-widest mb-0.5 flex items-center gap-1"><CircleDollarSign size={10}/> Valor Total (PVP)</p>
                <p className="text-base font-black text-emerald-400">
                  €{(Number(product.stock_armazem || 0) * Number(product.preco || 0)).toFixed(2)}
                </p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-2 flex flex-col justify-center">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Custo Un.</p>
                <p className="text-xs font-bold text-slate-300">
                  €{Number(product.preco_custo || 0).toFixed(2)}
                </p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-2 flex flex-col justify-center">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">P.V.P Un.</p>
                <p className="text-xs font-bold text-blue-400">
                  €{Number(product.preco || 0).toFixed(2)}
                </p>
              </div>
            </div>
          )}

          <div className="w-full h-px bg-white/10 my-3"></div>
          
          <div className="text-slate-300 text-xs leading-relaxed whitespace-pre-wrap">
            {product.descricao ? product.descricao : (
              <span className="text-slate-500 italic">Sem descrição disponível para este produto.</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useRef } from "react";
import {
  Routes,
  Route,
  Link,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { BrandName } from "../../components/Logo";
import { BrandTitle } from "../../components/BrandTitle";
import {
  Package,
  ShoppingCart, Trash2, CheckSquare,
  History,
  ClipboardCheck,
  Bell,
  Search,
  Plus,
  ArrowRight,
  CheckCircle2,
  Clock,
} from "lucide-react";
import api from "../../lib/api";
import { supabase } from "../../lib/supabase";
import { OptimizedImage } from "../../components/OptimizedImage";
import { useAuth } from "../../context/AuthContext";

import { ProductDescriptionModal } from "../../components/ProductDescriptionModal";

interface ProductItemProps {
  p: any;
  inCartQty: number;
  currentStoreQty: number;
  isOutOfStock: boolean;
  addToCart: (product: any, unit?: string) => void;
  removeFromCart: (id: number, unit: string) => void;
  priority?: boolean;
  onProductClick: (product: any) => void;
}

const ProductItem = React.memo(({ p, inCartQty, currentStoreQty, isOutOfStock, addToCart, removeFromCart, priority, onProductClick }: ProductItemProps) => {
  return (
    <div className={`flex items-center justify-between p-3 rounded-xl border  ${isOutOfStock ? "bg-black/80 border-red-500/20 opacity-60 grayscale" : "bg-[#050505]/90 border-white/5 hover:bg-[#111]/90"}`}>
      <div 
        className="flex items-center gap-3 flex-1 min-w-0 pr-2 cursor-pointer group"
        onClick={() => onProductClick(p)}
      >
        <div className="w-12 h-12 bg-black/60 rounded-lg overflow-hidden border border-white/5 shrink-0 flex items-center justify-center transition-transform group-hover:scale-105">
          {p.imagem_url ? (
             <OptimizedImage src={p.imagem_url} priority={priority} className="w-full h-full object-cover" />
          ) : (
             <Package className="w-6 h-6 text-slate-500/50" />
          )}
        </div>
        <div className="flex flex-col min-w-0">
          <p className="font-black text-sm text-yellow-500 truncate group-hover:text-yellow-400 transition-colors">{p.nome}</p>
          <div className="flex items-center gap-2 mt-0.5 whitespace-nowrap flex-wrap">
             <span className="text-xs font-bold text-emerald-400">€{p.preco.toFixed(2)}</span>
             <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-md">
               {p.unidade_compra || p.unidade_base || 'un'}
             </span>
             
             {/* Info Stock Loja */}
             <div className="flex items-center gap-1.5 border-l border-white/10 pl-2 ml-1">
               <span className="text-[10px] text-slate-400">Stock Loja: <strong className={currentStoreQty <= 2 ? "text-red-500" : currentStoreQty <= 4 ? "text-yellow-500" : "text-emerald-500"}>{currentStoreQty}</strong></span>
             </div>
             
             {isOutOfStock && <span className="text-[9px] uppercase font-black text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded ml-2">Esgotado</span>}
          </div>
        </div>
      </div>
      
      <div className="shrink-0">
        {inCartQty === 0 ? (
           <button 
             onClick={() => addToCart(p, p.unidade_compra || p.unidade_base || 'un')}
             disabled={isOutOfStock}
             // Borda apenas, sem cor de fundo, icone +
             className="w-10 h-10 border border-yellow-500/50 text-yellow-500 rounded-xl hover:bg-yellow-500/10 active:bg-yellow-500/20 active:scale-95 transition-all flex items-center justify-center disabled:opacity-50 disabled:grayscale focus:outline-none"
           >
             <Plus size={20} strokeWidth={2.5} />
           </button>
        ) : (
           <div className="flex items-center gap-1 sm:gap-2 border border-white/10 px-1 py-1 rounded-xl">
             <button 
               onClick={() => removeFromCart(p.id, p.unidade_compra || p.unidade_base || 'un')} 
               className="p-1.5 sm:p-2 text-slate-300 hover:text-red-400 rounded-lg hover:bg-red-500/10 active:scale-90 transition-all focus:outline-none"
             >
               <Trash2 size={16} strokeWidth={2.5} />
             </button>
             <span className="w-5 text-center font-black text-white text-sm focus:outline-none">{inCartQty}</span>
             <button 
               onClick={() => addToCart(p, p.unidade_compra || p.unidade_base || 'un')} 
               disabled={isOutOfStock} 
               className="p-1.5 sm:p-2 text-yellow-500 hover:text-yellow-400 rounded-lg hover:bg-yellow-500/10 active:scale-90 disabled:opacity-50 transition-all focus:outline-none"
             >
               <Plus size={16} strokeWidth={2.5} />
             </button>
           </div>
        )}
      </div>
    </div>
  );
});

export default function StoreHome() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);

  const fetchStats = () => {
    api.get("/store/stats").then((res) => setStats(res.data));
  };

  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchStats();

    const channel = supabase
      .channel("store-home-orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pedidos" },
        () => {
          if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
          fetchTimeoutRef.current = setTimeout(() => fetchStats(), 500);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
    };
  }, []);

  const navigate = useNavigate();

  return (
    <div className="h-full flex flex-col p-4 sm:p-6 lg:p-8 gap-4 sm:gap-6 max-w-5xl mx-auto w-full">
      <div className="flex flex-col items-center justify-center shrink-0 w-full mb-2">
        <BrandTitle />
        {user?.name && (
          <h2 
            className="text-lg sm:text-2xl lg:text-3xl text-[#facc15] mt-0 text-center tracking-wide"
            style={{ 
              fontFamily: "'Yellowtail', cursive",
              textShadow: "2px 2px 4px rgba(0,0,0,0.5)"
            }}
          >
             {user.name}
          </h2>
        )}
      </div>

      <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 w-full h-full pb-4">
        {/* 1. Pedido Diário */}
        <div 
          onClick={() => navigate('/store/pedido')}
          className="bg-[#0a0a0a] border border-white/10 p-4 sm:p-6 rounded-xl relative overflow-hidden group hover:border-blue-500/50 transition-colors cursor-pointer flex flex-col items-center text-center shadow-lg min-h-[160px] lg:min-h-[220px] justify-between"
        >
          <div className="flex flex-col items-center justify-center flex-1 group-hover:-translate-y-1 transition-transform duration-300 w-full">
            <div className="w-10 h-10 sm:w-14 sm:h-14 shrink-0 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center mb-2 sm:mb-3 group-hover:bg-blue-500/10 group-hover:border-blue-500/30 transition-colors">
              <ShoppingCart className="text-blue-500 w-5 h-5 sm:w-7 sm:h-7" strokeWidth={1.5} />
            </div>
            <h3 className="text-white font-semibold text-[13px] sm:text-[15px] lg:text-lg tracking-tight mb-1 leading-tight">Pedido Diário</h3>
            <p className="text-slate-400 text-[10px] sm:text-[11px] lg:text-sm leading-snug line-clamp-2 max-w-[180px]">
              Faça a reposição obrigatória diária de produtos.
            </p>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs font-semibold text-slate-500 group-hover:text-blue-500 mt-2 transition-colors w-full justify-center shrink-0">
            Fazer Pedido <ArrowRight className="group-hover:translate-x-1 transition-transform w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </div>
        </div>

        {/* 2. Avisos */}
        <div 
          onClick={() => navigate('/store/notificacoes')}
          className="bg-[#0a0a0a] border border-white/10 p-4 sm:p-6 rounded-xl relative overflow-hidden group hover:border-orange-500/50 transition-colors cursor-pointer flex flex-col items-center text-center shadow-lg min-h-[160px] lg:min-h-[220px] justify-between"
        >
          <div className="flex flex-col items-center justify-center flex-1 group-hover:-translate-y-1 transition-transform duration-300 w-full">
            <div className="w-10 h-10 sm:w-14 sm:h-14 shrink-0 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center mb-2 sm:mb-3 relative group-hover:bg-orange-500/10 group-hover:border-orange-500/30 transition-colors">
              <Bell className="text-orange-500 w-5 h-5 sm:w-7 sm:h-7" strokeWidth={1.5} />
              {stats?.notificacoesAtivas > 0 && (
                 <span className="absolute -top-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-orange-500 rounded-full border-2 border-[#0a0a0a]"></span>
              )}
            </div>
            <h3 className="text-white font-semibold text-[13px] sm:text-[15px] lg:text-lg tracking-tight mb-1 leading-tight">Avisos e Alertas</h3>
            <p className="text-slate-300 text-lg sm:text-2xl lg:text-3xl font-light mt-0 sm:mt-1 lg:mt-2 tracking-tighter">
              <span className="text-orange-500 font-medium px-1">{stats?.notificacoesAtivas || 0}</span>ativos
            </p>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs font-semibold text-slate-500 group-hover:text-orange-500 mt-2 transition-colors w-full justify-center shrink-0">
            Ver Todos <ArrowRight className="group-hover:translate-x-1 transition-transform w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </div>
        </div>

        {/* 3. Histórico */}
        <div 
          onClick={() => navigate('/store/historico')}
          className="bg-[#0a0a0a] border border-white/10 p-4 sm:p-6 rounded-xl relative overflow-hidden group hover:border-emerald-500/50 transition-colors cursor-pointer flex flex-col items-center text-center shadow-lg min-h-[160px] lg:min-h-[220px] justify-between"
        >
          <div className="flex flex-col items-center justify-center flex-1 group-hover:-translate-y-1 transition-transform duration-300 w-full">
            <div className="w-10 h-10 sm:w-14 sm:h-14 shrink-0 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center mb-2 sm:mb-3 relative group-hover:bg-emerald-500/10 group-hover:border-emerald-500/30 transition-colors">
              <Clock className="text-emerald-500 w-5 h-5 sm:w-7 sm:h-7" strokeWidth={1.5} />
            </div>
            <h3 className="text-white font-semibold text-[13px] sm:text-[15px] lg:text-lg tracking-tight mb-1 leading-tight">Histórico</h3>
            <p className="text-slate-400 text-[10px] sm:text-[11px] lg:text-sm leading-snug line-clamp-2 max-w-[180px]">
              Visualize todos os seus pedidos anteriores.
            </p>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs font-semibold text-slate-500 group-hover:text-emerald-500 mt-2 transition-colors w-full justify-center shrink-0">
            Aceder Histórico <ArrowRight className="group-hover:translate-x-1 transition-transform w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </div>
        </div>

        {/* 4. A Gerência */}
        <div 
          onClick={() => navigate('/store/management')}
          className="bg-[#0a0a0a] border border-white/10 p-4 sm:p-6 rounded-xl relative overflow-hidden flex flex-col items-center text-center shadow-lg min-h-[160px] lg:min-h-[220px] justify-between transition-all duration-500 opacity-80 cursor-pointer grayscale-[50%] hover:grayscale-0 hover:opacity-100 hover:border-yellow-500/50 group"
        >
          {/* Background Watermark Image */}
          <div className="absolute inset-0 z-0 opacity-10 flex items-center justify-center group-hover:opacity-20 transition-opacity duration-500 pointer-events-none blur-sm">
            <img 
              src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/uploads/icon.png`}
              className="w-48 h-48 object-contain scale-150"
              alt="Background Logo"
              crossOrigin="anonymous"
            />
          </div>
          
          <div className="flex flex-col items-center justify-center flex-1 group-hover:-translate-y-1 transition-transform duration-300 w-full relative z-10">
            <img 
              src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/uploads/icon.png`}
              alt="Lost Wind Lda" 
              className="w-16 h-16 sm:w-20 sm:h-20 lg:w-28 lg:h-28 object-contain transition-all duration-500 mb-2 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]"
              crossOrigin="anonymous"
            />
            <h3 className="text-white font-semibold text-[13px] sm:text-[15px] lg:text-lg tracking-tight mb-1 leading-tight group-hover:text-yellow-500 transition-colors">A Gerência</h3>
            <p className="text-slate-400 text-[10px] sm:text-[11px] lg:text-sm leading-snug line-clamp-2 max-w-[180px]">
              Estatísticas, metas e financeiro.
            </p>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs font-semibold text-slate-500 group-hover:text-yellow-500 mt-2 transition-colors w-full justify-center shrink-0 z-10">
            Aceder Gerência <ArrowRight className="group-hover:translate-x-1 transition-transform w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </div>
        </div>
      </div>
    </div>
  );
}


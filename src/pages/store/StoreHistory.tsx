import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Package,
  ArrowDownLeft,
  ArrowLeft,
  Plus
} from "lucide-react";
import api from "../../lib/api";
import { supabase } from "../../lib/supabase";
import { OptimizedImage } from "../../components/OptimizedImage";
import { formatDynamicBracketText } from "../../lib/formatUtils";

export default function StoreHistory() {
  const [orders, setOrders] = useState<any[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const fetchOrders = () => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    api.get(`/pedidos?startDate=${date.toISOString()}`).then((res) => {
      const data = Array.isArray(res.data) ? res.data : [];
      const sortedOrders = data.map((order: any) => {
        const itens = Array.isArray(order.pedido_itens) ? order.pedido_itens : [];
        return {
          ...order,
          pedido_itens: itens.sort((a: any, b: any) => (a.produto?.nome || "").localeCompare(b.produto?.nome || ""))
        };
      });
      setOrders(sortedOrders);
    }).catch((err) => {
      console.error("Error fetching orders:", err);
    });
  };

  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchOrders();

    const channel = supabase
      .channel("store-history-orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pedidos" },
        () => {
          if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
          fetchTimeoutRef.current = setTimeout(() => fetchOrders(), 500);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
    };
  }, []);

  return (
    <div className="pt-2 px-4 lg:pt-4 lg:px-8 space-y-6 sm:space-y-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div className="w-full text-center md:text-left">
          <h1 
            className="text-3xl sm:text-4xl text-[#facc15] tracking-wide"
            style={{ 
              fontFamily: "'Yellowtail', cursive",
              textShadow: "2px 2px 4px rgba(0,0,0,0.5)"
            }}
          >
            Histórico de Pedidos
          </h1>
        </div>
      </div>

      <div className="space-y-4">
        {orders.map((o) => (
          <div
            key={o.id}
            className="bg-[#0a0a0a] rounded-2xl border border-white/5 shadow-xl overflow-hidden group"
          >
            <button
              onClick={() => setExpandedId(expandedId === o.id ? null : o.id)}
              className="w-full text-left p-4 flex flex-col gap-3 hover:bg-white/[0.02] transition-colors focus:outline-none"
            >
              <div className="flex items-center justify-between w-full">
                <p className="text-sm font-semibold text-slate-300 tracking-tight group-hover:text-yellow-500 transition-colors">
                  {o.created_at ? new Date(o.created_at).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' }) : 'N/A'}
                </p>
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest border ${
                      ["concluido", "entregue", "pronto"].includes(o.status?.toLowerCase())
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : o.status === "enviado"
                          ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                          : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                    }`}
                  >
                     {o.status}
                  </span>
                  <div
                    className={`p-1.5 rounded-lg transition-transform duration-300 ${expandedId === o.id ? "bg-yellow-500/20 text-yellow-500 rotate-180" : "bg-white/5 text-slate-400 group-hover:bg-yellow-500/10 group-hover:text-yellow-500"}`}
                  >
                    <ArrowDownLeft size={16} className="-rotate-45" />
                  </div>
                </div>
              </div>
            </button>
            <AnimatePresence>
              {expandedId === o.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden bg-[#050505]"
                >
                  <div className="p-4 border-t border-white/5">
                    <p className="text-[10px] text-slate-500 uppercase font-black mb-3 tracking-widest">
                      Produtos
                    </p>
                    <div className="grid grid-cols-1 gap-2">
                       {o.pedido_itens?.map((item: any, idx: number) => {
                          const unit = item?.unidade || item?.produto?.unidade_medida || 'un';
                          const isProcessed = ["pronto", "enviado", "entregue", "concluido"].includes(o.status?.toLowerCase());
                          const requestedQty = parseFloat((item?.quantidade_pedida ?? item?.quantidade) || 0);
                          const actualQty = parseFloat(item?.quantidade || 0);
                          return (
                            <div
                              key={idx}
                              className="flex items-center justify-between gap-3 bg-white/[0.02] px-4 py-3 rounded-xl border border-white/5"
                            >
                               <div className="flex-1 min-w-0">
                                   <p className="text-[13px] font-bold text-white tracking-tight truncate">
                                      {item?.produto?.nome || `Produto #${item?.produto_id || 'Desconhecido'}`}
                                   </p>
                               </div>
                               
                               <div className="flex items-center gap-4 text-right">
                                  {isProcessed ? (
                                    <>
                                       <div className="flex flex-col">
                                          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Pedida</span>
                                          <span className="text-xs font-bold text-slate-300">{requestedQty} <span className="text-[10px] opacity-70">{unit}</span></span>
                                       </div>
                                       <div className="flex flex-col">
                                          <span className="text-[9px] text-emerald-500 font-bold uppercase tracking-widest">Real</span>
                                          <span className="text-xs font-black text-emerald-400">{actualQty} <span className="text-[10px] opacity-70">{unit}</span></span>
                                       </div>
                                    </>
                                  ) : (
                                    <div className="flex flex-col">
                                       <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Pedida</span>
                                       <span className="text-xs font-bold text-white">{requestedQty} <span className="text-[10px] opacity-70">{unit}</span></span>
                                    </div>
                                  )}
                               </div>
                            </div>
                          );
                       })}
                       {(!o.pedido_itens || o.pedido_itens.length === 0) && (
                         <p className="text-xs text-slate-500 italic pb-2">
                           Nenhum produto listado.
                         </p>
                       )}
                    </div>
                    {o.observacoes && (
                      <div className="mt-4 bg-white/[0.02] p-3 rounded-xl border border-white/5">
                        <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-1.5">Observações</p>
                        <p className="text-xs text-slate-300">{o.observacoes}</p>
                      </div>
                    )}
                    
                    {o.status === "pendente" && (
                       <div className="mt-4 pt-4 border-t border-white/5">
                          <Link to={`/store/pedido?add_to=${o.id}`} className="w-full flex justify-center items-center gap-2 py-3 bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500 hover:text-black font-bold uppercase tracking-widest rounded-xl text-xs transition-all">
                             <Plus size={14} strokeWidth={3} />
                             Adicionar Produtos
                          </Link>
                       </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}


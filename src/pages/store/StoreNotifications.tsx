import React, { useState, useEffect, useRef } from "react";
import {
  Package,
  ShoppingCart,
  Bell,
  Settings,
  CheckCircle2,
} from "lucide-react";
import api from "../../lib/api";
import { supabase } from "../../lib/supabase";

export default function StoreNotifications() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"tudo" | "stock" | "pedido" | "sistema">("tudo");

  const fetchNotifications = async () => {
    try {
      const res = await api.get("/notificacoes");
      // Add dynamic category to each notification locally
      const categorized = (res.data as any[]).map((n: any) => {
        let category: "stock" | "pedido" | "sistema" = "sistema";
        const t = n.titulo.toLowerCase();
        if (t.includes("stock") || t.includes("inventário")) category = "stock";
        else if (t.includes("pedido") || t.includes("encomenda")) category = "pedido";
        return { ...n, category };
      });
      setNotifications(categorized);
    } catch (error) {
      console.error("Erro ao buscar notificações:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchNotifications();

    const channel = supabase
      .channel("store-notifications")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notificacoes" },
        () => {
          if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
          fetchTimeoutRef.current = setTimeout(() => fetchNotifications(), 500);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
    };
  }, []);

  const markAsRead = async (id: number) => {
    try {
      await api.put(`/notificacoes/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, lida: true } : n)),
      );
    } catch (error) {
      console.error("Erro ao marcar como lida:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <img src={`${import.meta.env.VITE_SUPABASE_URL || "https://ybaoaskddcmwoincsnwm.supabase.co"}/storage/v1/object/public/uploads/icon.png`} alt="Carregando..." className="w-8 h-8 animate-spin opacity-80" />
      </div>
    );
  }

  const filteredNotifs = notifications.filter((n) => filter === "tudo" || n.category === filter);

  const filterOptions = [
    { id: "tudo", label: "Tudo", icon: <Bell size={14} /> },
    { id: "stock", label: "Stock/Inventário", icon: <Package size={14} /> },
    { id: "pedido", label: "Pedidos", icon: <ShoppingCart size={14} /> },
    { id: "sistema", label: "Sistema", icon: <Settings size={14} /> },
  ];

  return (
    <div className="pt-2 px-4 lg:pt-4 lg:px-8 space-y-6 max-w-5xl mx-auto w-full">
      <div className="w-full text-center md:text-left">
        <h1 
          className="text-3xl sm:text-4xl text-[#facc15] tracking-wide"
          style={{ 
            fontFamily: "'Yellowtail', cursive",
            textShadow: "2px 2px 4px rgba(0,0,0,0.5)"
          }}
        >
          Notificações
        </h1>
      </div>

      <div className="flex overflow-x-auto no-scrollbar pb-2 sm:pb-0 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap gap-2 w-[calc(100%+2rem)] sm:w-full snap-x snap-mandatory">
        {filterOptions.map((opt) => (
          <button
            key={opt.id}
            onClick={() => setFilter(opt.id as any)}
            className={`flex items-center justify-center gap-2 px-5 py-3 sm:px-4 sm:py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap snap-start shrink-0 ${
              filter === opt.id
                ? "bg-yellow-500 text-black shadow-[0_0_15px_rgba(234,179,8,0.3)]"
                : "bg-white/5 border border-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
            }`}
          >
            {opt.icon}
            {opt.label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filteredNotifs.length === 0 ? (
          <div className="bg-[#0a0a0a] p-12 rounded-2xl border border-white/5 text-center">
            <Bell size={48} className="mx-auto mb-4 text-slate-600" />
            <p className="text-slate-400 font-medium tracking-tight">Nenhuma notificação encontrada.</p>
          </div>
        ) : (
          filteredNotifs.map((notif) => (
            <div
              key={notif.id}
              className={`bg-[#0a0a0a] p-5 sm:p-6 rounded-2xl border transition-all relative overflow-hidden group ${
                notif.lida
                  ? "border-white/5 opacity-70"
                  : "border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.1)]"
              }`}
            >
              {!notif.lida && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-yellow-500 to-yellow-700" />
              )}
              
              <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-3 gap-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${
                    notif.category === "stock" ? "bg-orange-500/20 text-orange-400" :
                    notif.category === "pedido" ? "bg-emerald-500/20 text-emerald-400" :
                    "bg-blue-500/20 text-blue-400"
                  }`}>
                    {notif.category === "stock" && <Package size={16} />}
                    {notif.category === "pedido" && <ShoppingCart size={16} />}
                    {notif.category === "sistema" && <Settings size={16} />}
                  </div>
                  <h3 className="font-bold text-white text-base sm:text-lg tracking-tight">{notif.titulo}</h3>
                </div>
                <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap bg-white/[0.02] border border-white/5 px-2.5 py-1 rounded-lg self-start sm:self-auto">
                  {new Date(notif.created_at).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              </div>
              <p className="text-sm text-slate-400 sm:ml-12 mb-4 leading-relaxed font-medium">{notif.mensagem}</p>
              {!notif.lida && (
                <button
                  onClick={() => markAsRead(notif.id)}
                  className="sm:ml-12 text-[10px] font-bold text-yellow-500 hover:text-yellow-400 uppercase tracking-widest transition-colors flex items-center gap-1.5 focus:outline-none"
                >
                  <CheckCircle2 size={14} />
                  Marcar como Lida
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect, useMemo, useRef, Suspense } from "react";
import {
  Routes,
  Route,
  Link,
  useNavigate,
  useSearchParams,
  useLocation,
} from "react-router-dom";
import { BrandName } from "../../components/Logo";
import {
  Package,
  ShoppingCart,
  Users,
  Settings,
  LogOut,
  Bell,
  Plus,
  Search,
  Store,
  ClipboardCheck,
  FileText,
  Clock,
  PieChart,
  ArrowLeft,
  Send,
  Edit2,
  Shield,
  Menu,
  X,
  ChevronDown,
  Layers
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import api from "../../lib/api";
import { supabase } from "../../lib/supabase";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import Swal from "sweetalert2";
import { motion, AnimatePresence } from "motion/react";
import { OptimizedImage } from "../../components/OptimizedImage";
import { optimizeImage } from "../../lib/imageOptimization";


import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function AdminNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [sendToAll, setSendToAll] = useState(true);
  const [activeTab, setActiveTab] = useState<"sent" | "received">("received");
  const [filter, setFilter] = useState<"tudo" | "stock" | "pedido" | "sistema">("tudo");

  const fetchNotifications = () => {
    api.get("/admin/notificacoes").then((res) => {
      // Add dynamic category to each notification locally
      const categorized = (res.data as any[]).map((n: any) => {
        let category: "stock" | "pedido" | "sistema" = "sistema";
        const t = n.titulo.toLowerCase();
        if (t.includes("stock") || t.includes("inventário")) category = "stock";
        else if (t.includes("pedido") || t.includes("encomenda")) category = "pedido";
        return { ...n, category };
      });
      setNotifications(categorized);
    });
  };

  const markAsRead = async (id: string) => {
    try {
      await api.put(`/notificacoes/${id}/read`);
      fetchNotifications();
    } catch (error) {
      console.error("Erro ao marcar como lida:", error);
    }
  };

  const fetchStores = () => {
    api.get("/admin/users").then((res) => {
      const data = res.data as any[];
      setStores(data.filter((u) => u.role === "loja"));
    });
  };

  const sentNotifications = useMemo(() => {
    const sent = notifications.filter((n) => n.user_id !== user?.id);
    const grouped = sent.reduce((acc: any, curr: any) => {
      // Group by title, message, and a rough timestamp (e.g., within the same minute)
      const key = `${curr.titulo}-${curr.mensagem}-${new Date(curr.created_at).toISOString().slice(0, 16)}`;
      if (!acc[key]) {
        acc[key] = {
          ...curr,
          destinatarios: [curr.users?.name || "Desconhecida"],
          lidasCount: curr.lida ? 1 : 0,
          totalCount: 1,
        };
      } else {
        acc[key].destinatarios.push(curr.users?.name || "Desconhecida");
        if (curr.lida) acc[key].lidasCount++;
        acc[key].totalCount++;
      }
      return acc;
    }, {});
    
    return Object.values(grouped).sort((a: any, b: any) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [notifications, user?.id]);

  const receivedNotifications = useMemo(() => {
    return notifications.filter((n) => n.user_id === user?.id);
  }, [notifications, user?.id]);

  useEffect(() => {
    fetchNotifications();
    fetchStores();

    const channel = supabase
      .channel("admin-notifications")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notificacoes" },
        () => {
          fetchNotifications();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo || !mensagem) {
      Swal.fire("Erro", "Preencha o título e a mensagem", "error");
      return;
    }

    if (!sendToAll && selectedStores.length === 0) {
      Swal.fire("Erro", "Selecione pelo menos uma loja", "error");
      return;
    }

    setLoading(true);
    try {
      await api.post("/admin/notificacoes", {
        titulo,
        mensagem,
        lojas_ids: sendToAll ? [] : selectedStores,
      });
      Swal.fire("Sucesso", "Notificação enviada com sucesso!", "success");
      setTitulo("");
      setMensagem("");
      setSelectedStores([]);
      setSendToAll(true);
    } catch (error) {
      console.error(error);
      Swal.fire("Erro", "Falha ao enviar notificação", "error");
    } finally {
      setLoading(false);
    }
  };

  const toggleStore = (id: string) => {
    setSelectedStores((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  return (
    <div className="pt-2 px-4 md:pt-4 md:px-6 lg:px-8 ">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white">
          Notificações
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Envie e gira as notificações para as lojas.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Send Notification Form */}
        <div className="glass-card p-6 rounded-3xl border border-yellow-500/30 shadow-sm">
          <h2 className="text-lg font-bold text-white mb-4">
            Nova Notificação
          </h2>
          <form onSubmit={handleSend} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                Título
              </label>
              <input
                type="text"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                className="w-full bg-black/20 border border-yellow-500/30 rounded-xl px-4 py-3 text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all outline-none"
                placeholder="Ex: Atualização de Stock"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                Mensagem
              </label>
              <textarea
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                className="w-full bg-black/20 border border-yellow-500/30 rounded-xl px-4 py-3 text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all outline-none min-h-[100px]"
                placeholder="Escreva a mensagem aqui..."
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                Destinatários
              </label>
              <div className="flex items-center gap-2 mb-4">
                <input
                  type="checkbox"
                  id="sendToAll"
                  checked={sendToAll}
                  onChange={(e) => {
                    setSendToAll(e.target.checked);
                    if (e.target.checked) setSelectedStores([]);
                  }}
                  className="w-4 h-4 rounded border-yellow-500/30 bg-black/20 text-primary focus:ring-primary/50"
                />
                <label htmlFor="sendToAll" className="text-sm text-slate-300">
                  Enviar para todas as lojas
                </label>
              </div>

              {!sendToAll && (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  {stores.map((store) => (
                    <label
                      key={store.id}
                      className="flex items-center gap-3 p-3 rounded-xl border border-yellow-500/30 bg-black/10 hover:bg-white/5 cursor-pointer transition-all"
                    >
                      <input
                        type="checkbox"
                        checked={selectedStores.includes(store.id)}
                        onChange={() => toggleStore(store.id)}
                        className="w-4 h-4 rounded border-yellow-500/30 bg-black/20 text-primary focus:ring-primary/50"
                      />
                      <span className="text-sm text-slate-300">
                        {store.name}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 btn-primary rounded-2xl hover:bg-red-700 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading ? (
                <span className="animate-pulse">A enviar...</span>
              ) : (
                <>
                  <Send size={20} />
                  Enviar Notificação
                </>
              )}
            </button>
          </form>
        </div>

        {/* Notifications List */}
        <div className="glass-card p-6 rounded-3xl border border-yellow-500/30 shadow-sm flex flex-col">
          <div className="flex flex-col gap-4 mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-lg font-bold text-white">Notificações</h2>
              <div className="flex bg-black/20 rounded-lg p-1">
                <button
                  onClick={() => setActiveTab("received")}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                    activeTab === "received"
                      ? "bg-primary text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Recebidas
                </button>
                <button
                  onClick={() => setActiveTab("sent")}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                    activeTab === "sent"
                      ? "bg-primary text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Enviadas
                </button>
              </div>
            </div>

            {activeTab === "received" && (
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "tudo", label: "Tudo", icon: <Bell size={12} /> },
                  { id: "stock", label: "Stock", icon: <Package size={12} /> },
                  { id: "pedido", label: "Pedidos", icon: <ShoppingCart size={12} /> },
                  { id: "sistema", label: "Sistema", icon: <Settings size={12} /> },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setFilter(opt.id as any)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                      filter === opt.id
                        ? "bg-primary text-white shadow-[0_0_15px_rgba(227,30,36,0.3)]"
                        : "bg-white/5 border border-yellow-500/30 text-slate-400 hover:bg-white/10"
                    }`}
                  >
                    {opt.icon}
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
            {(activeTab === "received" ? receivedNotifications.filter(n => filter === "tudo" || n.category === filter) : sentNotifications).length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Bell size={48} className="mx-auto mb-4 opacity-20" />
                <p>Nenhuma notificação {activeTab === "received" ? "recebida" : "enviada"}.</p>
              </div>
            ) : (
              (activeTab === "received" ? receivedNotifications.filter(n => filter === "tudo" || n.category === filter) : sentNotifications).map((notif: any) => (
                <div
                  key={notif.id || notif.created_at}
                  className={`p-4 rounded-2xl border transition-all ${
                    !notif.lida && activeTab === "received"
                      ? "border-primary/50 bg-primary/5 cursor-pointer hover:bg-primary/10"
                      : "border-yellow-500/30 bg-black/20"
                  }`}
                  onClick={() => {
                    if (!notif.lida && activeTab === "received") {
                      markAsRead(notif.id);
                    }
                  }}
                >
                  <div className="flex justify-between items-start mb-2 gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                       {activeTab === "received" && (
                        <div className={`p-1.5 rounded-lg shrink-0 ${
                          notif.category === "stock" ? "bg-orange-500/20 text-orange-400" :
                          notif.category === "pedido" ? "bg-emerald-500/20 text-emerald-400" :
                          "bg-blue-500/20 text-blue-400"
                        }`}>
                          {notif.category === "stock" && <Package size={14} />}
                          {notif.category === "pedido" && <ShoppingCart size={14} />}
                          {notif.category === "sistema" && <Settings size={14} />}
                        </div>
                       )}
                       <h3 className={`font-bold ${!notif.lida && activeTab === "received" ? "text-white" : "text-slate-300"} text-sm`}>
                         {notif.titulo}
                       </h3>
                    </div>
                    <span className="text-[10px] text-slate-500">
                      {new Date(notif.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className={`text-xs text-slate-300 mb-2 ${activeTab === "received" ? "ml-9" : ""}`}>{notif.mensagem}</p>
                  
                  {activeTab === "sent" ? (
                    <div className="mt-3 text-[10px] text-slate-500 flex items-center justify-between border-t border-yellow-500/20 pt-2">
                      <span className="flex items-center gap-1"><Users size={12}/> Destinatários: {notif.totalCount} ({notif.lidasCount} lidas)</span>
                      <span className="text-primary font-bold">
                        {Math.round((notif.lidasCount / notif.totalCount) * 100)}% de leitura
                      </span>
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

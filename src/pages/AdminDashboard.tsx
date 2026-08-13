import React, { useState, useEffect, useMemo, useRef, Suspense } from "react";
import { ErrorBoundary } from "../components/ErrorBoundary";
const AdminReportsComponent = React.lazy(() => import("./admin/AdminReports"));
const AdminHomeComponent = React.lazy(() => import("./admin/AdminHome"));
const AdminOrders = React.lazy(() => import("./admin/AdminOrders"));
const AdminWarehousePicking = React.lazy(() => import("./admin/AdminWarehousePicking"));
const AdminProducts = React.lazy(() => import("./admin/AdminProducts"));
const AdminWarehouseMap = React.lazy(() => import("./admin/AdminWarehouseMap"));
const AdminStores = React.lazy(() => import("./admin/AdminStores"));
const AdminGiro = React.lazy(() => import("./admin/AdminGiro"));
const AdminUsers = React.lazy(() => import("./admin/AdminUsers"));
const AdminStoreSales = React.lazy(() => import("./admin/AdminStoreSales"));
const AdminFechos = React.lazy(() => import("./admin/AdminFechos"));
const AdminAnalytics = React.lazy(() => import("./admin/AdminAnalytics"));
const AdminNotifications = React.lazy(() => import("./admin/AdminNotifications"));
const AdminStockEntries = React.lazy(() => import("./admin/AdminStockEntries")); // Faturas de Mercadoria (Armazém)
const AdminSuppliers = React.lazy(() => import("./admin/AdminSuppliers")); // Fornecedores
const AdminFinancial = React.lazy(() => import("./admin/AdminFinancial")); // Financeiro / Despesas
const AdminProductsPricing = React.lazy(() => import("./admin/AdminProductsPricing")); // Precos e Margens
const AdminWarehouseConfig = React.lazy(() => import("./admin/AdminWarehouseConfig")); // Add Config Armazem
const AdminGlobalStock = React.lazy(() => import("./admin/AdminGlobalStock")); // Estoque Global

import {
  Routes,
  Route,
  Link,
  useNavigate,
  useSearchParams,
  useLocation,
} from "react-router-dom";
import { BrandName } from "../components/Logo";
import {
  Package, Map,
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
  Layers,
  Banknote,
  Truck,
  CreditCard,
  Tags,
  History,
  FileCode2,
  PackageSearch,
  Receipt
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import { supabase } from "../lib/supabase";
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
import { OptimizedImage } from "../components/OptimizedImage";
import { optimizeImage } from "../lib/imageOptimization";

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function AdminDashboard() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const [isGestaoUnlocked, setIsGestaoUnlocked] = useState(true);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinValue, setPinValue] = useState("");
  const [pinError, setPinError] = useState(false);
  const [pendingSubmenu, setPendingSubmenu] = useState<string | null>(null);
  const [activeToasts, setActiveToasts] = useState<{id: string, title: string, body: string}[]>([]);

  useEffect(() => {
    // Auto-expand submenus if current path matches a subitem
    sidebarGroups.forEach(group => {
      group.items.forEach(item => {
        if (item.subItems && item.subItems.some(sub => location.pathname === sub.to)) {
          setActiveSubmenu(item.id!);
          if (item.requiresPin) {
            setIsGestaoUnlocked(true);
          }
        }
      });
    });
  }, [location.pathname]);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  // Global Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<{
    produtos: any[];
    lojas: any[];
    pedidos: any[];
  }>({ produtos: [], lojas: [], pedidos: [] });

  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
        if (searchQuery === "") {
          setIsSearchExpanded(false);
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [searchQuery]);

  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      const delayFn = setTimeout(async () => {
        try {
          const res = await api.get(`/admin/global-search?q=${encodeURIComponent(searchQuery)}`);
          setSearchResults(res.data);
          setIsSearchOpen(true);
        } catch (error) {
          console.error("Erro na busca global:", error);
        }
      }, 400);

      return () => clearTimeout(delayFn);
    } else {
      setIsSearchOpen(false);
      setSearchResults({ produtos: [], lojas: [], pedidos: [] });
    }
  }, [searchQuery]);

  const fetchUnreadCount = async () => {
    try {
      const res = await api.get("/admin/notificacoes");
      const unread = (res.data as any[]).filter((n: any) => !n.lida && n.user_id === user?.id).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error("Erro ao buscar notificações:", error);
    }
  };

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    if (!user) return;

    fetchUnreadCount();

    const playNotificationSound = () => {
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } catch (e) {
        console.error("Audio play failed", e);
      }
    };

    const showPushNotification = (title: string, body: string) => {
      playNotificationSound();
      
      const id = Math.random().toString(36).substring(2, 9);
      setActiveToasts(prev => [...prev, { id, title, body }]);
      
      setTimeout(() => {
        setActiveToasts(prev => prev.filter(t => t.id !== id));
      }, 60000);

      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(title, { body });
      }
    };

    const handleNewNotification = (payload: any) => {
      const newNotif = payload.new;
      if (newNotif.user_id === user.id) {
        showPushNotification(newNotif.titulo, newNotif.mensagem);
        fetchUnreadCount();
      }
    };

    const handleNewOrder = (payload: any) => {
      const newOrder = payload.new;
      showPushNotification(
        "Novo Pedido",
        `A loja ${newOrder.loja_nome || "desconhecida"} fez um novo pedido (#${newOrder.id}).`
      );
    };

    const notifChannel = supabase
      .channel("global-admin-notifs")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notificacoes" },
        handleNewNotification
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notificacoes" },
        () => fetchUnreadCount()
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "pedidos" },
        handleNewOrder
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notifChannel);
    };
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const sidebarGroups = [
    {
      title: "",
      items: [
        { to: "/admin", icon: <Store size={18} />, label: "Início" },
      ]
    },
    {
      title: "OPERAÇÃO",
      items: [
        { to: "/admin/armazem/fatura", label: "Faturas", icon: <FileCode2 size={18} /> },
        { to: "/admin/armazem/pedidos", label: "Pedidos", icon: <Truck size={18} /> },
        { to: "/admin/estoque-global", label: "Armazém", icon: <Layers size={18} /> },
        { to: "/admin/armazem/produtos", label: "Produtos", icon: <Package size={18} /> },
        { to: "/admin/mapa", label: "Mapa", icon: <Map size={18} /> },
        ...(["admin", "armazem"].includes(user?.role) ? [{ to: "/admin/fornecedores", label: "Fornecedores", icon: <Users size={18} /> }] : []),
      ]
    },
    ...(user?.role === "admin" ? [
       {
         title: "GESTÃO",
         items: [
           { to: "/admin/financeiro", icon: <Banknote size={18} />, label: "Financeiro" },
                      { to: "/admin/precos", icon: <Tags size={18} />, label: "Margens / Preços" },
           { to: "/admin/consumo", icon: <PieChart size={18} />, label: "Consumo" },
           { to: "/admin/giro", icon: <History size={18} />, label: "Média de Consumo" },
           {
             id: "configuracoes",
             icon: <Settings size={18} />,
             label: "Configurações",
             requiresPin: false,
             subItems: [
               { to: "/admin/lojas", icon: <Store size={16} />, label: "Lojas" },
               { to: "/admin/utilizadores", icon: <Users size={16} />, label: "Utilizadores" },
               { to: "/admin/config-armazem", icon: <Settings size={16} />, label: "Config. Armazém" }
             ],
           },
         ]
       }
    ] : [])
  ];

  return (
    <div className="h-full w-full flex font-sans relative text-slate-100 overflow-hidden transition-colors bg-[#050505]">
      {/* Background Effects (Disabled for Focus Mode) */}
      {/* 
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-yellow-500/5 blur-[120px]"></div>
      </div>
      */}

      {/* Sidebar (Desktop & Mobile Drawer) */}
      <aside className={cn(
        "fixed top-0 left-0 bottom-0 w-64 bg-[#050505]  border-r-2 border-yellow-500/30 lg:border-r-0 shadow-[4px_0_24px_rgba(0,0,0,0.6)] lg:shadow-none z-[100] flex flex-col transition-transform duration-300 lg:translate-x-0 lg:static lg:z-50",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Header / Close Mobile */}
        <div className="px-6 border-b border-white/5 flex items-center justify-between mb-4 shrink-0 shadow-sm" style={{ height: '53.136px' }}>
          <BrandName className="text-xl" />
          <button className="lg:hidden text-slate-400 hover:text-white" onClick={() => setIsMobileMenuOpen(false)}>
            <X size={24} />
          </button>
        </div>

        {/* Sidebar Links */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-3 space-y-4 pb-6">
          {sidebarGroups.filter(g => g.items.length > 0).map((group, index) => (
            <div key={group.title || `group-${index}`}>
              {group.title && (
                <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 pl-2">
                  {group.title}
                </h4>
              )}
              <div className="space-y-1">
                {group.items.map(item => {
                  if (item.subItems) {
                     return (
                       <div key={item.id}>
                         <button
                           onClick={() => {
                             if (item.requiresPin && !isGestaoUnlocked) {
                               setPendingSubmenu(item.id || null);
                               setPinValue("");
                               setPinError(false);
                               setShowPinModal(true);
                             } else {
                               setActiveSubmenu(activeSubmenu === item.id ? null : item.id!);
                             }
                           }}
                           className={`w-full px-3 py-1.5 rounded-lg flex items-center justify-between transition-all ${
                             activeSubmenu === item.id || item.subItems.some(sub => location.pathname === sub.to)
                               ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                               : "text-slate-300 hover:bg-white/5 hover:text-white"
                           }`}
                         >
                           <div className="flex items-center gap-2.5">
                             <div className={`${activeSubmenu === item.id ? "text-yellow-400" : "text-slate-400"}`}>
                               {item.icon}
                             </div>
                             <span className="text-xs font-bold tracking-wide">{item.label}</span>
                           </div>
                           <motion.div animate={{ rotate: activeSubmenu === item.id ? 180 : 0 }}>
                             <ChevronDown size={14} className="text-slate-500" />
                           </motion.div>
                         </button>
                         <AnimatePresence>
                           {activeSubmenu === item.id && (
                             <motion.div
                               initial={{ height: 0, opacity: 0 }}
                               animate={{ height: "auto", opacity: 1 }}
                               exit={{ height: 0, opacity: 0 }}
                               className="overflow-hidden"
                             >
                               <div className="pt-1 pb-1 pl-3 space-y-1 border-l border-white/10 ml-4 mt-1">
                                 {item.subItems.map(subItem => (
                                   <Link
                                     key={subItem.to}
                                     to={subItem.to}
                                     onClick={() => setIsMobileMenuOpen(false)}
                                     className={`px-3 py-1.5 rounded-md text-[11px] font-bold tracking-wide flex items-center gap-2.5 transition-colors ${
                                       location.pathname === subItem.to
                                         ? "bg-yellow-500/20 text-yellow-500 border border-yellow-500/30"
                                         : "text-slate-400 hover:text-white hover:bg-white/5"
                                     }`}
                                   >
                                     <div className="opacity-70">{subItem.icon}</div>
                                     {subItem.label}
                                   </Link>
                                 ))}
                               </div>
                             </motion.div>
                           )}
                         </AnimatePresence>
                       </div>
                     )
                  } else {
                     return (
                       <Link
                         key={item.to}
                         to={item.to!}
                         className={`px-3 py-1.5 rounded-lg flex items-center gap-2.5 transition-all ${
                           location.pathname === item.to
                             ? "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 shadow-inner"
                             : "text-slate-300 hover:bg-white/5 hover:text-white"
                         }`}
                         onClick={() => {
                           setActiveSubmenu(null);
                           setIsMobileMenuOpen(false);
                         }}
                       >
                         <div className={`${location.pathname === item.to ? "text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]" : "text-slate-400"}`}>
                           {item.icon}
                         </div>
                         <span className="text-xs font-bold tracking-wide">{item.label}</span>
                       </Link>
                     )
                  }
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer / Logout */}
        <div className="p-3 border-t border-yellow-500/30 flex flex-col gap-2">
          {/* Minimalist Avatar Card */}
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3 relative overflow-hidden group hover:bg-white/10 hover:border-yellow-500/30 transition-all">
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/0 to-yellow-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-500 to-yellow-700 flex items-center justify-center text-black font-black text-base shadow-[0_0_15px_rgba(234,179,8,0.4)]">
                {user?.name?.substring(0, 2).toUpperCase()}
              </div>
              {/* Online indicator */}
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-zinc-900 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">{user?.name}</p>
              <p className="text-[9px] text-yellow-500 uppercase font-black tracking-widest mt-0.5">
                {user?.role === "admin" ? "Admin" : "Armazém"}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full px-3 py-2 rounded-lg flex items-center gap-2.5 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors font-bold text-xs tracking-wide border border-transparent hover:border-red-500/30"
          >
            <LogOut size={16} />
            Encerrar Sessão
          </button>
        </div>
      </aside>

      {/* Overlay for mobile drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/60  z-[90] lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative z-10 transition-all">
        {/* Header */}
        <header className="bg-[#0a0a0a] lg:bg-[#050505] px-4 lg:px-8 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] flex items-center justify-between sticky top-0 z-40 border-b border-white/10 lg:border-white/5 transition-all">
          <div className="flex items-center gap-3">
            <button
              className="p-2 -ml-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 lg:hidden transition-colors"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu size={24} />
            </button>
            <BrandName className="text-sm sm:text-base lg:hidden" />
          </div>

          <div className="flex items-center gap-2 lg:gap-4">
            <div ref={searchContainerRef} className="flex relative z-50">
              <div 
                className={`flex items-center bg-transparent py-2 rounded-2xl transition-all duration-300 ${isSearchExpanded ? 'w-[150px] sm:w-[300px] px-3 sm:px-4 bg-white/5' : 'w-8 sm:w-10 px-0 justify-center cursor-pointer hover:bg-white/10'}`}
                onClick={() => { if(!isSearchExpanded) setIsSearchExpanded(true); }}
              >
                <Search size={18} className={`${isSearchExpanded ? 'text-slate-400 mr-2 shrink-0' : 'text-slate-300 shrink-0'}`} />
                {isSearchExpanded && (
                  <input
                    autoFocus
                    type="text"
                    placeholder="Pesquisar..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => searchQuery.trim().length >= 2 && setIsSearchOpen(true)}
                    className="bg-transparent border-none outline-none text-xs sm:text-sm w-full text-white placeholder:text-slate-500"
                  />
                )}
              </div>
              
              <AnimatePresence>
                {isSearchOpen && (
                   <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-full -right-20 sm:right-0 mt-3 bg-[#0a0a0a] rounded-xl overflow-hidden z-50 flex flex-col shadow-2xl border border-white/10 w-[320px] sm:w-[400px] max-h-[400px] overflow-y-auto custom-scrollbar"
                  >
                    {/* Produtos */}
                    {searchResults.produtos.length > 0 && (
                      <div className="p-3">
                        <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2 pl-2">Produtos</h4>
                        {searchResults.produtos.map(p => (
                          <div key={p.id} onClick={() => { setIsSearchOpen(false); navigate("/admin/produtos?search=" + encodeURIComponent(p.nome)); }} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer transition-colors group">
                             <div className="w-8 h-8 rounded-md bg-white/5 text-slate-400 border border-white/10 flex items-center justify-center shrink-0">
                               <Package size={14} />
                             </div>
                             <div>
                               <p className="text-xs font-semibold text-white group-hover:text-blue-400 transition-colors">{p.nome}</p>
                               <p className="text-[10px] text-slate-500">Ref: #{p.id} • {p.categorias?.nome}</p>
                             </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Lojas */}
                    {searchResults.lojas.length > 0 && (
                      <div className="p-3 border-t border-white/5">
                        <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2 pl-2">Lojas</h4>
                        {searchResults.lojas.map(l => (
                          <div key={l.id} onClick={() => { setIsSearchOpen(false); navigate("/admin/lojas"); }} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer transition-colors group">
                             <div className="w-8 h-8 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
                               <Store size={14} />
                             </div>
                             <div>
                               <p className="text-xs font-semibold text-white group-hover:text-blue-400 transition-colors">{l.name}</p>
                               <p className="text-[10px] text-slate-500">{l.email}</p>
                             </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Pedidos */}
                    {searchResults.pedidos.length > 0 && (
                      <div className="p-3 border-t border-white/5">
                        <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2 pl-2">Pedidos</h4>
                        {searchResults.pedidos.map(pe => (
                          <div key={pe.id} onClick={() => { setIsSearchOpen(false); navigate("/admin/pedidos"); }} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer transition-colors group">
                             <div className="w-8 h-8 rounded-md bg-white/5 text-slate-400 border border-white/10 flex items-center justify-center shrink-0">
                               <ShoppingCart size={14} />
                             </div>
                             <div>
                               <p className="text-xs font-semibold text-white transition-colors group-hover:text-white">Pedido {pe.id.substring(0,8)}</p>
                               <p className="text-[10px] text-slate-500">Status: {pe.status} • {pe.loja_nome || "Loja Desconhecida"}</p>
                             </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {searchResults.produtos.length === 0 && searchResults.lojas.length === 0 && searchResults.pedidos.length === 0 && (
                      <div className="p-8 text-center text-slate-500">
                        <Search size={24} className="mx-auto mb-2 opacity-50" />
                        <p className="text-xs font-medium">Nenhum resultado encontrado.</p>
                        <p className="text-[10px]">Tente outra palavra-chave.</p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Link to="/admin/notificacoes" className="relative p-2 text-slate-300 hover:bg-white/10 rounded-full transition-all">
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full shadow-[0_0_8px_rgba(227,30,36,0.8)]"></span>
              )}
            </Link>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="flex-1 overflow-y-auto custom-scrollbar transition-all p-0">
          <ErrorBoundary>
            <Suspense fallback={<div className="flex items-center justify-center p-12 w-full h-full"><img src={`${import.meta.env.VITE_SUPABASE_URL || "https://ybaoaskddcmwoincsnwm.supabase.co"}/storage/v1/object/public/uploads/icon.png`} alt="Carregando..." className="w-10 h-10 animate-spin opacity-80" /></div>}>
              <Routes>
                <Route path="/" element={<AdminHomeComponent />} />
                {user?.role === "admin" && (
                  <>
                    <Route path="/consumo" element={<AdminAnalytics />} />
                    <Route path="/vendas-lojas" element={<AdminStoreSales />} />
                    <Route path="/fechos" element={<AdminFechos />} />
                    <Route path="/utilizadores" element={<AdminUsers />} />
                    
                    <Route path="/precos" element={<AdminProductsPricing />} />
                    <Route path="/giro" element={<AdminGiro />} />
                    <Route path="/config-armazem" element={<AdminWarehouseConfig />} />
                  </>
                )}
                <Route path="/fornecedores" element={<AdminSuppliers />} />
                <Route path="/financeiro" element={<AdminFinancial />} />
                <Route path="/produtos" element={<AdminProducts />} />
                <Route path="/mapa" element={<AdminWarehouseMap />} />
                <Route path="/pedidos" element={<AdminOrders />} />
                <Route path="/lojas" element={<AdminStores />} />
                <Route path="/estoque-global" element={<AdminGlobalStock />} />
                <Route path="/armazem/:tab?" element={<AdminWarehousePicking />} />
                <Route path="/relatorios" element={<AdminReportsComponent />} />
                <Route path="/notificacoes" element={<AdminNotifications />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>

      <AnimatePresence>
        {showPinModal && (
          <motion.div 
            key="pin-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60  p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-500/20 via-yellow-500/80 to-yellow-500/20" />
              <button 
                onClick={() => setShowPinModal(false)}
                className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
                title="Fechar"
              >
                <X size={20} />
              </button>
              
              <div className="text-center mb-6 mt-2">
                <div className="w-12 h-12 bg-yellow-500/10 text-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-yellow-500/20">
                  <Shield size={24} />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">Acesso Restrito</h3>
                <p className="text-xs text-slate-400">Introduza o código de acesso para continuar</p>
              </div>

              <div className="space-y-4">
                <div>
                  <input
                    type="password"
                    autoFocus
                    placeholder="Código"
                    value={pinValue}
                    onChange={(e) => {
                      setPinValue(e.target.value);
                      setPinError(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (pinValue === '1234') {
                          setIsGestaoUnlocked(true);
                          setActiveSubmenu(pendingSubmenu);
                          setShowPinModal(false);
                        } else {
                          setPinError(true);
                        }
                      }
                    }}
                    className={`w-full px-4 py-3 bg-black/50 border rounded-xl outline-none text-center text-xl tracking-[0.5em] font-mono transition-all ${
                      pinError ? 'border-red-500/50 text-red-400' : 'border-white/10 text-white focus:border-yellow-500/50'
                    }`}
                  />
                  {pinError && (
                    <motion.p 
                      initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                      className="text-center text-xs text-red-400 mt-2 font-bold"
                    >
                      Código incorreto
                    </motion.p>
                  )}
                </div>

                <button
                  onClick={() => {
                    if (pinValue === '1234') {
                      setIsGestaoUnlocked(true);
                      setActiveSubmenu(pendingSubmenu);
                      setShowPinModal(false);
                    } else {
                      setPinError(true);
                    }
                  }}
                  className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-xl text-sm transition-colors"
                >
                  Confirmar Acesso
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notifications Portal */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {activeToasts.map(toast => (
            <motion.div
               key={toast.id}
               initial={{ opacity: 0, x: 50, scale: 0.9 }}
               animate={{ opacity: 1, x: 0, scale: 1 }}
               exit={{ opacity: 0, x: 100, scale: 0.9 }}
               drag="x"
               dragConstraints={{ left: 0, right: 100 }}
               onDragEnd={(e, info) => {
                 if (info.offset.x > 50) {
                   setActiveToasts(prev => prev.filter(t => t.id !== toast.id));
                 }
               }}
               className="bg-[#111] border border-yellow-500/30 p-4 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] w-[300px] sm:w-[350px] relative pointer-events-auto cursor-pointer flex flex-col gap-1 overflow-hidden group"
               onClick={() => {
                 setActiveToasts(prev => prev.filter(t => t.id !== toast.id));
                 navigate("/admin/notificacoes");
               }}
            >
               <button 
                 className="absolute top-2 right-2 text-slate-500 hover:text-white transition-colors"
                 onClick={(e) => {
                   e.stopPropagation();
                   setActiveToasts(prev => prev.filter(t => t.id !== toast.id));
                 }}
               >
                 <X size={16} />
               </button>
               <div className="flex items-center gap-2 mb-1">
                 <Bell className="text-yellow-500 flex-shrink-0" size={16} />
                 <h4 className="text-sm font-bold text-white pr-6 truncate">{toast.title}</h4>
               </div>
               <p className="text-xs text-slate-400 line-clamp-2">{toast.body}</p>
               
               <div className="h-1 w-full bg-white/5 absolute bottom-0 left-0">
                 <motion.div 
                   initial={{ width: "100%" }}
                   animate={{ width: "0%" }}
                   transition={{ duration: 60, ease: "linear" }}
                   className="h-full bg-yellow-500"
                 />
               </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
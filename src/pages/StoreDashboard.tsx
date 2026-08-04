import React, { useState, useEffect, useRef, Suspense } from "react";
import { ErrorBoundary } from "../components/ErrorBoundary";
const StoreHome = React.lazy(() => import("./store/StoreHome"));
const StoreOrder = React.lazy(() => import("./store/StoreOrder"));
const StoreHistory = React.lazy(() => import("./store/StoreHistory"));
const StoreNotifications = React.lazy(() => import("./store/StoreNotifications"));
const StoreManagement = React.lazy(() => import("./store/StoreManagement"));
import {
  Routes,
  Route,
  Link,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { BrandName } from "../components/Logo";
import { BrandTitle } from "../components/BrandTitle";
import {
  Package,
  ShoppingCart, Trash2, CheckSquare,
  History,
  ClipboardCheck,
  LogOut,
  Bell,
  Search,
  Plus,
  Minus,
  CheckCircle2,
  ArrowDownLeft,
  ArrowLeft,
  Settings,
Menu, X, ChevronDown, Store, Printer, Share2, Check} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import { supabase } from "../lib/supabase";
import Swal from "sweetalert2";
import { OptimizedImage } from "../components/OptimizedImage";

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function StoreDashboard() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [cart, setCart] = useState<any[]>([]);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  useEffect(() => {
    if (user?.id) {
      const saved = localStorage.getItem(`store_cart_${user.id}`);
      if (saved) {
        try {
          setCart(JSON.parse(saved));
        } catch (e) {
          console.error("Failed to parse saved cart", e);
        }
      }
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(`store_cart_${user.id}`, JSON.stringify(cart));
    }
  }, [cart, user?.id]);

  const [unreadCount, setUnreadCount] = useState(0);

  // Global Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<{
    produtos: any[];
    pedidos: any[];
  }>({ produtos: [], pedidos: [] });

  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const [activeToasts, setActiveToasts] = useState<{id: string, title: string, body: string}[]>([]);

  const sidebarGroups = [
    {
      title: "PAINEL",
      items: [
        { to: "/store", icon: <Store size={18} />, label: "INÍCIO" },
      ]
    },
    {
      title: "OPERAÇÕES",
      items: [
        { to: "/store/pedido", icon: <ShoppingCart size={18} />, label: "NOVO PEDIDO" },
        { to: "/store/historico", icon: <History size={18} />, label: "HISTÓRICO DE PEDIDOS" },
        { to: "/store/management", icon: <Store size={18} />, label: "A GERÊNCIA" },
      ]
    }
  ];

  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      const delayFn = setTimeout(async () => {
        try {
          const [pRes, peRes] = await Promise.all([
            api.get("/produtos"),
            api.get("/pedidos")
          ]);
          
          const q = searchQuery.toLowerCase();
          
          setSearchResults({
            produtos: (pRes.data as any[]).filter((p: any) => 
              p.nome.toLowerCase().includes(q) || 
              (p.barcode_ean && p.barcode_ean.includes(q)) ||
              (String(p.id).includes(q))
            ).slice(0, 5),
            pedidos: (peRes.data as any[]).filter((pe: any) => String(pe.id).includes(q) && pe.user_id === user?.id).slice(0, 5),
          });
          setIsSearchOpen(true);
        } catch (error) {
          console.error("Erro na busca global:", error);
        }
      }, 400);

      return () => clearTimeout(delayFn);
    } else {
      setIsSearchOpen(false);
      setSearchResults({ produtos: [], pedidos: [] });
    }
  }, [searchQuery, user?.id]);

  const fetchUnreadCount = async () => {
    try {
      const res = await api.get("/notificacoes");
      const unread = (res.data as any[]).filter((n: any) => !n.lida).length;
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

      // Browser notification
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

    const handleOrderUpdate = (payload: any) => {
      const updatedOrder = payload.new;
      // Only notify if status changed and it's for this user
      if (updatedOrder.user_id === user.id && payload.old.status !== updatedOrder.status) {
        showPushNotification(
          "Atualização de Pedido",
          `O seu pedido #${updatedOrder.id} mudou para o estado: ${updatedOrder.status}`
        );
      }
    };

    const notifChannel = supabase
      .channel("global-store-notifs")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notificacoes" },
        handleNewNotification
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notificacoes" },
        () => fetchUnreadCount() // Update count when marked as read
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "pedidos" },
        handleOrderUpdate
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

  const handleCartClick = () => {
    if (location.pathname === "/store/pedido") {
      const cartElement = document.getElementById("cart-section");
      if (cartElement) {
        cartElement.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      navigate("/store/pedido");
      setTimeout(() => {
        const cartElement = document.getElementById("cart-section");
        if (cartElement) {
          cartElement.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
    }
  };

  const cartTotalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="h-full w-full flex font-sans relative text-slate-100 overflow-hidden transition-colors bg-[#050505]">
      {/* Sidebar (Desktop & Mobile Drawer) */}
      <aside className={cn(
        "fixed top-0 left-0 bottom-0 w-64 bg-[#050505] border-r-2 border-yellow-500/30 lg:border-r-0 shadow-[4px_0_24px_rgba(0,0,0,0.6)] lg:shadow-none z-[100] flex flex-col transition-transform duration-300 lg:translate-x-0 lg:static lg:z-50",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Header / Close Mobile */}
        <div className="p-6 pb-6 border-b border-white/5 flex items-center justify-between mb-4">
          <BrandName className="text-xl" />
          <button className="lg:hidden text-slate-400 hover:text-white" onClick={() => setIsMobileMenuOpen(false)}>
            <X size={24} />
          </button>
        </div>

        {/* Sidebar Links */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-3 space-y-4 pb-6">
          {sidebarGroups.filter(g => g.items.length > 0).map(group => (
            <div key={group.title} className="space-y-1">
                {group.items.map((item: any) => {
                  if (item.subItems) {
                     return (
                       <div key={item.id}>
                         <button
                           onClick={() => {
                             setActiveSubmenu(activeSubmenu === item.id ? null : item.id);
                           }}
                           className={`w-full px-3 py-1.5 rounded-lg flex items-center justify-between transition-all ${
                             activeSubmenu === item.id || item.subItems.some((sub: any) => location.pathname === sub.to)
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
                                 {item.subItems.map((subItem: any) => (
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
                Loja
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
            <div ref={searchContainerRef} className="hidden md:flex relative z-50">
              <div 
                className={`flex items-center bg-transparent py-2 rounded-2xl transition-all duration-300 ${isSearchExpanded ? 'w-[300px] px-4 bg-white/5' : 'w-10 px-0 justify-center cursor-pointer hover:bg-white/10'}`}
                onClick={() => { if(!isSearchExpanded) setIsSearchExpanded(true); }}
              >
                <Search size={18} className={`${isSearchExpanded ? 'text-slate-400 mr-2' : 'text-slate-300'}`} />
                {isSearchExpanded && (
                  <input
                    autoFocus
                    type="text"
                    placeholder="Pesquisar..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => searchQuery.trim().length >= 2 && setIsSearchOpen(true)}
                    className="bg-transparent border-none outline-none text-sm w-full text-white placeholder:text-slate-500"
                  />
                )}
              </div>
              
              <AnimatePresence>
                {isSearchOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-full right-0 mt-3 glass-card rounded-2xl overflow-hidden z-50 flex flex-col shadow-[0_10px_40px_rgba(0,0,0,0.8)] border border-yellow-500/30 w-[400px] max-h-[400px] overflow-y-auto custom-scrollbar"
                  >
                    {/* Produtos */}
                    {searchResults.produtos.length > 0 && (
                      <div className="p-3 border-b border-yellow-500/20">
                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 pl-2">Produtos</h4>
                        {searchResults.produtos.map((p: any) => (
                          <div key={p.id} onClick={() => { setIsSearchOpen(false); navigate("/store/pedido"); }} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-xl cursor-pointer transition-colors group">
                            <div className="w-8 h-8 rounded-lg bg-yellow-600/20 text-yellow-600 flex items-center justify-center shrink-0">
                              <Package size={14} />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-white group-hover:text-yellow-500 transition-colors">{p.nome}</p>
                              <p className="text-[10px] text-slate-400">Ref: #{p.id} • {p.categorias?.nome}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Pedidos */}
                    {searchResults.pedidos.length > 0 && (
                      <div className="p-3">
                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 pl-2">Pedidos Recentes</h4>
                        {searchResults.pedidos.map((pe: any) => (
                          <div key={pe.id} onClick={() => { setIsSearchOpen(false); navigate("/store/historico"); }} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-xl cursor-pointer transition-colors group">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
                              <ShoppingCart size={14} />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">Pedido {pe.id.substring(0,8)}</p>
                              <p className="text-[10px] text-slate-400">Status: {pe.status}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {searchResults.produtos.length === 0 && searchResults.pedidos.length === 0 && (
                      <div className="p-8 text-center text-slate-500">
                        <Search size={24} className="mx-auto mb-2 opacity-50" />
                        <p className="text-xs font-bold">Nenhum resultado encontrado.</p>
                        <p className="text-[10px]">Tente outra palavra-chave.</p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <AnimatePresence>
              {cartTotalItems > 0 && (
                <motion.button
                  key="cart-button"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  onClick={handleCartClick}
                  className="relative p-2 text-slate-400 hover:bg-white/10 rounded-lg transition-all"
                >
                  <ShoppingCart size={20} />
                  <motion.span
                    key={cartTotalItems}
                    initial={{ scale: 1.5 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 text-white text-[9px] font-semibold rounded-full flex items-center justify-center border border-[#0a0a0a]"
                  >
                    {cartTotalItems}
                  </motion.span>
                </motion.button>
              )}
            </AnimatePresence>

            <Link to="/store/notificacoes" className="relative p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all">
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-[#0a0a0a]"></span>
              )}
            </Link>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar p-0">
          <ErrorBoundary>
            <Suspense fallback={<div className="flex h-full w-full items-center justify-center pt-20"><img src={`${import.meta.env.VITE_SUPABASE_URL || "https://ybaoaskddcmwoincsnwm.supabase.co"}/storage/v1/object/public/uploads/icon.png`} alt="Carregando..." className="w-10 h-10 animate-spin opacity-80" /></div>}>
              <Routes>
                <Route path="/" element={<StoreHome />} />
                <Route
                  path="/pedido"
                  element={<StoreOrder cart={cart} setCart={setCart} />}
                />
                <Route path="/historico" element={<StoreHistory />} />
                <Route path="/notificacoes" element={<StoreNotifications />} />
                <Route path="/management" element={<StoreManagement />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </div>
      </div>

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
               className="bg-[#111] border border-blue-500/30 p-4 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] w-[300px] sm:w-[350px] relative pointer-events-auto cursor-pointer flex flex-col gap-1 overflow-hidden group"
               onClick={() => {
                 setActiveToasts(prev => prev.filter(t => t.id !== toast.id));
                 navigate("/store/notificacoes");
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
                 <Bell className="text-blue-500 flex-shrink-0" size={16} />
                 <h4 className="text-sm font-bold text-white pr-6 truncate">{toast.title}</h4>
               </div>
               <p className="text-xs text-slate-400 line-clamp-2">{toast.body}</p>
               
               <div className="h-1 w-full bg-white/5 absolute bottom-0 left-0">
                 <motion.div 
                   initial={{ width: "100%" }}
                   animate={{ width: "0%" }}
                   transition={{ duration: 60, ease: "linear" }}
                   className="h-full bg-blue-500"
                 />
               </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

    </div>
  );
}

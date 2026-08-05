import React, { useState, useEffect, useRef } from "react";
import {
  Routes,
  Route,
  Link,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { BrandName } from "../../components/Logo";
import { BrandTitle } from "../../components/BrandTitle";
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
import { useAuth } from "../../context/AuthContext";
import api from "../../lib/api";
import { supabase } from "../../lib/supabase";
import Swal from "sweetalert2";
import { sortGroupedCategories } from "../../lib/categoryUtils";
import { OptimizedImage } from "../../components/OptimizedImage";

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import { formatDynamicBracketText } from "../../lib/formatUtils";
import { ProductDescriptionModal } from "../../components/ProductDescriptionModal";
import { printGuiaTransporte } from "../../lib/printGuiaTransporte";

interface ProductItemProps {
  p: any;
  inCartQty: number;
  isOutOfStock: boolean;
  addToCart: (product: any, unit?: string) => void;
  removeFromCart: (id: number, unit: string, product: any) => void;
  updateCartQuantity?: (product: any, unit: string, quantity: number) => void;
  priority?: boolean;
  onProductClick: (product: any) => void;
}

const ProductItem = React.memo(({ p, inCartQty, isOutOfStock, addToCart, removeFromCart, updateCartQuantity, priority, onProductClick }: ProductItemProps) => {
  const nameMatch = p.nome.match(/^(.*?)(?:\s*\((.*?)\))?$/);
  const mainName = nameMatch ? nameMatch[1].trim() : p.nome;
  const bracketText = nameMatch && nameMatch[2] ? nameMatch[2].trim() : null;
  const dynamicBracketText = formatDynamicBracketText(bracketText, inCartQty);

  return (
    <div className={`flex items-center justify-between p-3 rounded-2xl bg-[#18181b] border border-white/5 hover:bg-[#27272a] transition-all ${isOutOfStock ? "opacity-60" : ""}`}>
      <div 
        className="flex items-center gap-4 flex-1 min-w-0 pr-2 cursor-pointer"
        onClick={() => onProductClick(p)}
      >
        <div className="w-10 h-10 bg-black/60 rounded-xl overflow-hidden border border-white/5 shrink-0 flex items-center justify-center">
          {p.imagem_url ? (
             <OptimizedImage src={p.imagem_url} priority={priority} className="w-full h-full object-cover" />
          ) : (
             <Package className="w-5 h-5 text-slate-500/50" />
          )}
        </div>
        <div className="flex flex-col min-w-0 gap-1.5">
          <div className="flex items-center gap-2">
            <p className="font-bold text-sm text-slate-200 truncate hover:text-white transition-colors min-w-0">{mainName}</p>
            {dynamicBracketText && (
              <span className="text-[9px] sm:text-[10px] font-black text-amber-400 uppercase tracking-widest bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.5 rounded-md shrink-0">
                {dynamicBracketText}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
             {isOutOfStock && (
               <span className="text-[9px] uppercase font-bold tracking-wider text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded ml-1">
                 Esgotado
               </span>
             )}
          </div>
        </div>
      </div>
      
      <div className="shrink-0">
        {inCartQty === 0 ? (
           <button 
             onClick={() => addToCart(p, p.unidade_compra || p.unidade_base || 'un')}
             // Borda apenas, sem cor de fundo, icone +
             className="w-10 h-10 border border-yellow-500/50 text-yellow-500 rounded-xl hover:bg-yellow-500/10 active:bg-yellow-500/20 active:scale-95 transition-all flex items-center justify-center focus:outline-none"
           >
             <Plus size={20} strokeWidth={2.5} />
           </button>
        ) : (
           <div className="flex items-center gap-1 sm:gap-2 border border-white/10 bg-black/40 px-1 py-1 rounded-xl">
             <button 
               onClick={() => removeFromCart(p.id, p.unidade_compra || p.unidade_base || 'un', p)} 
               className="p-1.5 sm:p-2 text-slate-300 hover:text-red-400 rounded-lg hover:bg-white/5 active:scale-90 transition-all focus:outline-none"
             >
               <Minus size={16} strokeWidth={2.5} />
             </button>
             <button 
               onClick={async () => {
                 if (updateCartQuantity) {
                   const { value: newQty } = await Swal.fire({
                     title: `Quantidade para ${p.nome}`,
                     input: 'number',
                     inputLabel: 'Nova quantidade',
                     inputValue: inCartQty,
                     showCancelButton: true,
                     confirmButtonText: 'Confirmar',
                     cancelButtonText: 'Cancelar',
                     inputAttributes: {
                       min: '0',
                       step: '1'
                     }
                   });
                   if (newQty !== undefined && newQty !== null && newQty !== '') {
                     const parsedQty = parseInt(newQty, 10);
                     if (!isNaN(parsedQty)) {
                       updateCartQuantity(p, p.unidade_compra || p.unidade_base || 'un', parsedQty);
                     }
                   }
                 }
               }}
               className="w-10 text-center font-bold text-white text-sm focus:outline-none hover:bg-white/10 rounded px-1 transition-colors"
             >
               {inCartQty}
             </button>
             <button 
               onClick={() => addToCart(p, p.unidade_compra || p.unidade_base || 'un')} 
               className="p-1.5 sm:p-2 text-yellow-500 hover:text-yellow-400 rounded-lg hover:bg-white/5 active:scale-90 transition-all focus:outline-none"
             >
               <Plus size={16} strokeWidth={2.5} />
             </button>
           </div>
        )}
      </div>
    </div>
  );
});

export default function StoreOrder({ cart, setCart }: { cart: any[]; setCart: any }) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const addToOrderId = queryParams.get("add_to");
  
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const deferredSearchTerm = React.useDeferredValue(searchTerm);
  const [observation, setObservation] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("mais_pedidos");
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);

  const [mostOrderedIds, setMostOrderedIds] = useState<number[]>([]);
  const [completedOrder, setCompletedOrder] = useState<{ cart: any[], observacoes: string, total: number, isMerge?: boolean } | null>(null);
  const [isConfirmingCheckout, setIsConfirmingCheckout] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    if (listRef.current) {
      listRef.current.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [activeCategory]);

  const fetchProductsData = async () => {
    try {
      api.get("/produtos").then(res => {
        setProducts((res.data as any[]).sort((a: any, b: any) => a.nome.localeCompare(b.nome)));
      }).catch(console.error);

      api.get("/categorias").then(res => {
        setCategories(res.data);
      }).catch(console.error);

      api.get("/pedidos?limit=500").then(res => {
        const orders = res.data as any[];
        const freq: Record<number, number> = {};
        orders.forEach(o => {
          o.pedido_itens?.forEach((i: any) => {
            freq[i.produto_id] = (freq[i.produto_id] || 0) + i.quantidade;
          });
        });
        const sortedByFreq = Object.entries(freq).sort((a,b) => b[1] - a[1]).map(e => Number(e[0]));
        setMostOrderedIds(sortedByFreq);
      }).catch(console.error);
    } catch(e) {
      console.error(e);
    }
  };

  const fetchLiveStockOnly = () => {
    api.get("/produtos").then((res) => {
      setProducts((res.data as any[]).sort((a: any, b: any) => a.nome.localeCompare(b.nome)));
    }).catch(console.error);
  };

  useEffect(() => {
    fetchProductsData();
    const channel = supabase
      .channel("store-order-sync-new")
      .on("postgres_changes", { event: "*", schema: "public", table: "produtos" }, () => {
        if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
        fetchTimeoutRef.current = setTimeout(() => fetchLiveStockOnly(), 500);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "stock_loja" }, () => {
        if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
        fetchTimeoutRef.current = setTimeout(() => fetchLiveStockOnly(), 500);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
    };
  }, []);

  const cartRef = React.useRef(cart);
  React.useEffect(() => { cartRef.current = cart; }, [cart]);

  const addToCart = React.useCallback(async (product: any, unit: string = "un") => {
    const isPesoVariavel = product.is_peso_variavel;
    let qtyToAdd = 1;

    const realStockPurchase = Number(product.stock_armazem) || 0;
    const fatorCompra = Number(product.fator_conversao_compra) || 1;
    const realStockBase = realStockPurchase * fatorCompra;
    
    const fatorVenda = Number(product.fator_conversao_venda) || 1;
    const currentCart = cartRef.current;
    
    // Total in cart in terms of "unit"
    const currentInCart = currentCart.filter((item) => item.id === product.id).reduce((acc, item) => acc + item.quantity, 0);
    
    // Requested total in Base Units
    const requestedTotalBase = (currentInCart + qtyToAdd) * fatorVenda;

    const existing = currentCart.find(item => item.id === product.id && item.unit === unit);
    if (existing) {
      setCart(currentCart.map(item => item.id === product.id && item.unit === unit ? { ...item, quantity: item.quantity + qtyToAdd } : item));
    } else {
      setCart([...currentCart, { ...product, quantity: qtyToAdd, unit }]);
    }
    return true;
  }, []);

  const updateCartQuantity = React.useCallback((product: any, unit: string, qty: number) => {
    const currentCart = cartRef.current;
    if (qty <= 0) {
      setCart(currentCart.filter(item => !(item.id === product.id && item.unit === unit)));
    } else {
      const existing = currentCart.find(item => item.id === product.id && item.unit === unit);
      if (existing) {
        setCart(currentCart.map(item => item.id === product.id && item.unit === unit ? { ...item, quantity: qty } : item));
      } else {
        setCart([...currentCart, { ...product, quantity: qty, unit }]);
      }
    }
  }, []);

  const removeFromCart = React.useCallback(async (id: number, unit: string, product: any) => {
    const currentCart = cartRef.current;
    const existing = currentCart.find(item => item.id === id && item.unit === unit);
    if (!existing) return;

    if (existing.quantity > 1) {
      setCart(currentCart.map(item => item.id === id && item.unit === unit ? { ...item, quantity: item.quantity - 1 } : item));
    } else {
      setCart(currentCart.filter(item => !(item.id === id && item.unit === unit)));
    }
  }, []);

  const clearCart = () => {
    Swal.fire({
      title: 'Limpar Carrinho?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim'
    }).then((result) => {
      if (result.isConfirmed) setCart([]);
    });
  };

  const confirmCheckout = async () => {
    if (isCheckingOut) return;
    setIsCheckingOut(true);
    const total = cart.reduce((acc, item) => acc + item.preco * item.quantity, 0);
    try {
      if (addToOrderId) {
         await api.post(`/pedidos/${addToOrderId}/merge`, {
           itens: cart.map(item => ({ produto_id: item.id, quantidade: item.quantity, preco: item.preco, unidade: item.unit })),
           total_adicional: total,
         });
      } else {
         await api.post("/pedidos", {
           itens: cart.map(item => ({ produto_id: item.id, quantidade: item.quantity, preco: item.preco, unidade: item.unit })),
           total,
           observacoes: observation,
         });
      }
      fetchProductsData();
      setIsConfirmingCheckout(false);
      setCompletedOrder({ cart: [...cart], observacoes: observation, total, isMerge: !!addToOrderId } as any);
      setCart([]);
      setObservation("");
    } catch (error: any) {
      console.error("API error during checkout", error);
      Swal.fire("Erro", error.response?.data?.message || "Ocorreu um erro.", "error");
    } finally {
      setIsCheckingOut(false);
    }
  };

  const filteredProducts = React.useMemo(() => {
    let filtered = products.filter((p) => {
      if (deferredSearchTerm && !p.nome.toLowerCase().includes(deferredSearchTerm.toLowerCase())) return false;
      if (activeCategory !== "mais_pedidos" && String(p.categoria_id) !== String(activeCategory)) return false;
      return true;
    });
    
    if (activeCategory === "mais_pedidos") {
      filtered = [...filtered].sort((a, b) => {
        const indexA = mostOrderedIds.indexOf(a.id);
        const indexB = mostOrderedIds.indexOf(b.id);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.nome.localeCompare(b.nome);
      });
    }
    return filtered;
  }, [products, deferredSearchTerm, activeCategory, mostOrderedIds]);

  const cartTotalItems = React.useMemo(() => cart.reduce((acc, item) => acc + item.quantity, 0), [cart]);
  const cartTotalPrice = React.useMemo(() => cart.reduce((acc, item) => acc + item.preco * item.quantity, 0), [cart]);

  const getGroupedItems = React.useCallback((items: any[]) => {
    return items.reduce((acc, item) => {
      const product = products.find((p) => p.id === item.id);
      const categoryName = product && product.categoria_nome ? product.categoria_nome : "Diversos";
      if (!acc[categoryName]) acc[categoryName] = [];
      acc[categoryName].push(item);
      return acc;
    }, {} as Record<string, any[]>);
  }, [products]);

  const currentGroupedCart = React.useMemo(() => getGroupedItems(cart), [cart, getGroupedItems]);
  const completedGroupedCart = React.useMemo(() => completedOrder ? getGroupedItems(completedOrder.cart) : {}, [completedOrder, getGroupedItems]);

  const cartMap = React.useMemo(() => {
    const map = new Map<number, number>();
    cart.forEach(item => {
      // considering item.id as unique per product for lookups
      map.set(item.id, (map.get(item.id) || 0) + item.quantity);
    });
    return map;
  }, [cart]);

  return (
    <div className="flex flex-col xl:flex-row gap-0 relative bg-[#050505] min-h-screen xl:min-h-0 xl:h-[calc(100vh-64px)] xl:overflow-hidden store-order-print-container">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .store-order-print-container, .store-order-print-container * { visibility: visible; }
          .store-order-print-container { position: absolute; left: 0; top: 0; width: 100%; }
          /* Se o modal de impressão estiver aberto, exibi-lo como o único conteúdo */
          .print-modal-active body * { visibility: hidden; }
          .print-modal-active .modal-print-content, .print-modal-active .modal-print-content * { visibility: visible !important; color: black !important; }
          .print-modal-active .modal-print-content { position: absolute; left: 0; top: 0; border: none; box-shadow: none; width: 100%; }
          .print-hidden { display: none !important; }
          .cart-printable-area { width: 100%; color: black; }
          .cart-item-print { border-bottom: 1px dashed #ccc; }
          .text-white { color: black !important; }
        }
      `}</style>

      {/* Main Single Box for Catalog */}
      <div className="flex-1 print-hidden flex flex-col xl:border-b-0 xl:border-r border-white/5 xl:h-full xl:overflow-hidden relative">
        <div className="bg-transparent flex flex-col h-full">
          
          <div className="sticky top-0 z-20 shrink-0 flex flex-col">
            <div className="bg-[#0a0a0a] p-4 lg:p-6 border-b border-white/5 shadow-md shadow-black/40 relative z-30">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative w-full lg:w-96">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                     type="text"
                     placeholder="Pesquisar produtos..."
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                     className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-3 text-white focus:border-slate-500/50 focus:ring-1 focus:ring-slate-500/50 text-sm outline-none transition-all"
                  />
                </div>
              </div>
            </div>
            
             <div className="bg-[#0a0a0a] px-4 py-3 lg:px-6 border-b border-white/10 shadow-md shadow-black/40 relative z-20">
               <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                 <button
                    onClick={() => setActiveCategory("mais_pedidos")}
                    className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap border ${activeCategory === "mais_pedidos" ? "bg-white/20 text-white border-white/40" : "bg-white/5 text-slate-400 border-transparent hover:bg-white/10"}`}
                 >
                   TODOS
                 </button>
                 {categories.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setActiveCategory(String(c.id))}
                      className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap border ${activeCategory === String(c.id) ? "bg-yellow-500/20 text-yellow-500 border-yellow-500/40" : "bg-white/5 text-slate-400 border-transparent hover:bg-white/10"}`}
                    >
                      {c.nome}
                    </button>
                 ))}
               </div>
             </div>
          </div>

          {/* Scrollable list inside the unified box */}
          <div ref={listRef} className="flex-1 p-4 space-y-2 xl:overflow-y-auto no-scrollbar">
              {filteredProducts.map((p, idx) => {
                const inCartQty = cartMap.get(p.id) || 0;
                const isOutOfStock = Number(p.stock_armazem) <= 0;
                
                return (
                  <ProductItem
                    key={p.id}
                    p={p}
                    inCartQty={inCartQty}
                    isOutOfStock={isOutOfStock}
                    addToCart={addToCart}
                    removeFromCart={removeFromCart}
                    updateCartQuantity={updateCartQuantity}
                    priority={idx < 15}
                    onProductClick={setSelectedProduct}
                  />
                )
              })}
              {filteredProducts.length === 0 && (
                 <div className="text-center py-12 border border-dashed border-white/5 rounded-xl">
                   <Package className="mx-auto text-slate-600 mb-2" size={32} />
                   <p className="text-slate-500 font-medium text-sm">Nenhum produto encontrado nesta vista.</p>
                 </div>
              )}
          </div>
        </div>
      </div>

      {/* Cart Section */}
      <div id="cart-section" className="w-full xl:w-[400px] shrink-0 cart-printable-area bg-[#050505] border-t xl:border-t-0 xl:border-l border-white/5 flex flex-col xl:h-full xl:overflow-y-auto no-scrollbar">
        <div className="p-4 lg:p-6 flex flex-col min-h-max print:max-h-none print:h-auto print:bg-white print:border-none print:shadow-none print:text-black">
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/5 print:border-black/20">
            <div>
              <h3 className="text-lg font-bold text-white print:text-black flex items-center gap-2 uppercase tracking-wide">
                {addToOrderId ? `Acrescento ao Pedido #${addToOrderId}` : "Seu Pedido"}
              </h3>
              <p className="text-xs text-slate-500 print:hidden mt-0.5">{cartTotalItems} itens no carrinho</p>
            </div>
            {cart.length > 0 && (
              <div className="flex gap-2 print-hidden">
                {addToOrderId && (
                   <button onClick={() => navigate('/loja/pedido', { replace: true })} className="px-2 py-1 bg-white/5 hover:bg-white/10 text-white rounded font-bold text-xs">
                     Cancelar Acrescento
                   </button>
                )}
                <button onClick={clearCart} className="p-2 text-slate-400 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-colors border border-transparent hover:border-red-500/20">
                  <Trash2 size={18} />
                </button>
              </div>
            )}
          </div>
          
          <div className="hidden print-only mb-6 text-black text-center border-b border-dashed border-black/50 pb-4">
            <h1 className="text-2xl font-black mb-1 uppercase tracking-widest text-black">{addToOrderId ? "ACRESCENTO DE PEDIDO" : "NOVO PEDIDO DIÁRIO"}</h1>
            {addToOrderId && <p className="text-md font-bold mb-2">Ref: #{addToOrderId}</p>}
            <p className="text-sm font-bold text-black border-t-2 border-dashed border-black/50 pt-2">{new Date().toLocaleString()}</p>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar mb-4 pr-2 space-y-0 print:overflow-visible">
            {cart.length === 0 ? (
              <div className="text-center py-10 print-hidden border border-dashed border-white/10 rounded-xl bg-black/20">
                <ShoppingCart className="mx-auto text-slate-600 mb-2" size={32} />
                <p className="text-sm text-slate-400">Carrinho Vazio</p>
              </div>
            ) : (
              sortGroupedCategories(Object.entries(currentGroupedCart)).map(([catName, items]: [string, any]) => (
                <div key={`cat-${catName}`} className="mb-4">
                  <h4 className="text-[10px] font-bold text-slate-500 mb-2 pl-1 print:text-black border-b border-white/5 pb-1 uppercase tracking-widest">{catName}</h4>
                  <div className="space-y-1">
                    {items.map(item => (
                      <div key={`${item.id}-${item.unit}`} className="flex justify-between items-center p-2 rounded-lg bg-[#0a0a0a] border border-white/5 hover:bg-[#111] transition-all cart-item-print print:p-1 print:border-b print:border-dashed print:border-black/30 print:rounded-none">
                        <div className="flex-1 min-w-0 flex items-center gap-3">
                          <div 
                            className="w-8 h-8 rounded-md bg-yellow-500/10 text-yellow-500 flex items-center justify-center font-black text-sm shrink-0 cursor-pointer hover:bg-yellow-500/20"
                            onClick={async () => {
                              const { value: newQty } = await Swal.fire({
                                title: `Quantidade para ${item.nome}`,
                                input: 'number',
                                inputLabel: 'Nova quantidade',
                                inputValue: item.quantity,
                                showCancelButton: true,
                                confirmButtonText: 'Confirmar',
                                cancelButtonText: 'Cancelar',
                                inputAttributes: { min: '0', step: '1' }
                              });
                              if (newQty !== undefined && newQty !== null && newQty !== '') {
                                const parsedQty = parseInt(newQty, 10);
                                if (!isNaN(parsedQty)) {
                                  updateCartQuantity(item, item.unit, parsedQty);
                                }
                              }
                            }}
                          >
                            {item.quantity}
                          </div>
                          <div className="flex flex-col min-w-0 flex-1 pr-2">
                            {(() => {
                              const match = item.nome.match(/^(.*?)(?:\s*\((.*?)\))?$/);
                              const mainName = match ? match[1].trim() : item.nome;
                              const bracketText = match && match[2] ? match[2].trim() : null;
                              const dynamicBracketText = formatDynamicBracketText(bracketText, item.quantity);
                              return (
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-bold text-slate-200 print:text-black truncate min-w-0">{mainName}</p>
                                  {dynamicBracketText && (
                                    <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest bg-amber-400/10 border border-amber-400/20 px-1 py-0.5 rounded-md print:bg-transparent print:border-none print:text-black print:p-0 shrink-0">
                                      {dynamicBracketText}
                                    </span>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 print-hidden">
                          <button onClick={() => removeFromCart(item.id, item.unit, item)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-white/5 rounded-md transition-colors">
                            <Minus size={14} strokeWidth={2.5} />
                          </button>
                          <button onClick={() => updateCartQuantity(item, item.unit, item.quantity + 1)} className="p-1.5 text-yellow-500 hover:text-yellow-400 hover:bg-white/5 rounded-md transition-colors">
                            <Plus size={14} strokeWidth={2.5} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-white/5 pt-4 mt-auto print:border-black/50 text-black">
            <div className="mb-4 print-hidden">
              <input
                type="text"
                placeholder="Observações adicionais..."
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                className="w-full bg-white/[0.02] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-white/20 focus:bg-white/[0.05] transition-colors placeholder:text-slate-600"
              />
            </div>
            <button
               onClick={() => setIsConfirmingCheckout(true)}
               disabled={cart.length === 0}
               className="w-full py-3.5 bg-yellow-500 text-black font-black uppercase tracking-widest text-sm rounded-xl hover:bg-yellow-400 active:scale-95 disabled:opacity-50 disabled:active:scale-100 print-hidden shadow-[0_0_20px_rgba(234,179,8,0.2)] transition-all"
            >
               Confirmar Pedido
            </button>
          </div>
        </div>
      </div>

      {isConfirmingCheckout && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 " onClick={() => !isCheckingOut && setIsConfirmingCheckout(false)} />
          <div className="relative w-full max-w-sm bg-[#111] rounded-3xl overflow-hidden shadow-2xl border border-white/10 p-6 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-yellow-500/10 text-yellow-500 rounded-full flex items-center justify-center mb-4">
              <CheckSquare size={32} />
            </div>
            <h2 className="text-xl font-black text-white mb-2">Finalizar Pedido?</h2>
            <p className="text-sm text-slate-400 mb-8">Tem certeza que deseja registrar este pedido com {cartTotalItems} itens?</p>
            
            <div className="flex w-full gap-3">
              <button 
                onClick={() => setIsConfirmingCheckout(false)}
                disabled={isCheckingOut}
                className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmCheckout}
                disabled={isCheckingOut}
                className="flex-1 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase rounded-xl transition-all shadow-[0_0_15px_rgba(234,179,8,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCheckingOut ? 'A PROCESSAR...' : 'CONFIRMAR'}
              </button>
            </div>
          </div>
        </div>
      )}

      {completedOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80  print:hidden" onClick={() => { setCompletedOrder(null); if (addToOrderId) navigate('/loja/pedido', { replace: true }); }} />
          <div className="relative w-full max-w-sm bg-[#111] rounded-2xl overflow-hidden shadow-2xl border border-white/5 modal-print-content flex flex-col max-h-[90vh]">
            <div className="p-5 pb-4 border-b border-white/5 print:border-black/20 shrink-0 text-center relative">
              <button onClick={() => { setCompletedOrder(null); if (addToOrderId) navigate('/loja/pedido', { replace: true }); }} className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors print-hidden">
                <X size={16} />
              </button>
              <div className="w-10 h-10 bg-black border border-white/5 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-3 print-hidden">
                <Check size={20} strokeWidth={2.5} />
              </div>
              <h2 className="text-lg font-bold text-white print:text-black">Pedido Registado</h2>
              <p className="text-xs text-slate-500 print:text-black/70 mt-1">{new Date().toLocaleString()}</p>
            </div>
            
            <div className="p-5 overflow-y-auto print:overflow-visible custom-scrollbar">
              <div className="hidden print-only mb-6 text-black text-center border-b border-dashed border-black/50 pb-4">
              <h1 className="text-xl font-black mb-1 uppercase tracking-widest text-black">{(completedOrder as any)?.isMerge ? "ACRESCENTO DE PEDIDO" : "NOVO PEDIDO DIÁRIO"}</h1>
              <div className="flex flex-col mt-3 text-left">
                  <span className="text-black font-bold text-sm">Loja: {user?.name || 'Loja'}</span>
                  <span className="text-black/70 text-xs">Resp: {user?.email?.split('@')[0] || 'Gerente'}</span>
                </div>
              </div>

              <div className="mb-5 print-hidden bg-[#0a0a0a] border border-white/5 rounded-xl p-3">
                <div className="flex flex-col">
                  <span className="text-white font-medium text-sm">Loja: {user?.name || 'Loja'}</span>
                  <span className="text-slate-500 text-xs mt-0.5">Resp: {user?.email?.split('@')[0] || 'Gerente'}</span>
                </div>
              </div>

              {sortGroupedCategories(Object.entries(completedGroupedCart)).map(([catName, items]: [string, any]) => (
                <div key={`completed-cat-${catName}`} className="mb-4">
                  <h4 className="text-[10px] font-bold uppercase text-slate-500 mb-2 border-b border-white/5 print:border-black/20 pb-1 print:text-black">{catName}</h4>
                  {items.map(item => (
                    <div key={`completed-${item.id}-${item.unit}`} className="flex justify-between items-center py-2.5 border-b border-white/5 last:border-0 cart-item-print print:p-2">
                      <div className="flex-1 min-w-0 pr-2 flex items-center gap-3">
                        <div className="text-slate-300 print:text-black text-sm font-medium w-6 shrink-0">
                          {item.quantity}x
                        </div>
                        <div className="flex flex-col min-w-0">
                          {(() => {
                            const match = item.nome.match(/^(.*?)(?:\s*\((.*?)\))?$/);
                            const mainName = match ? match[1].trim() : item.nome;
                            const bracketText = match && match[2] ? match[2].trim() : null;
                            const dynamicBracketText = formatDynamicBracketText(bracketText, item.quantity);
                            return (
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-slate-200 print:text-black truncate min-w-0">{mainName}</p>
                                {dynamicBracketText && (
                                  <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest bg-amber-400/10 border border-amber-400/20 px-1 py-0.5 rounded-md print:bg-transparent print:border-none print:text-black print:p-0 shrink-0">
                                    {dynamicBracketText}
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
              
              {completedOrder.observacoes && (
                <div className="mt-4 p-3 bg-white/5 rounded-xl border border-white/5 text-xs text-slate-300 print:text-black print:border-black/30 print:bg-transparent">
                  <strong className="text-white print:text-black block mb-1">Obs:</strong> {completedOrder.observacoes}
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-white/5 shrink-0 grid grid-cols-3 gap-2 print:hidden">
              <button 
                onClick={() => {
                  const sortedItems = Object.entries(completedGroupedCart).flatMap(([categoria_nome, items]: [string, any]) => 
                    items.map((i: any) => ({
                      nome_do_produto: i.nome,
                      quantidade: i.quantity,
                      unidade: i.unit,
                      secao: categoria_nome
                    }))
                  );
                  
                  printGuiaTransporte({
                    order: {
                      id: completedOrder.id,
                      store_name: user?.name || "Loja",
                      notas: completedOrder.observacoes,
                      items: sortedItems
                    },
                    store: {
                      nome: user?.name || "Loja" 
                    },
                    createdByName: "Sistema",
                    titulo: (completedOrder as any)?.isMerge ? "ACRESCENTO DE PEDIDO" : "NOVO PEDIDO DIÁRIO"
                  });
                }} 
                className="py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-all"
              >
                <Printer size={16} /> Imprimir
              </button>
              <button 
                onClick={() => {
                  const greeting = new Date().getHours() < 12 ? 'BOM DIA' : new Date().getHours() < 18 ? 'BOA TARDE' : 'BOA NOITE';
                  const lojaName = (user?.name || 'Loja').toUpperCase();
                  const header = `${greeting} PEDIDO ${lojaName}\n\n`;
                  const text = header + 
                    sortGroupedCategories(Object.entries(completedGroupedCart)).map(([cat, items]: any) => {
                      const sortedItems = [...items].sort((a: any, b: any) => {
                         const aIsFrango = a.nome?.toLowerCase().includes('frango');
                         const bIsFrango = b.nome?.toLowerCase().includes('frango');
                         if (aIsFrango && !bIsFrango) return -1;
                         if (!aIsFrango && bIsFrango) return 1;
                         return a.nome?.localeCompare(b.nome);
                      });
                      return `*${cat}*\n` + sortedItems.map((i: any) => `• ${i.quantity} ${i.nome}`).join('\n')
                    }).join('\n\n') + (completedOrder?.observacoes ? `\n\n*Obs*: ${completedOrder.observacoes}` : '');
                  
                  if (navigator.share) {
                    navigator.share({ title: 'Pedido', text }).catch(console.error);
                  } else {
                    navigator.clipboard.writeText(text);
                    Swal.fire({ toast: true, text: 'Copiado para a área de transferência', position: 'top-end', timer: 2000, showConfirmButton: false, icon: 'success' });
                  }
                }} 
                className="py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-all"
              >
                <Share2 size={16} /> Partilhar
              </button>
              <button 
                onClick={() => { setCompletedOrder(null); if (addToOrderId) navigate('/loja/pedido', { replace: true }); }} 
                className="py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-all"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Floating Cart Button */}
      {cart.length > 0 && (
        <button
          onClick={() => document.getElementById('cart-section')?.scrollIntoView({ behavior: 'smooth' })}
          className="fixed bottom-6 right-6 xl:hidden z-40 w-14 h-14 bg-red-500 rounded-full text-white flex items-center justify-center shadow-[0_4px_20px_rgba(239,68,68,0.4)] transition-transform active:scale-90"
        >
          <ShoppingCart size={24} />
          <span className="absolute -top-1 -right-1 bg-[#050505] text-red-500 text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-red-500">
            {cartTotalItems}
          </span>
        </button>
      )}

      <ProductDescriptionModal 
        isOpen={!!selectedProduct} 
        onClose={() => setSelectedProduct(null)} 
        product={selectedProduct} 
      />
    </div>
  );
}


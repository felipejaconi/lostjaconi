import React, { useState, useEffect, useRef } from "react";
import { ShoppingCart, Clock, CheckCircle2, Truck, Store, FileText, Edit, X, DollarSign, Package, ArrowLeft, Printer, Search, ChevronDown, ChevronUp, AlertCircle, TrendingUp, Filter, Scale, Check, Send, PlusCircle, Trash2, PackageMinus } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Swal from "sweetalert2";
import api from "../../lib/api";
import { supabase } from "../../lib/supabase";
import { useNavigate, useSearchParams } from "react-router-dom";
import { sortItemsByCategoryName, sortGroupedCategories } from "../../lib/categoryUtils";
import { printGuiaTransporte } from "../../lib/printGuiaTransporte";
import { printGenericDocument } from "../../lib/printGenericDocument";
import { useAuth } from "../../context/AuthContext";
import { BrandTitle } from "../../components/BrandTitle";

import { readWeightFromScale, autoConnectScale, onScaleStatusChange, ScaleStatus } from "../../lib/scale";

const TARE_OPTIONS = [
  { id: 'tara-laranja', name: 'Laranja', color: 'bg-orange-500', weight: 1.4 },
  { id: 'tara-verde', name: 'Verde', color: 'bg-green-700', weight: 1.8 },
  { id: 'tara-verde-rasa', name: 'Verde Rasa', color: 'bg-green-400', weight: 1.4 },
  { id: 'tara-hortalicas', name: 'Hortaliças', color: 'bg-black', weight: 0.7 },
  { id: 'tara-cinza', name: 'Cinza', color: 'bg-gray-500', weight: 1.6 },
  { id: 'tara-cartao', name: 'Cartão', color: 'bg-amber-800', weight: 0.5 }
];

export default function AdminOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState("todos");
  const [selectedStoreFilter, setSelectedStoreFilter] = useState("all");
  const [isStoreFilterOpen, setIsStoreFilterOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  
  const [isSelectStoreModalOpen, setIsSelectStoreModalOpen] = useState(false);
  const [selectedStoreIdForNewOrder, setSelectedStoreIdForNewOrder] = useState("");
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);

  const [activePreparationId, setActivePreparationId] = useState<number | null>(null);
  const [conferidos, setConferidos] = useState<Record<string, { quantidade: string | number, mode: string, unidade_saida: string, fator_conversao?: number, taraPeso?: number }>>({});
  const [loadingExit, setLoadingExit] = useState(false);
  const [newItemProductId, setNewItemProductId] = useState<string>("");
  const [newItemQuantity, setNewItemQuantity] = useState<number>(1);
  const [addProdSearch, setAddProdSearch] = useState("");
  const [isAddProdSearchOpen, setIsAddProdSearchOpen] = useState(false);
  const [activeTareDropdown, setActiveTareDropdown] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<"diario" | "semanal" | "todos">("diario");
  const [displayCount, setDisplayCount] = useState<number>(20);
  const [scaleStatus, setScaleStatus] = useState<ScaleStatus>('disconnected');

  // When expanding an order that is in "processando", initialize conferidos
  const handleExpandOrder = (orderId: number, status: string, items: any[]) => {
    if (expandedOrderId === orderId) {
      setExpandedOrderId(null);
      setActivePreparationId(null);
      return;
    }
    setExpandedOrderId(orderId);
    
    if (status === 'processando') {
      setActivePreparationId(orderId);
      const initialConf: Record<string, any> = {};
      items.forEach((i: any) => {
        const prod = products.find((p:any) => p.id === i.produto_id);
        const isScale = (prod?.is_peso_variavel || prod?.unidade_venda === 'kg');
        initialConf[i.produto_id] = {
           quantidade: i.display_qty != null ? i.display_qty : "",
           mode: isScale ? 'balanca' : 'unidade',
           unidade_saida: prod?.unidade_base || "un",
           fator_conversao: 1
        };
      });
      setConferidos(initialConf);
    } else {
      setActivePreparationId(null);
    }
  };

  const updateConferido = (produto_id: string, field: string, value: any) => {
    setConferidos(prev => {
        const newItem = { ...prev[produto_id], [field]: value };
        if (field === 'unidade_saida') {
           const prod = products.find(p => p.id === produto_id);
           if (prod) {
             newItem.fator_conversao = 1;
           }
        }
        
        if (field === 'quantidade') {
           // allow negative stock
           const val = Number(value);
        }
        return { ...prev, [produto_id]: newItem };
    });
  };

  const handleTareChange = (produto_id: string, newTare: number) => {
    setConferidos(prev => {
       const conf = prev[produto_id];
       if (!conf) return prev;
       
       const oldTare = conf.taraPeso || 0;
       let newQtyStr = conf.quantidade;
       
       if (conf.quantidade !== "" && conf.quantidade !== undefined && conf.quantidade !== null) {
          const qty = Number(conf.quantidade);
          const grossWeight = qty + oldTare;
          let newQty = grossWeight - newTare;
          if (newQty < 0) newQty = 0;
          newQtyStr = newQty.toFixed(3);
       }
       
       return {
          ...prev,
          [produto_id]: {
             ...conf,
             taraPeso: newTare,
             quantidade: newQtyStr
          }
       };
    });
    setActiveTareDropdown(null);
  };

  const getWeightFromScale = async (produto_id: string, max: number, taraWeight: number = 0) => {
    try {
      Swal.fire({
         title: "A ler Balança",
         text: "Coloque o produto na balança...",
         allowOutsideClick: false,
         didOpen: () => Swal.showLoading()
      });
      const rawWeight = Number(await readWeightFromScale());
      let finalWeight = rawWeight - taraWeight;
      if (finalWeight < 0) finalWeight = 0;
      updateConferido(produto_id, 'quantidade', finalWeight.toFixed(3));
      
      let message = `Peso lido: ${rawWeight} kg`;
      if (taraWeight > 0) message += `\n<br>Tara: -${taraWeight} kg<br><b>Líquido: ${finalWeight.toFixed(3)} kg</b>`;
      Swal.fire({ title: "Balança", html: message, icon: "success", timer: 2000, showConfirmButton: false });
    } catch (e: any) {
      console.error(e);
      Swal.fire("Erro", e.message || "Falha na leitura da balança.", "error");
    }
  };

  const handleSaveDraft = async (order: any) => {
    const itensToSubmit = order.pedido_itens
      .map((item: any) => {
        const conf = conferidos[item.produto_id];
        return {
           produto_id: item.produto_id,
           quantidade: conf && conf.quantidade !== "" ? Number(conf.quantidade) : null
        };
      });
      
    try {
       await api.post(`/wms/pedidos/${order.id}/rascunho`, { itens_conferidos: itensToSubmit });
       Swal.fire({ title: "Sucesso", text: "Progresso guardado.", icon: "success", timer: 1500, showConfirmButton: false });
       await fetchOrders();
    } catch (err: any) {
       Swal.fire("Erro", "Falha ao gravar progresso", "error");
    }
  };

  const handleWmsExit = async (order: any) => {
    const itensToSubmit = order.pedido_itens
      .map((item: any) => {
        const conf = conferidos[item.produto_id];
        let qty = Number(conf?.quantidade) || 0;
        return {
           produto_id: item.produto_id,
           quantidade: Number(qty.toFixed(3)),
           unidade: conf?.unidade_saida || 'un'
        };
      })
      .filter((i: any) => i.quantidade > 0);

    if (itensToSubmit.length === 0) {
      return Swal.fire("Atenção", "Nenhum item foi conferido para saída.", "warning");
    }

    try {
      setLoadingExit(true);

      // Calculate optimistic total and new items list based on conferidos
      const newItems = order.pedido_itens.map((i: any) => {
        const conf = conferidos[i.produto_id];
        const newQty = Number(conf?.quantidade) || 0;
        return { ...i, quantidade: newQty };
      }).filter((i: any) => i.quantidade > 0);

      const newTotal = newItems.reduce((acc: number, item: any) => acc + (item.quantidade * Number(item.preco_unitario)), 0);

      // Optimistically update status, items, and total
      setActivePreparationId(null);
      setOrders(prev => prev.map(o => o.id === order.id ? { 
         ...o, 
         status: 'pronto', 
         pedido_itens: newItems, 
         total: newTotal 
      } : o));

      await api.post("/wms/saida/agrupada", {
        loja_id: order.user_id,
        pedidos_ids: [order.id],
        itens_conferidos: itensToSubmit
      });

      Swal.fire({ title: "Sucesso", text: "Saída registada e pedido atualizado.", icon: "success", timer: 2000, showConfirmButton: false });
      
      const optimisticOrderToPrint = {
         ...order,
         status: 'pronto',
         pedido_itens: newItems,
         total: newTotal
      };
      setTimeout(() => {
        generateTransportGuide(optimisticOrderToPrint);
      }, 500);

      // We can skip fetchOrders here as the realtime channel will update it in background
    } catch (err: any) {
      // Revert optimistic
      fetchOrders();
      Swal.fire("Erro na Saída", err.response?.data?.error || "Erro ao processar.", "error");
    } finally {
      setLoadingExit(false);
    }
  };

  const groupItemsByCategory = (items: any[]) => {
    const groups: { [key: string]: any[] } = {};
    items.forEach(item => {
      const category = item.produto?.categoria?.nome || item.produto?.categorias?.nome || item.produto?.categoria_nome || "Sem Categoria";
      if (!groups[category]) groups[category] = [];
      groups[category].push(item);
    });
    Object.keys(groups).forEach(cat => {
      groups[cat].sort((a, b) => (a.produto?.nome || "").localeCompare(b.produto?.nome || ""));
    });
    return groups;
  };

  const handlePrintOrder = (order: any) => {
    const isCompleted = ['pronto', 'entregue', 'concluido'].includes(order.status?.toLowerCase());
    const groupedItems = groupItemsByCategory(order.pedido_itens || []);
    const dataRows: (string | number)[][] = [];

    sortGroupedCategories(Object.entries(groupedItems)).forEach(([category, items]) => {
      dataRows.push([`__SECTION__<span style="font-size: 7px; opacity: 0.8; letter-spacing: 0;">${category.toUpperCase()}</span>`]);
      items.forEach((item: any) => {
        if (isCompleted) {
          const qty = item.quantidade;
          const un = item.unidade || item.produto?.unidade_medida || 'un';
          const price = Number(item.preco_unitario || 0);
          const total = qty * price;
          
          dataRows.push([
            `<div style="display: flex; align-items: center; gap: 4px;">
               <div style="font-size: 10px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 220px; text-align: left;">${item.produto?.nome || "Produto Desconhecido"}</div>
               <div style="font-weight: 700; font-size: 10px; width: 40px; text-align: center;">${qty}${un}</div>
               <div style="font-size: 10px; width: 40px; text-align: right;">${price.toFixed(2)}€</div>
               <div style="font-size: 10px; width: 50px; text-align: right; font-weight: 700;">${total.toFixed(2)}€</div>
             </div>`
          ]);
        } else {
          const originalQty = item.quantidade_pedida != null ? item.quantidade_pedida : item.quantidade;
          const displayValue = (activePreparationId === order.id && conferidos[item.produto_id] && conferidos[item.produto_id].quantidade !== "") 
            ? conferidos[item.produto_id].quantidade 
            : (item.display_qty != null ? item.display_qty : '');
          dataRows.push([
            `<div style="display: flex; align-items: center; gap: 4px;">
               <div style="width: 12px; height: 12px; border: 1px solid #1e293b; box-sizing: border-box; flex-shrink: 0;"></div>
               <div style="font-weight: 700; font-size: 11px; min-width: 16px; text-align: center; flex-shrink: 0;">${originalQty}</div>
               <div style="font-size: 10px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 250px; text-align: left;">${item.produto?.nome || "Produto Desconhecido"}</div>
               <div style="border-bottom: 1px solid #94a3b8; width: 40px; height: 10px; flex-shrink: 0; margin-left: 2px; text-align: center; font-size: 10px; line-height: 10px; font-weight: bold;">${displayValue}</div>
             </div>`
          ]);
        }
      });
    });

    if (isCompleted) {
        let sumSubtotal = 0;
        let sumIva = 0;
        (order.pedido_itens || []).forEach((item: any) => {
          const qty = Number(item.quantidade) || 0;
          const preco = Number(item.preco_unitario || 0);
          const liq = qty * preco;
          const ivaPerc = Number(item.produto?.iva || 0);
          const ivaVal = liq * (ivaPerc / 100);
          sumSubtotal += liq;
          sumIva += ivaVal;
        });
        const sumTotalComIva = sumSubtotal + sumIva;
        
        dataRows.push([
            `<div style="display: flex; justify-content: flex-end; align-items: center; gap: 8px; margin-top: 15px; padding-top: 10px; border-top: 2px solid #e2e8f0;">
               <div style="font-size: 10px; font-weight: 600; text-align: right; width: 150px; color: #475569;">Total S/ IVA (Subtotal):</div>
               <div style="font-size: 10px; font-weight: 700; width: 60px; text-align: right;">€ ${sumSubtotal.toFixed(2)}</div>
             </div>`
        ]);
        dataRows.push([
            `<div style="display: flex; justify-content: flex-end; align-items: center; gap: 8px;">
               <div style="font-size: 10px; font-weight: 600; text-align: right; width: 150px; color: #475569;">IVA Aplicado:</div>
               <div style="font-size: 10px; font-weight: 700; width: 60px; text-align: right;">€ ${sumIva.toFixed(2)}</div>
             </div>`
        ]);
        dataRows.push([
            `<div style="display: flex; justify-content: flex-end; align-items: center; gap: 8px; margin-top: 4px; padding-top: 4px; border-top: 1px solid #cbd5e1;">
               <div style="font-size: 12px; font-weight: 800; text-align: right; width: 150px; color: #0f172a;">Total (Com IVA):</div>
               <div style="font-size: 12px; font-weight: 800; width: 60px; text-align: right; color: #10b981;">€ ${sumTotalComIva.toFixed(2)}</div>
             </div>`
        ]);
    }

    const docNumberStr = `CF-${new Date().getFullYear()}-${String(order.id).substring(0,8).toUpperCase()}`;

    const headersList = isCompleted 
      ? ['<div style="display: flex; gap: 4px; align-items: center;"><div style="width: 220px; text-align: left;">PRODUTO</div><div style="width: 40px; text-align: center;">FINAL</div><div style="width: 40px; text-align: right;">UNID</div><div style="width: 50px; text-align: right;">TOTAL</div></div>']
      : ['<div style="display: flex; gap: 4px; align-items: center;"><div style="width: 12px; text-align: center;">✓</div><div style="min-width: 16px; text-align: center;">QTD</div><div style="width: 250px; text-align: left;">PRODUTO</div><div style="width: 40px; text-align: center;">REAL</div></div>'];

    // Here we assume printGenericDocument is imported. We will add the import next if needed.
    printGenericDocument({
      title: isCompleted ? "RESUMO DO PEDIDO" : "GUIA DE CONFERÊNCIA",
      docNumber: docNumberStr,
      recipientName: order.loja_nome || order.user?.name || "Loja Desconhecida",
      recipientEmail: order.user?.address ? `${order.user?.address}\nTelf: ${order.user?.phone || 'N/A'}` : "",
      headers: headersList,
      data: dataRows,
      footerNotes: order.observacoes ? `Obs: ${order.observacoes}` : (isCompleted ? "Faturação do pedido processado." : "Documento de conferência para separação."),
      date: isCompleted ? order.created_at : undefined
    });
  };

  const handleExportExcel = (order: any) => {
    const isCompleted = ['pronto', 'entregue'].includes(order.status?.toLowerCase());
    const groupedItems = groupItemsByCategory(order.pedido_itens || []);
    const dataRows: (string | number)[][] = [];

    sortGroupedCategories(Object.entries(groupedItems)).forEach(([category, items]) => {
      dataRows.push([`__SECTION__<span style="font-size: 7px; opacity: 0.8; letter-spacing: 0;">${category.toUpperCase()}</span>`]);
      items.forEach((item: any) => {
        if (isCompleted) {
          const qty = item.quantidade;
          const un = item.unidade || item.produto?.unidade_medida || 'un';
          const price = Number(item.preco_unitario || 0);
          const total = qty * price;
          
          dataRows.push([
            `<div style="display: flex; align-items: center; gap: 4px;">
               <div style="font-size: 10px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 220px; text-align: left;">${item.produto?.nome || "Produto Desconhecido"}</div>
               <div style="font-weight: 700; font-size: 10px; width: 40px; text-align: center;">${qty}${un}</div>
               <div style="font-size: 10px; width: 40px; text-align: right;">${price.toFixed(2)}€</div>
               <div style="font-size: 10px; width: 50px; text-align: right; font-weight: 700;">${total.toFixed(2)}€</div>
             </div>`
          ]);
        } else {
          const originalQty = item.quantidade_pedida != null ? item.quantidade_pedida : item.quantidade;
          const displayValue = (activePreparationId === order.id && conferidos[item.produto_id] && conferidos[item.produto_id].quantidade !== "") 
            ? conferidos[item.produto_id].quantidade 
            : (item.display_qty != null ? item.display_qty : '');
          dataRows.push([
            `<div style="display: flex; align-items: center; gap: 4px;">
               <div style="width: 12px; height: 12px; border: 1px solid #1e293b; box-sizing: border-box; flex-shrink: 0;"></div>
               <div style="font-weight: 700; font-size: 11px; min-width: 16px; text-align: center; flex-shrink: 0;">${originalQty}</div>
               <div style="font-size: 10px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 250px; text-align: left;">${item.produto?.nome || "Produto Desconhecido"}</div>
               <div style="border-bottom: 1px solid #94a3b8; width: 40px; height: 10px; flex-shrink: 0; margin-left: 2px; text-align: center; font-size: 10px; line-height: 10px; font-weight: bold;">${displayValue}</div>
             </div>`
          ]);
        }
      });
    });

    const headersList = isCompleted 
      ? ['<div style="display: flex; gap: 4px; align-items: center;"><div style="width: 220px; text-align: left;">PRODUTO</div><div style="width: 40px; text-align: center;">FINAL</div><div style="width: 40px; text-align: right;">UNID</div><div style="width: 50px; text-align: right;">TOTAL</div></div>']
      : ['<div style="display: flex; gap: 4px; align-items: center;"><div style="width: 12px; text-align: center;">✓</div><div style="min-width: 16px; text-align: center;">QTD</div><div style="width: 250px; text-align: left;">PRODUTO</div><div style="width: 40px; text-align: center;">REAL</div></div>'];

    printGenericDocument({
      title: isCompleted ? "RESUMO DO PEDIDO" : "GUIA DE CONFERÊNCIA",
      docNumber: `EXP-${new Date().getFullYear()}-${String(order.id).substring(0,8).toUpperCase()}`,
      recipientName: order.loja_nome || order.user?.name || "Loja Desconhecida",
      recipientEmail: order.user?.address ? `${order.user?.address}\nTelf: ${order.user?.phone || 'N/A'}` : "",
      headers: headersList,
      data: dataRows,
      footerNotes: order.observacoes ? `Obs: ${order.observacoes}` : (isCompleted ? "Faturação do pedido processado." : "Documento de conferência para separação."),
      date: isCompleted ? order.created_at : undefined
    });
  };

  const viewModeRef = useRef(viewMode);
  const statusFilterRef = useRef(statusFilter);

  useEffect(() => {
    viewModeRef.current = viewMode;
    statusFilterRef.current = statusFilter;
    fetchOrders(); // re-fetch when viewMode or statusFilter changes
  }, [viewMode, statusFilter]);

  const fetchOrders = async () => {
    try {
      const mode = viewModeRef.current;
      const status = statusFilterRef.current;
      let url = '/pedidos';
      
      let queryParams = [];

      if (status !== 'todos') {
         queryParams.push(`status=${status}`);
      }
      
      if (mode === 'diario') {
         const date = new Date();
         date.setDate(date.getDate() - 1); // Yesterday
         date.setHours(0,0,0,0);
         queryParams.push(`startDate=${date.toISOString()}`);
      } else if (mode === 'semanal') {
         const date = new Date();
         date.setDate(1); // Start of month
         date.setHours(0,0,0,0);
         queryParams.push(`startDate=${date.toISOString()}`);
      } else {
         queryParams.push(`all=true`);
      }
      
      if (queryParams.length > 0) {
         url += `?${queryParams.join('&')}`;
      }
      
      const res = await api.get(url);
      setOrders(res.data);
    } catch (error) {
      console.error("Erro ao buscar pedidos:", error);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await api.get("/produtos");
      setProducts(res.data);
    } catch (error) {
      console.error("Erro ao buscar produtos:", error);
    }
  };

  const fetchStores = async () => {
    try {
      const res = await api.get("/admin/users");
      const data = res.data as any[];
      const storeUsers = data.filter((u: any) => u.role === "loja");
      setStores(storeUsers);
    } catch (error) {
      console.error("Erro ao buscar lojas:", error);
    }
  };

  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const observerRef = useRef<IntersectionObserver | null>(null);

  const loadMoreRef = React.useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) observerRef.current.disconnect();
    if (node) {
      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          setDisplayCount(c => c + 20);
        }
      }, { threshold: 0.1 });
      observerRef.current.observe(node);
    }
  }, []);

  useEffect(() => {
    autoConnectScale();
    const unsubscribeScale = onScaleStatusChange(setStatus => {
        setScaleStatus(setStatus);
    });

    fetchOrders(); fetchStores(); fetchProducts();

    const handleFocus = () => {
      fetchOrders(); fetchProducts();
    };
    window.addEventListener('focus', handleFocus);

    const debouncedFetch = (fetchers: (() => void)[]) => {
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
      fetchTimeoutRef.current = setTimeout(() => { fetchers.forEach(f => f()); }, 500);
    };

    const channel = supabase.channel("admin-orders-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "pedidos" }, () => debouncedFetch([fetchOrders]))
      .on("postgres_changes", { event: "*", schema: "public", table: "users" }, () => debouncedFetch([fetchStores]))
      .on("postgres_changes", { event: "*", schema: "public", table: "produtos" }, () => debouncedFetch([fetchProducts]))
      .subscribe();

    return () => { 
        window.removeEventListener('focus', handleFocus); 
        supabase.removeChannel(channel); 
        if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current); 
        unsubscribeScale();
    };
  }, []);

  // Auto-sync prices for pending/processing orders if product prices changed
  useEffect(() => {
    if (products.length > 0 && orders.length > 0) {
      let needsUpdate = false;
      const updates: any[] = [];
      const updatedOrders = [...orders];

      updatedOrders.forEach(order => {
        if (order.status === 'pendente' || order.status === 'processando') {
          order.pedido_itens?.forEach((item: any) => {
            const prod = products.find(p => p.id === item.produto_id);
            if (prod && Number(prod.preco) > 0 && Math.abs(Number(prod.preco) - Number(item.preco_unitario)) > 0.001) {
              updates.push(api.put(`/pedidos/${order.id}/itens/${item.id}`, { preco_unitario: Number(prod.preco) }));
              item.preco_unitario = Number(prod.preco);
              needsUpdate = true;
            }
          });
        }
      });

      if (needsUpdate) {
        setOrders(updatedOrders); // Trigger re-render with new values
        Promise.all(updates).catch(e => console.error("Error auto-syncing prices:", e));
      }
    }
  }, [products]); // Trigger sync whenever products are updated

  const updateStatus = async (id: number, status: string) => {
    // Optimistic Update
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
    if (editingOrder?.id === id) setEditingOrder(prev => prev ? { ...prev, status } : null);
    
    if (status === 'processando') {
       setExpandedOrderId(id);
       setActivePreparationId(id);
       const targetOrder = orders.find(o => o.id === id);
       if (targetOrder) {
          const initialConf: Record<string, any> = {};
          (targetOrder.pedido_itens || []).forEach((i: any) => {
             const prod = products.find((p:any) => p.id === i.produto_id);
             const isScale = (prod?.is_peso_variavel || prod?.unidade_venda === 'kg');
             initialConf[i.produto_id] = {
                quantidade: i.display_qty != null ? i.display_qty : "",
                mode: isScale ? 'balanca' : 'unidade',
                unidade_saida: prod?.unidade_base || "un",
                fator_conversao: 1
             };
          });
          setConferidos(initialConf);
       }
    } else {
       if (expandedOrderId === id && status === 'pendente') {
          // You might close on pendente if you want, but by default we can just leave it open
       }
       setActivePreparationId(null);
    }

    try {
      await api.put(`/pedidos/${id}/status`, { status });
      // Remove fetchOrders() here, rely on realtime or let optimistic be enough for now.
    } catch (error) {
       // Rollback on error by refetching
      fetchOrders();
      Swal.fire("Erro", "Falha ao atualizar status", "error");
    }
  };

  const deleteOrder = async (id: number) => {
    const confirm = await Swal.fire({
      title: 'Excluir pedido?',
      text: "Esta ação não pode ser desfeita.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#3f3f46',
      confirmButtonText: 'Sim, excluir',
      cancelButtonText: 'Cancelar'
    });

    if (confirm.isConfirmed) {
      try {
        await api.delete(`/pedidos/${id}`);
        setOrders(prev => prev.filter(o => o.id !== id));
        Swal.fire({
          icon: 'success',
          title: 'Excluído!',
          text: 'O pedido foi excluído.',
          timer: 1500,
          showConfirmButton: false,
          toast: true,
          position: 'top-end'
        });
      } catch (error: any) {
         Swal.fire({
          icon: 'error',
          title: 'Erro',
          text: error.response?.data?.error || 'Erro ao excluir pedido'
        });
      }
    }
  };

  const handleUpdateOrderItem = async (orderId: number, itemId: number, newQuantity: number, newPrice?: number) => {
    try {
      // Optimistic Update
      setOrders(prev => prev.map(o => {
        if (o.id === orderId) {
          if (newQuantity <= 0) {
            return { ...o, pedido_itens: o.pedido_itens?.filter((i:any) => i.id !== itemId) };
          } else {
             return {
                ...o,
                pedido_itens: o.pedido_itens?.map((i:any) => 
                   i.id === itemId 
                   ? { ...i, quantidade: newQuantity, ...(newPrice !== undefined && { preco_unitario: newPrice }) } 
                   : i
                )
             };
          }
        }
        return o;
      }));

      if (newQuantity <= 0) {
        await api.delete(`/pedidos/${orderId}/itens/${itemId}`);
      } else {
        const payload: any = { quantidade: newQuantity };
        if (newPrice !== undefined) payload.preco_unitario = newPrice;
        await api.put(`/pedidos/${orderId}/itens/${itemId}`, payload);
      }
      
      // Removed fetchOrders() for immediate UI response. Realtime channel will fetch anyway.
      
      if (editingOrder?.id === orderId) {
         const updatedRes = await api.get(`/pedidos/${orderId}`);
         setEditingOrder(updatedRes.data);
      }
    } catch (error) {
      fetchOrders();
      Swal.fire("Erro", "Falha ao atualizar item", "error");
    }
  };

  const handleAddOrderItem = async (orderId: number) => {
    if (!newItemProductId || newItemQuantity <= 0) return Swal.fire("Aviso", "Selecione um produto e uma quantidade válida", "warning");
    try {
      const prod = products.find(p => p.id === newItemProductId);
      // Optimistic Update
      setOrders(prev => prev.map(o => {
        if (o.id === orderId) {
          const newItem = {
             id: Math.random(), // fake id for optimistic
             produto_id: newItemProductId,
             quantidade: newItemQuantity,
             preco_unitario: Number(prod?.preco || 0),
             produto: prod
          };
          return { ...o, pedido_itens: [...(o.pedido_itens || []), newItem] };
        }
        return o;
      }));

      await api.post(`/pedidos/${orderId}/itens`, { produto_id: newItemProductId, quantidade: newItemQuantity });
      setNewItemProductId(""); setNewItemQuantity(1);
      // Let realtime/refetch handle true data
      // fetchOrders();
      if (editingOrder?.id === orderId) {
        const updatedRes = await api.get(`/pedidos/${orderId}`);
        setEditingOrder(updatedRes.data);
      }
      Swal.fire({ title: "Inserido!", text: "Produto adicionado com sucesso.", icon: "success", timer: 1500, showConfirmButton: false, toast: true, position: 'bottom-end' });
    } catch (error: any) {
        fetchOrders();
        Swal.fire("Erro", error.response?.data?.message || "Erro ao adicionar", "error");
    }
  };

  const handleCreateNewOrderForStore = async () => {
    if (!selectedStoreIdForNewOrder) return Swal.fire("Aviso", "Selecione uma loja", "warning");
    try {
      setIsCreatingOrder(true);
      const res: any = await api.post("/pedidos", {
        loja_id: selectedStoreIdForNewOrder,
        itens: [],
        total: 0,
        observacoes: "Pedido criado pelo Administrador"
      });
      Swal.fire({ title: "Sucesso", text: "Rascunho de pedido criado.", icon: "success", timer: 1500, showConfirmButton: false });
      
      setIsSelectStoreModalOpen(false);
      setSelectedStoreIdForNewOrder("");
      await fetchOrders();
      
      if (res.data.pedidoId) {
         const newOrderId = res.data.pedidoId;
         const updatedRes = await api.get(`/pedidos/${newOrderId}`);
         if (updatedRes.data) {
            setEditingOrder(updatedRes.data);
         }
      }
    } catch (error: any) {
      Swal.fire("Erro", error.response?.data?.message || "Falha ao criar pedido", "error");
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const generateTransportGuide = async (orderInput: any) => {
    try {
      const order = typeof orderInput === 'object' ? orderInput : orders.find((o) => o.id === orderInput);
      if (!order) return;
      
      const validItems = (order.pedido_itens || []).filter((i: any) => i && i.produto);
      const sortedItems = sortItemsByCategoryName(validItems, (item: any) => item?.produto?.categoria?.nome || item?.produto?.categorias?.nome || item?.produto?.categoria_nome || "");
      
      printGuiaTransporte({
        order: {
          id: order.id,
          store_name: order.loja_nome || order.user?.name || "Loja Desconhecida",
          notas: order.observacoes || order.notas,
          items: sortedItems.map((i: any) => ({
            nome_do_produto: i.produto?.nome || "Produto Desconhecido",
            quantidade: i.quantidade_pedida != null ? i.quantidade_pedida : i.quantidade,
            qty_real: i.quantidade_pedida != null ? i.quantidade : null,
            unidade: i.unidade || i.produto?.unidade_medida || "un",
            secao: i.produto?.categoria?.nome || i.produto?.categorias?.nome || i.produto?.categoria_nome || "Sem Categoria"
          }))
        },
        store: {
          nome: order.loja_nome || order.user?.name || "Loja",
          matricula: order.user?.matricula,
          endereco: order.user?.address || "",
          telefone: order.user?.phone || "",
        },
        createdByName: user?.name || "Administrador",
      });
      
    } catch (error) {
      console.error("Erro ao gerar guia:", error);
    }
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pendente": return <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest bg-amber-500/10 text-amber-500 border border-amber-500/20"><Clock size={12} className="mr-1.5" /> Pendente</span>;
      case "processando": return <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest bg-rose-500/10 text-rose-500 border border-rose-500/20"><Package size={12} className="mr-1.5" /> Prep</span>;
      case "pronto": return <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"><Truck size={12} className="mr-1.5" /> Pronto</span>;
      case "concluido": case "entregue": return <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest bg-purple-500/10 text-purple-400 border border-purple-500/20"><CheckCircle2 size={12} className="mr-1.5" /> Entregue</span>;
      case "cancelado": return <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest bg-rose-500/10 text-rose-500 border border-rose-500/20"><AlertCircle size={12} className="mr-1.5" /> Cance</span>;
      default: return <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest bg-zinc-800 text-zinc-400 border border-zinc-700">{status}</span>;
    }
  };

  const renderProductName = (name: string) => {
    if (!name) return "";
    const parts = name.split(/(\([^)]*\))/g);
    return (
      <>
        {parts.map((part, index) => {
          if (part.startsWith("(") && part.endsWith(")")) {
            return (
              <span key={index} className="text-amber-400 font-bold bg-amber-500/10 px-1 rounded whitespace-nowrap">
                {part}
              </span>
            );
          }
          return <span key={index}>{part}</span>;
        })}
      </>
    );
  };

  const matchesViewModeDate = (dateString: string) => {
    if (viewMode === 'todos') return true;
    
    const orderDate = new Date(dateString);
    const agora = new Date();
    agora.setHours(0,0,0,0);
    
    if (viewMode === 'diario') {
      const yesterday = new Date(agora);
      yesterday.setDate(yesterday.getDate() - 1);
      return orderDate >= yesterday;
    } else if (viewMode === 'semanal') {
      const startOfMonth = new Date(agora.getFullYear(), agora.getMonth(), 1);
      return orderDate >= startOfMonth;
    }
    return true;
  };

  const filteredOrders = orders.filter((o) => {
    const s = o.status.toLowerCase();
    
    const matchesStatus = statusFilter === "todos" 
      ? true 
      : (statusFilter === "entregue" ? (s === "entregue" || s === "concluido") : s === statusFilter);
    const matchesSearch = searchTerm === "" || (o.user?.name || o.loja_nome || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStore = selectedStoreFilter === "all" || String(o.user_id) === String(selectedStoreFilter);
    
    const matchesDate = matchesViewModeDate(o.created_at);
    
    return matchesStatus && matchesSearch && matchesStore && matchesDate;
  });

  const uniqueStores = (Array.from(new Map(orders.map((o: any) => [o.user_id, o])).values()) as any[])
    .filter((o: any) => o.user_id)
    .map((o: any) => ({
      id: o.user_id,
      name: o.loja_nome || o.user?.name || "Loja"
    }))
    .sort((a,b) => a.name.localeCompare(b.name));

  const renderScaleStatus = () => {
      switch (scaleStatus) {
          case 'connected':
              return (
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full text-[10px] font-bold uppercase tracking-wider mt-[15px]" title="Balança conectada">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Balança OK
                  </div>
              );
          case 'connecting':
              return (
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-full text-[10px] font-bold uppercase tracking-wider mt-[15px]" title="A tentar conectar à balança...">
                      <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
                      A Ligar...
                  </div>
              );
          case 'error':
              return (
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-red-500/10 text-red-500 border border-red-500/20 rounded-full text-[10px] font-bold uppercase tracking-wider mt-[15px]" title="Erro ao conectar à balança. Verifique o cabo e portas USB.">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      Erro Balança
                  </div>
              );
          case 'disconnected':
          default:
              return (
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-zinc-500/10 text-zinc-500 border border-zinc-500/20 rounded-full text-[10px] font-bold uppercase tracking-wider mt-[15px]" title="Balança desconectada">
                      <div className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                      Desconectada
                  </div>
              );
      }
  };

  return (
    <div className="pt-2 md:pt-4 pb-6 px-4 md:px-6 lg:px-8 max-w-7xl mx-auto">
      
      {/* Header & Controls Container - Compact */}
      <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-4 md:px-5 mb-4 shadow-2xl flex flex-col gap-4 relative z-10">
        
        {/* Top Row: Title, Scale, New Button, Stats */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2">
          <div className="flex items-center gap-4 flex-wrap">
             <BrandTitle title="Pedidos" titleClassName="text-2xl p-0 m-0" hideUnderline />
             {renderScaleStatus()}
             <button
               onClick={() => setIsSelectStoreModalOpen(true)}
               className="flex items-center gap-1.5 px-3 py-1.5 mt-[14px] bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold rounded-lg text-xs transition-colors shadow-sm"
             >
               <Package size={14} /> Novo
             </button>
          </div>

          {/* Compact Stats */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            <div className="bg-white/5 border border-white/5 rounded-xl px-3 py-1.5 flex flex-col items-start min-w-[100px]">
                 <p className="text-[8px] font-black uppercase tracking-widest text-amber-500/70 mb-0.5">Pendentes</p>
                 <p className="text-sm font-black text-white tabular-nums leading-none">{orders.filter(o => o.status === 'pendente' || o.status === 'processando').length}</p>
            </div>
            <div className="bg-white/5 border border-white/5 rounded-xl px-3 py-1.5 flex flex-col items-start min-w-[100px]">
                 <p className="text-[8px] font-black uppercase tracking-widest text-rose-500/70 mb-0.5">Entregues</p>
                 <p className="text-sm font-black text-white tabular-nums leading-none">{orders.filter(o => {
                     const s = o.status.toLowerCase();
                     const isComplete = ['pronto', 'concluido', 'entregue'].includes(s);
                     const isToday = new Date(o.created_at).toDateString() === new Date().toDateString();
                     return isComplete && isToday;
                 }).length}</p>
            </div>
            <div className="bg-white/5 border border-white/5 rounded-xl px-3 py-1.5 flex flex-col items-start min-w-[100px]">
                 <p className="text-[8px] font-black uppercase tracking-widest text-emerald-500/70 mb-0.5">Faturação</p>
                 <p className="text-sm font-black text-white tabular-nums leading-none">€<span>{orders.filter(o => matchesViewModeDate(o.created_at)).reduce((acc, o) => acc + Number(o.total || 0), 0).toLocaleString('pt-PT', {minimumFractionDigits:2, maximumFractionDigits:2})}</span></p>
            </div>
          </div>
        </div>

        {/* Bottom Row: Filters & Search */}
        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between bg-white/[0.02] p-2 rounded-xl border border-white/5 -mt-[12px]">
          <div className="flex flex-col sm:flex-row w-full lg:w-auto gap-3 items-center">
            
            {/* View Mode Toggle */}
            <div className="inline-flex bg-black/40 p-1 rounded-lg border border-white/5 shadow-inner w-full sm:w-auto">
              <button
                 onClick={() => { setViewMode('diario'); setStatusFilter('todos'); }}
                 className={`flex-1 sm:flex-none px-4 py-1.5 text-[10px] flex items-center justify-center font-black uppercase tracking-wider rounded-md transition-all ${
                   viewMode === 'diario' ? 'bg-emerald-500 text-emerald-950 shadow-md' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                 }`}
              >
                Diários
              </button>
              <button
                 onClick={() => { setViewMode('semanal'); setStatusFilter('todos'); }}
                 className={`flex-1 sm:flex-none px-4 py-1.5 text-[10px] flex items-center justify-center font-black uppercase tracking-wider rounded-md transition-all ${
                   viewMode === 'semanal' ? 'bg-emerald-500 text-emerald-950 shadow-md' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                 }`}
              >
                Semanal
              </button>
              <button
                 onClick={() => { setViewMode('todos'); setStatusFilter('todos'); }}
                 className={`flex-1 sm:flex-none px-4 py-1.5 text-[10px] flex items-center justify-center font-black uppercase tracking-wider rounded-md transition-all ${
                   viewMode === 'todos' ? 'bg-emerald-500 text-emerald-950 shadow-md' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                 }`}
              >
                Todos
              </button>
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-64 group">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-emerald-500 transition-colors" />
              <input 
                type="text" 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Pesquisar loja ou número..."
                className="w-full bg-black/40 border border-white/10 rounded-lg py-1.5 pl-9 pr-3 text-xs text-zinc-100 outline-none placeholder:text-zinc-600 transition-all focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 shadow-inner"
              />
            </div>
            
            {/* Store Filter */}
             {uniqueStores.length > 0 && (
               <div className="relative w-full sm:w-auto">
                 <button
                   onClick={() => setIsStoreFilterOpen(!isStoreFilterOpen)}
                   className="flex w-full sm:w-auto items-center justify-between gap-2 px-3 py-1.5 h-[32px] text-[10px] font-black uppercase tracking-wider transition-all rounded-lg border bg-black/40 text-zinc-300 border-white/10 hover:border-emerald-500/50 hover:text-emerald-400 shadow-inner"
                 >
                   <div className="flex items-center gap-2">
                     <Store size={12} className={selectedStoreFilter === 'all' ? 'text-zinc-500' : 'text-emerald-500'} />
                     {selectedStoreFilter === 'all' 
                       ? 'Lojas' 
                       : uniqueStores.find(s => String(s.id) === String(selectedStoreFilter))?.name || 'Lojas'}
                   </div>
                   <ChevronDown size={12} className={`transition-transform ${isStoreFilterOpen ? 'rotate-180' : ''}`} />
                 </button>
                 
                 <AnimatePresence>
                   {isStoreFilterOpen && (
                     <motion.div 
                       initial={{ opacity: 0, y: -10 }}
                       animate={{ opacity: 1, y: 0 }}
                       exit={{ opacity: 0, y: -10 }}
                       className="absolute left-0 mt-2 w-64 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden"
                     >
                       <div className="max-h-60 overflow-y-auto custom-scrollbar flex flex-col">
                         <button
                           onClick={() => {
                             setSelectedStoreFilter("all");
                             setIsStoreFilterOpen(false);
                           }}
                           className={`px-4 py-3 text-left text-sm font-medium transition-colors ${
                             selectedStoreFilter === "all"
                               ? "bg-emerald-500/10 text-emerald-400"
                               : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                           }`}
                         >
                           Todas as Lojas
                         </button>
                         {uniqueStores.map(store => (
                           <button
                             key={store.id}
                             onClick={() => {
                               setSelectedStoreFilter(String(store.id));
                               setIsStoreFilterOpen(false);
                             }}
                             className={`px-4 py-3 text-left text-sm font-medium transition-colors flex items-center justify-between ${
                               String(selectedStoreFilter) === String(store.id)
                                 ? "bg-emerald-500/10 text-emerald-400"
                                 : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                             }`}
                           >
                             {store.name}
                             {String(selectedStoreFilter) === String(store.id) && (
                                <Check size={14} className="text-emerald-500" />
                             )}
                           </button>
                         ))}
                       </div>
                     </motion.div>
                   )}
                 </AnimatePresence>
               </div>
             )}
          </div>
          
          <div className="flex items-center overflow-x-auto no-scrollbar w-full lg:w-auto gap-1">
            {[
              { id: "pendente", label: "Pendente", activeClass: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
              { id: "processando", label: "Preparação", activeClass: "bg-red-500/20 text-red-400 border-red-500/30" },
              { id: "pronto", label: "Pronto", activeClass: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
              { id: "entregue", label: "Entregue", activeClass: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
              { id: "cancelado", label: "Cancelado", activeClass: "bg-red-500/20 text-red-400 border-red-500/30" }
            ].map(f => (
               <button
                 key={f.id}
                 onClick={() => setStatusFilter(statusFilter === f.id ? 'todos' : f.id)}
                 className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all whitespace-nowrap border ${
                    statusFilter === f.id 
                    ? f.activeClass 
                    : "bg-transparent text-zinc-400 border-transparent hover:text-white hover:bg-white/5"
                 }`}
               >
                 {f.label}
               </button>
            ))}
          </div>
        </div>
      </div>

      {/* Orders List / Items Area */}
      <div className="space-y-4">
         {filteredOrders.length === 0 ? (
           <div className="p-12 text-center border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/20">
             <Filter className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
             <h3 className="text-sm font-medium text-zinc-300">Nenhum pedido encontrado.</h3>
             <p className="text-xs text-zinc-500 mt-1">Ajuste os filtros ou a pesquisa para ver outros resultados.</p>
           </div>
         ) : (
           <>
           {filteredOrders.slice(0, displayCount).map(order => {
             let displayedTotal = 0;
             if (order.status === 'processando' && activePreparationId === order.id) {
                let sumSubtotal = 0;
                let sumIva = 0;
                (order.pedido_itens || []).forEach((item: any) => {
                  const confQty = Number(conferidos[item.produto_id]?.quantidade) || 0;
                  const preco = Number(item.preco_unitario || 0);
                  const liq = confQty * preco;
                  const ivaPerc = Number(item.produto?.iva || 0);
                  const ivaVal = liq * (ivaPerc / 100);
                  sumSubtotal += liq;
                  sumIva += ivaVal;
                });
                displayedTotal = sumSubtotal + sumIva;
             } else {
                let sumSubtotal = 0;
                let sumIva = 0;
                (order.pedido_itens || []).forEach((item: any) => {
                  const qty = Number(item.quantidade) || 0;
                  const preco = Number(item.preco_unitario || 0);
                  const liq = qty * preco;
                  const ivaPerc = Number(item.produto?.iva || 0);
                  const ivaVal = liq * (ivaPerc / 100);
                  sumSubtotal += liq;
                  sumIva += ivaVal;
                });
                displayedTotal = sumSubtotal + sumIva;
             }
             
             return (
             <div key={order.id} className="bg-[#0a0a0a] border border-white/5 rounded-lg overflow-hidden transition-all hover:border-white/10 group shadow-sm">
  <div 
    onClick={() => handleExpandOrder(order.id, order.status, order.pedido_itens || [])}
    className="flex items-center justify-between px-3 py-2 cursor-pointer gap-2"
  >
     <div className="flex items-center gap-2 truncate">
       <span className="text-[13px] font-bold text-zinc-100 group-hover:text-emerald-400 transition-colors truncate">{order.loja_nome || order.user?.name || "Loja"}</span>
       <span className="text-[11px] text-zinc-500 whitespace-nowrap">
          {new Date(order.created_at).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' })}
       </span>
     </div>

     <div className="flex items-center gap-3 shrink-0">
        <span className="text-[13px] font-black text-white tabular-nums">€ {displayedTotal.toLocaleString('pt-PT', {minimumFractionDigits: 2})}</span>
        {getStatusBadge(order.status)}
        <ChevronDown className={`w-4 h-4 text-zinc-600 transition-transform duration-200 ${expandedOrderId === order.id ? 'rotate-180 text-zinc-300' : ''}`} />
     </div>
  </div>
  
  {/* Expanded Content */}
                <AnimatePresence>
                   {expandedOrderId === order.id && (
                      <motion.div
                         initial={{ height: 0, opacity: 0 }}
                         animate={{ height: "auto", opacity: 1 }}
                         exit={{ height: 0, opacity: 0 }}
                         transition={{ duration: 0.2 }}
                         className="border-t border-zinc-800 overflow-hidden bg-zinc-900/30"
                      >
                         <div className="p-5 md:p-6 lg:p-8">
                             {order.observacoes && (
                                <div className="mb-6 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                                  <h5 className="text-[10px] font-bold uppercase tracking-wider text-amber-500 mb-1">Notas da Loja</h5>
                                  <p className="text-sm text-amber-100/80">{order.observacoes}</p>
                                </div>
                             )}

                             {/* Workflow Stepper */}
                             <div className="mb-6 p-4 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center justify-between overflow-x-auto no-scrollbar">
                                {['pendente', 'processando', 'pronto', 'entregue'].map((step, idx, arr) => {
                                   const statusIndexMap: Record<string, number> = { 'pendente': 0, 'processando': 1, 'pronto': 2, 'entregue': 3, 'concluido': 3 };
                                   const currentIndex = statusIndexMap[order.status] ?? -1;
                                   const isActive = currentIndex === idx;
                                   const isPast = currentIndex > idx;
                                   
                                   return (
                                      <div key={step} className="flex items-center gap-3 shrink-0">
                                         <div className={`flex flex-col items-center gap-2 ${(isActive || isPast) ? 'opacity-100' : 'opacity-40'}`}>
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${isActive ? 'bg-amber-500 text-zinc-950 shadow-[0_0_15px_rgba(245,158,11,0.4)]' : isPast ? 'bg-emerald-500/20 text-emerald-500' : 'bg-zinc-900 border border-zinc-700 text-zinc-500'}`}>
                                               {isPast ? <Check className="w-4 h-4" /> : idx + 1}
                                            </div>
                                            <span className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? 'text-amber-500' : isPast ? 'text-emerald-500' : 'text-zinc-600'}`}>{step === 'processando' ? 'Picking' : step}</span>
                                         </div>
                                         {idx < arr.length - 1 && (
                                            <div className={`w-8 sm:w-16 h-px mx-2 ${isPast ? 'bg-emerald-500/50' : 'bg-zinc-800'}`} />
                                         )}
                                      </div>
                                   );
                                })}
                             </div>

                             {/* Table */}
                             <div className="border border-zinc-800 rounded-xl overflow-visible bg-zinc-950 mb-6">
                               {activePreparationId === order.id ? (
                                  <table className="w-full text-left border-collapse min-w-[600px]">
  <thead className="bg-zinc-900/40 border-b border-zinc-800">
     <tr>
        <th className="px-3 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider text-center w-24 pl-4">Solicitado</th>
        <th className="px-3 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider border-l border-zinc-800/50 pl-4">Artigo</th>
        <th className="px-3 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider text-center w-56 border-l border-zinc-800/50">Picking Real</th>
        <th className="px-3 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider text-right w-32 border-l border-zinc-800/50 pr-4">Subtotal</th>
     </tr>
  </thead>
  <tbody className="divide-y divide-zinc-800/50">
      {sortItemsByCategoryName(order.pedido_itens || [], (item: any) => item.produto?.categoria?.nome || item.produto?.categoria_nome || "").map((item: any) => {
         const conf = conferidos[item.produto_id] || { quantidade: '', mode: 'unidade', unidade_saida: item.unidade };
         const objProd = products.find(p => p.id === item.produto_id);
         const maxStock = objProd ? Number(objProd.stock_armazem) || 0 : 0;
         const maxFill = Number(item.quantidade);
         
         return (
           <tr key={item.id} className="hover:bg-zinc-800/30 transition-colors">
              <td className="px-3 py-3 text-center pl-4 bg-zinc-900/10">
                 <div className="inline-flex flex-col items-center justify-center">
                    <span className="text-base font-black text-zinc-100 tabular-nums">{item.quantidade}</span>
                 </div>
              </td>
              <td className="px-3 py-3 pl-4 border-l border-zinc-800/50">
                 <p className="text-[12px] font-semibold text-zinc-100 mb-1">{renderProductName(item.produto?.nome)}</p>
                 <div className="flex flex-wrap items-center gap-1.5">
                    {maxStock > 0 ? (
                       <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 shadow-sm">Em Stock: {maxStock} {objProd?.unidade_base}</span>
                    ) : (
                       <span className="text-[9px] font-bold uppercase tracking-wider text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20 shadow-sm">Sem Stock ({maxStock})</span>
                    )}
                    {item.produto?.is_peso_variavel && (
                       <span className="text-[9px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/20 px-1.5 py-0.5 rounded shadow-sm">Balança</span>
                    )}
                 </div>
              </td>
              <td className="px-3 py-3 text-center border-l border-zinc-800/50 bg-zinc-900/25">
                 <div className="flex items-center justify-center gap-2 max-w-[200px] mx-auto">
                    {objProd?.unidade_base === 'kg' && (
                       <div className="relative isolate flex gap-2">
                           <button 
                             onClick={() => setActiveTareDropdown(activeTareDropdown === item.produto_id ? null : item.produto_id)}
                             className={`h-9 items-center justify-center gap-1 px-2 border rounded-xl flex transition-all shadow-inner shrink-0 group ${conf.taraPeso ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40 font-bold' : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700'}`}
                             title="Selecionar Tara"
                           >
                             <PackageMinus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                             {conf.taraPeso ? <span className="text-[10px] tabular-nums">{conf.taraPeso}kg</span> : null}
                           </button>

                           {activeTareDropdown === item.produto_id && (
                             <div className="absolute z-50 top-0 right-full mr-4 w-max bg-zinc-950 border border-zinc-800 rounded-lg shadow-xl overflow-hidden flex flex-col">
                               <button 
                                 onClick={() => handleTareChange(item.produto_id, 0)}
                                 className="px-4 py-2 hover:bg-zinc-800 text-left text-xs font-semibold text-zinc-400 transition-colors border-b border-zinc-800/50"
                               >
                                 Nenhuma
                               </button>
                               {TARE_OPTIONS.map(tara => (
                                 <button 
                                   key={tara.id}
                                   onClick={() => handleTareChange(item.produto_id, tara.weight)}
                                   className="flex items-center justify-between gap-4 px-4 py-2 hover:bg-zinc-800 text-left text-xs font-semibold text-zinc-200 transition-colors border-b last:border-b-0 border-zinc-800/50"
                                 >
                                   <div className="flex items-center gap-2">
                                     <div className={`w-2.5 h-2.5 rounded-full ${tara.color}`}></div>
                                     <span>{tara.name}</span>
                                   </div>
                                   <span className="font-mono text-zinc-500 tabular-nums">{tara.weight}kg</span>
                                 </button>
                               ))}
                             </div>
                           )}
                           <button onClick={() => getWeightFromScale(item.produto_id, Number(item.quantidade), conf.taraPeso || 0)} className="h-9 w-9 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-xl flex items-center justify-center hover:bg-amber-500/20 transition-all shadow-inner shrink-0 group" title="Ler da Balança">
                              <Scale className="w-4 h-4 group-hover:scale-110 transition-transform" />
                           </button>
                       </div>
                    )}
                    <div className="relative flex-1">
                       <input 
                          type="number" min="0" step="0.001"
                          value={conf.quantidade}
                          onChange={e => updateConferido(item.produto_id, 'quantidade', e.target.value)}
                          className="w-full h-9 bg-zinc-950 border border-zinc-700 hover:border-zinc-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 rounded-lg px-2 text-sm font-black text-zinc-100 outline-none transition-all text-center tabular-nums shadow-inner placeholder:text-zinc-700"
                          placeholder="0"
                       />
                    </div>
                    <button onClick={() => updateConferido(item.produto_id, 'quantidade', maxFill)} className="h-9 w-9 bg-zinc-900 text-zinc-400 border border-zinc-800 hover:bg-emerald-500 hover:border-emerald-500 hover:text-emerald-950 rounded-lg transition-all flex items-center justify-center shadow-inner shrink-0 group" title="Atribuir Quantidade Total">
                       <Check className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    </button>
                 </div>
              </td>
              <td className="px-3 py-3 text-right border-l border-zinc-800/50 bg-zinc-900/10 pr-4">
                <div className="flex flex-col items-end">
                   <span className="text-[13px] font-semibold text-emerald-400 tabular-nums">€ {((Number(conf.quantidade) || 0) * Number(item.preco_unitario || 0)).toFixed(2)}</span>
                   <span className="text-[9px] text-zinc-500 mt-0.5 tabular-nums">€ {Number(item.preco_unitario || 0).toFixed(2)} / {objProd?.unidade_base || 'un'}</span>
                </div>
              </td>
           </tr>
         );
      })}
  </tbody>
</table>
                               ) : (
                                  <table className="w-full text-left border-collapse min-w-[500px]">
                                     <thead className="bg-zinc-900/40 border-b border-zinc-800">
                                        <tr>
                                           {!['pronto', 'entregue', 'concluido'].includes(order.status?.toLowerCase()) && (
                                              <th className="px-3 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider text-center w-24 pl-4">Quant.</th>
                                           )}
                                           <th className="px-3 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider border-l border-zinc-800/50 pl-4">Produto</th>
                                           {['pronto', 'entregue', 'concluido'].includes(order.status?.toLowerCase()) && (
                                              <th className="px-3 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider text-center w-32 border-l border-zinc-800/50">Qtd. Real</th>
                                           )}
                                           <th className="px-3 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider text-right border-l border-zinc-800/50">Unitário</th>
                                           <th className="px-3 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider text-right border-l border-zinc-800/50 pr-4">Subtotal</th>
                                        </tr>
                                     </thead>
                                     <tbody className="divide-y divide-zinc-800/50">
                                         {sortItemsByCategoryName(order.pedido_itens || [], (item: any) => item.produto?.categoria?.nome || item.produto?.categoria_nome || "").map((item: any) => {
                                            const isProcessedVal = order.status !== 'pendente' && order.status !== 'processando';
                                            const displayQty = item.quantidade;
                                            const originalQty = item.quantidade_pedida != null ? item.quantidade_pedida : item.quantidade;
                                            
                                            return (
                                            <tr key={item.id} className="hover:bg-zinc-800/30 transition-colors">
                                               {!['pronto', 'entregue', 'concluido'].includes(order.status?.toLowerCase()) && (
                                                  <td className="px-3 py-3 text-center pl-4 bg-zinc-900/10 border-r border-zinc-800/50">
                                                     <div className="inline-flex flex-col items-center justify-center">
                                                        <span className={`text-[15px] font-black tabular-nums ${isProcessedVal && displayQty !== originalQty ? 'text-amber-400' : 'text-zinc-100'}`}>{originalQty}</span>
                                                     </div>
                                                  </td>
                                               )}
                                               <td className="px-4 py-3 pl-4">
                                                  <p className="text-[12px] font-semibold text-zinc-100 mb-1">{renderProductName(item.produto?.nome)}</p>
                                                  {item.produto?.is_peso_variavel && (
                                                     <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/20">Peso Variável</span>
                                                  )}
                                               </td>
                                               {['pronto', 'entregue', 'concluido'].includes(order.status?.toLowerCase()) && (
                                                  <td className="px-3 py-3 text-center border-l border-zinc-800/50 bg-zinc-900/25">
                                                     <div className="inline-flex flex-col items-center justify-center">
                                                        <span className={`text-[15px] font-black tabular-nums ${isProcessedVal && displayQty !== originalQty ? 'text-amber-400' : 'text-emerald-400'}`}>{displayQty}</span>
                                                        <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5">{item.unidade || item.produto?.unidade_medida || 'un'}</span>
                                                     </div>
                                                  </td>
                                               )}
                                               <td className="px-4 py-2 text-right border-l border-zinc-800/50">
                                                  <span className="text-xs font-medium text-zinc-400 tabular-nums">€ {Number(item.preco_unitario).toFixed(2)}</span>
                                               </td>
                                               <td className="px-4 py-2 text-right pr-4 border-l border-zinc-800/50">
                                                  <span className="text-sm font-semibold text-emerald-400 tabular-nums">€ {(displayQty * item.preco_unitario).toFixed(2)}</span>
                                               </td>
                                            </tr>
                                         )})}
                                     </tbody>
                                  </table>
                               )}
                             </div>

                             {['pronto', 'entregue', 'concluido'].includes(order.status?.toLowerCase()) && (
                                <div className="bg-zinc-900/50 p-4 border border-zinc-800 rounded-xl mb-4 ml-auto sm:max-w-xs">
                                   {(() => {
                                       let sumSubtotal = 0;
                                       let sumIva = 0;
                                       (order.pedido_itens || []).forEach((item: any) => {
                                          const qty = Number(item.quantidade) || 0;
                                          const preco = Number(item.preco_unitario || 0);
                                          const liq = qty * preco;
                                          const ivaPerc = Number(item.produto?.iva || 0);
                                          const ivaVal = liq * (ivaPerc / 100);
                                          sumSubtotal += liq;
                                          sumIva += ivaVal;
                                       });
                                       const sumTotalComIva = sumSubtotal + sumIva;
                                       
                                       return (
                                          <div className="flex flex-col gap-2">
                                             <div className="flex justify-between items-center text-sm">
                                                <span className="text-zinc-400">Total S/ IVA (Subtotal):</span>
                                                <span className="text-zinc-200 font-medium">€ {sumSubtotal.toFixed(2)}</span>
                                             </div>
                                             <div className="flex justify-between items-center text-sm">
                                                <span className="text-zinc-400">IVA Aplicado:</span>
                                                <span className="text-zinc-200 font-medium">€ {sumIva.toFixed(2)}</span>
                                             </div>
                                             <div className="flex justify-between items-center text-base font-bold pt-2 border-t border-zinc-800 mt-1">
                                                <span className="text-zinc-100">Total (Com IVA):</span>
                                                <span className="text-emerald-400">€ {sumTotalComIva.toFixed(2)}</span>
                                             </div>
                                          </div>
                                       );
                                   })()}
                                </div>
                             )}

                             {/* Action Footer */}
                             <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 border border-zinc-800 rounded-xl bg-zinc-900/50">
               <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                 {order.status === 'pendente' && (
                   <button onClick={() => updateStatus(order.id, 'processando')} className="flex-1 sm:flex-none px-4 py-2 bg-blue-500 hover:bg-blue-400 text-blue-950 font-bold rounded-xl text-sm transition-all shadow-md">
                       1. Iniciar Preparação
                   </button>
                 )}
                 {order.status === 'processando' && (
                   <button onClick={() => updateStatus(order.id, 'pendente')} className="flex-1 sm:flex-none px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 font-bold rounded-xl text-sm transition-all shadow-md">
                       Reverter p/ Pendente
                   </button>
                 )}
                 {order.status === 'pronto' && (
                   <button onClick={() => updateStatus(order.id, 'entregue')} className="flex-1 sm:flex-none px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2">
                       <CheckCircle2 className="w-4 h-4" /> 3. Marcar Entregue
                   </button>
                 )}
                 { order.status !== 'cancelado' && (
                   <button onClick={() => setEditingOrder(order)} className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 font-bold rounded-xl text-sm transition-all shadow-md">
                      <Edit className="w-4 h-4" /> Editar
                   </button>
                 )}
                 { order.status === 'pendente' && (
                   <button onClick={() => deleteOrder(order.id)} className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 font-bold rounded-xl text-sm transition-all shadow-md">
                      <Trash2 className="w-4 h-4" /> Excluir
                   </button>
                 )}
              </div>
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                 {activePreparationId === order.id ? (
                    <>
                    <button 
                      onClick={() => handleSaveDraft(order)} 
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2 bg-blue-500/20 text-blue-400 font-bold rounded-xl border border-blue-500/30 hover:bg-blue-500/30 text-sm transition-all shadow-md"
                    >
                        <Clock className="w-4 h-4" /> Guardar Progresso
                    </button>
                    <button 
                      onClick={() => handleWmsExit(order)} 
                      disabled={loadingExit}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-black rounded-xl text-sm transition-all shadow-md disabled:opacity-50"
                    >
                        <Send className="w-4 h-4" /> 2. Finalizar Picking
                    </button>
                    <button onClick={() => handlePrintOrder(order)} className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 font-medium rounded-xl border border-zinc-700/50 text-sm transition-all">
                        <Printer className="w-4 h-4" /> PDF
                    </button>
                    </>
                 ) : (
                    <>
                       {['pronto', 'entregue', 'concluido'].includes(order.status?.toLowerCase()) && (
                           <button onClick={() => generateTransportGuide(order.id)} className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 font-medium rounded-xl border border-zinc-700/50 text-sm transition-all">
                               <Truck className="w-4 h-4" /> Guia
                           </button>
                       )}
                       <button onClick={() => handlePrintOrder(order)} className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 font-medium rounded-xl border border-zinc-700/50 text-sm transition-all">
                           <Printer className="w-4 h-4" /> PDF
                       </button>
                       <button onClick={() => handleExportExcel(order)} className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 font-medium rounded-xl border border-zinc-700/50 text-sm transition-all">
                           <FileText className="w-4 h-4" /> CSV
                       </button>
                    </>
                 )}
              </div>
                             </div>
                         </div>
                      </motion.div>
                   )}
                </AnimatePresence>
             </div>
           );
         })}
         
         {filteredOrders.length > displayCount && (
            <div ref={loadMoreRef} className="w-full flex justify-center py-6">
              <span className="px-6 py-3 text-zinc-500 font-medium tracking-tight text-sm">
                Carregando mais itens...
              </span>
            </div>
         )}
         </>
         )}
      </div>

      {/* Edit Order Modal */}
      <AnimatePresence>
        {editingOrder && (
          <motion.div 
            key="edit-order-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 pb-20 sm:pb-6"
          >
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setEditingOrder(null)}
              className="absolute inset-0 bg-zinc-950/80 "
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-4xl bg-zinc-950 border border-zinc-800/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="px-6 py-5 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-start justify-between shrink-0 bg-zinc-900/40 gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-xl font-semibold text-zinc-100 tracking-tight">
                      Edição de Encomenda
                    </h2>
                    <span className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 rounded-md">
                      {editingOrder.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-zinc-500 mt-2">
                    <div className="flex items-center gap-1.5">
                      <Package className="w-4 h-4" />
                      {editingOrder.loja_nome || editingOrder.user?.name}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      {new Date(editingOrder.created_at).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' })}
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col sm:items-end w-full sm:w-auto gap-3">
                  <div className="bg-zinc-900/80 border border-zinc-800/50 rounded-xl px-4 py-2 text-right">
                     <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider mb-0.5">Total Estimado</p>
                     <p className="text-xl font-bold text-emerald-400">€ {Number(editingOrder.total || 0).toFixed(2)}</p>
                  </div>
                  <button
                    onClick={() => setEditingOrder(null)}
                    className="p-2 absolute top-4 right-4 text-zinc-500 hover:text-white hover:bg-zinc-800/50 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto no-scrollbar space-y-8 bg-zinc-950">
                 
                 {/* Existing Items */}
                 <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-medium text-zinc-100">Produtos na Encomenda</h3>
                      <span className="text-xs text-zinc-500 font-medium">{editingOrder.pedido_itens?.length || 0} Itens</span>
                    </div>
                    <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl overflow-x-auto shadow-inner">
                       <table className="w-full text-left border-collapse">
                          <thead>
                             <tr className="bg-zinc-900/60 border-b border-zinc-800/80">
                                <th className="px-5 py-3 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Produto</th>
                                <th className="px-5 py-3 text-[11px] font-bold text-zinc-500 uppercase tracking-wider text-center w-32">Quantidade</th>
                                <th className="px-5 py-3 text-[11px] font-bold text-zinc-500 uppercase tracking-wider text-center w-32">Preço Unit. (€)</th>
                                <th className="px-5 py-3 text-[11px] font-bold text-zinc-500 uppercase tracking-wider text-right w-24">Ação</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-800/40">
                             {sortItemsByCategoryName(editingOrder.pedido_itens || [], (item: any) => item.produto?.categoria?.nome || item.produto?.categoria_nome || "").map((item: any) => (
                                <tr key={item.id} className="hover:bg-zinc-800/20 transition-colors group">
                                   <td className="px-5 py-4">
                                      <p className="text-[13px] font-medium text-zinc-200 group-hover:text-emerald-400 transition-colors">{renderProductName(item.produto?.nome)}</p>
                                      <span className="inline-block mt-1.5 px-2 py-0.5 text-[10px] font-medium text-zinc-400 bg-zinc-800/50 rounded">
                                        Und: {item.unidade || item.produto?.unidade_medida || 'un'}
                                      </span>
                                   </td>
                                   <td className="px-5 py-4 text-center">
                                      <input 
                                         type="number" min="0" step="0.001"
                                         defaultValue={item.quantidade}
                                         onBlur={(e) => handleUpdateOrderItem(editingOrder.id, item.id, parseFloat(e.target.value), item.preco_unitario)}
                                         className="w-full h-10 bg-zinc-900 border border-zinc-800 rounded-lg px-3 text-sm font-semibold text-center text-zinc-100 focus:border-emerald-500/50 focus:bg-zinc-950 outline-none transition-all"
                                      />
                                   </td>
                                   <td className="px-5 py-4 text-center">
                                      <input 
                                         type="number" min="0" step="0.01"
                                         defaultValue={item.preco_unitario}
                                         onBlur={(e) => handleUpdateOrderItem(editingOrder.id, item.id, item.quantidade, parseFloat(e.target.value))}
                                         className="w-full h-10 bg-zinc-900 border border-zinc-800 rounded-lg px-3 text-sm font-semibold text-center text-zinc-100 focus:border-emerald-500/50 focus:bg-zinc-950 outline-none transition-all"
                                      />
                                   </td>
                                   <td className="px-5 py-4 text-right">
                                      <button 
                                         onClick={() => handleUpdateOrderItem(editingOrder.id, item.id, 0)}
                                         className="w-10 h-10 rounded-lg bg-rose-500/5 text-rose-500/70 hover:bg-rose-500/10 hover:text-rose-500 flex items-center justify-center transition-all ml-auto"
                                         title="Remover Item"
                                      >
                                         <Trash2 className="w-4 h-4" />
                                      </button>
                                   </td>
                                </tr>
                             ))}
                             {(!editingOrder.pedido_itens || editingOrder.pedido_itens.length === 0) && (
                                <tr>
                                   <td colSpan={4} className="px-6 py-12 text-center">
                                       <Package className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                                       <p className="text-sm font-medium text-zinc-400">Nenhum produto listado</p>
                                       <p className="text-xs text-zinc-600 mt-1">A encomenda será cancelada se permanecer vazia.</p>
                                   </td>
                                </tr>
                             )}
                          </tbody>
                       </table>
                    </div>
                 </div>



              </div>
              
              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/40 shrink-0 flex flex-col md:flex-row items-center justify-between gap-4 overflow-visible">
                 
                 {/* Compact Add Product Component */}
                 <div className="flex items-center gap-2 w-full md:w-auto flex-1 h-10">
                    <div className="relative flex-1 max-w-[280px] h-full">
                        <input 
                           type="text"
                           placeholder="Procurar Produto..."
                           value={addProdSearch}
                           onFocus={() => setIsAddProdSearchOpen(true)}
                           onBlur={() => setTimeout(() => setIsAddProdSearchOpen(false), 200)}
                           onChange={(e) => {
                              setAddProdSearch(e.target.value);
                              setIsAddProdSearchOpen(true);
                              setNewItemProductId("");
                           }}
                           className="w-full h-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-100 focus:border-emerald-500/80 outline-none transition-colors pr-8 shadow-sm"
                        />
                        <Search className="w-4 h-4 text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        {isAddProdSearchOpen && (
                          <div className="absolute z-50 left-0 right-0 bottom-full mb-2 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl max-h-60 overflow-y-auto custom-scrollbar">
                             {products.filter(p => !addProdSearch || p.nome.toLowerCase().includes(addProdSearch.toLowerCase())).map(p => (
                                <div
                                  key={p.id}
                                  onMouseDown={(e) => {
                                     e.preventDefault();
                                     setNewItemProductId(p.id);
                                     setAddProdSearch(p.nome);
                                     setIsAddProdSearchOpen(false);
                                  }}
                                  className="px-4 py-3 flex justify-between items-center text-sm text-zinc-300 hover:bg-emerald-500/20 hover:text-emerald-400 cursor-pointer border-b border-zinc-800/50 last:border-0"
                                >
                                  <span className="font-medium">{p.nome}</span>
                                  <span className="text-zinc-500 text-xs px-2 py-1 bg-zinc-950 rounded">€{Number(p.preco).toFixed(2)}</span>
                                </div>
                             ))}
                             {products.filter(p => !addProdSearch || p.nome.toLowerCase().includes(addProdSearch.toLowerCase())).length === 0 && (
                                <div className="px-4 py-4 text-sm text-zinc-500 text-center">Nenhum produto correspondente encontrado.</div>
                              )}
                          </div>
                        )}
                    </div>
                    <div className="w-20 h-full">
                        <input 
                          type="number" min="0.001" step="0.001"
                          placeholder="Qtd"
                          value={newItemQuantity}
                          onChange={(e) => setNewItemQuantity(Number(e.target.value))}
                          className="w-full h-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 text-sm font-semibold text-center text-zinc-100 focus:border-emerald-500/80 outline-none shadow-sm"
                        />
                    </div>
                    <button 
                      onClick={() => handleAddOrderItem(editingOrder.id)}
                      disabled={!newItemProductId || newItemQuantity <= 0}
                      className="px-4 h-full bg-zinc-100 hover:bg-white disabled:opacity-50 disabled:hover:bg-zinc-100 text-zinc-950 font-bold tracking-tight rounded-lg text-sm transition-all shadow-sm whitespace-nowrap"
                    >
                      Inserir
                    </button>
                 </div>
                 
                 <div className="w-full md:w-auto flex justify-end shrink-0">
                   <button 
                      type="button" 
                      onClick={() => setEditingOrder(null)} 
                      className="px-8 h-10 text-sm font-semibold text-emerald-950 bg-emerald-500 hover:bg-emerald-400 rounded-lg shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center whitespace-nowrap"
                   >
                     Salvar Alterações
                   </button>
                 </div>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Select Store Modal for New Order */}
      <AnimatePresence>
        {isSelectStoreModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 "
          >
            <motion.div 
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6"
            >
              <h3 className="text-lg font-bold text-white mb-4">Novo Pedido</h3>
              <p className="text-sm text-zinc-400 mb-4">Selecione a loja para a qual deseja iniciar um novo pedido.</p>
              
              <div className="mb-6">
                <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Loja</label>
                <div className="relative">
                  <select
                    value={selectedStoreIdForNewOrder}
                    onChange={(e) => setSelectedStoreIdForNewOrder(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm font-semibold text-zinc-100 focus:border-emerald-500/50 outline-none appearance-none"
                  >
                    <option value="">Selecione uma loja...</option>
                    {stores.map(store => (
                      <option key={store.id} value={store.id}>{store.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                </div>
              </div>
              
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setIsSelectStoreModalOpen(false)}
                  disabled={isCreatingOrder}
                  className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateNewOrderForStore}
                  disabled={!selectedStoreIdForNewOrder || isCreatingOrder}
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-emerald-950 font-bold rounded-xl text-sm transition-all shadow-sm"
                >
                  {isCreatingOrder ? "A criar..." : "Criar Rascunho"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


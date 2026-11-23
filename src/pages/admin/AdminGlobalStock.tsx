import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  Search, Plus, AlertCircle, RefreshCcw, Package,
  Wallet, Layers, Download, History, ArchiveRestore, TrendingUp, TrendingDown,
  AlertTriangle, Filter, RotateCcw, ChevronDown, X, Check
} from "lucide-react";
import api from "../../lib/api";
import { supabase } from "../../lib/supabase";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { motion, AnimatePresence } from "motion/react";
import { BrandTitle } from "../../components/BrandTitle";
import Swal from "sweetalert2";

import AdminStockCounts from "./AdminStockCounts";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import { useAuth } from "../../context/AuthContext";
import { ProductDescriptionModal } from "../../components/ProductDescriptionModal";
import { sortCategories } from "../../lib/categoryUtils";

interface MoveFilterState {
  startDate: string;
  endDate: string;
  storeId: string;
  produtoId: string;
  productQuery: string;
}

const DEFAULT_MOVE_FILTER: MoveFilterState = {
  startDate: "",
  endDate: "",
  storeId: "all",
  produtoId: "all",
  productQuery: "",
};

function toLocalDayIsoRange(startDateStr: string, endDateStr: string): { startIso?: string; endIso?: string } {
  let s = startDateStr.trim();
  let e = endDateStr.trim();
  if (s && e && s > e) {
    const tmp = s;
    s = e;
    e = tmp;
  }
  let startIso: string | undefined;
  let endIso: string | undefined;
  if (s) {
    const [y, m, d] = s.split("-").map(Number);
    if (y && m && d) {
      startIso = new Date(y, m - 1, d, 0, 0, 0, 0).toISOString();
    }
  }
  if (e) {
    const [y, m, d] = e.split("-").map(Number);
    if (y && m && d) {
      endIso = new Date(y, m - 1, d, 23, 59, 59, 999).toISOString();
    }
  }
  return { startIso, endIso };
}

function cleanMovementMotivo(raw?: string | null): string {
  if (!raw) return "";
  return String(raw)
    .replace(/\s*\[ref:[^\]]+\]/gi, "")
    .replace(/\s*\[bal:[^\]]+\]/gi, "")
    .trim();
}

function roundStockVal(val: any): number {
  const num = Number(val);
  if (!Number.isFinite(num)) return 0;
  return Math.round(num * 1000) / 1000;
}

function formatStockQty(val: any): string {
  return roundStockVal(val).toLocaleString("pt-PT", {
    maximumFractionDigits: 3,
  });
}

function getMovementBalanceInfo(m: any) {
  const isSaida = m?.tipo === "saida";
  const movQty = roundStockVal(Math.abs(Number(m?.quantidade || 0)));
  const unit = String(m?.unidade || m?.produto?.unidade_base || m?.produto?.unidade_medida || "un");

  let tinha: number | null =
    m?.stock_antes !== undefined && m?.stock_antes !== null && Number.isFinite(Number(m.stock_antes))
      ? roundStockVal(m.stock_antes)
      : null;
  let ficou: number | null =
    m?.stock_depois !== undefined && m?.stock_depois !== null && Number.isFinite(Number(m.stock_depois))
      ? roundStockVal(m.stock_depois)
      : null;

  if (tinha === null || ficou === null) {
    const match = String(m?.motivo || "").match(/\[bal:(-?\d+(?:\.\d+)?)->(-?\d+(?:\.\d+)?)\]/i);
    if (match) {
      tinha = roundStockVal(Number(match[1]));
      ficou = roundStockVal(Number(match[2]));
    }
  }

  return {
    hasBalance: tinha !== null && ficou !== null,
    tinha: tinha ?? 0,
    movQty,
    ficou: ficou ?? 0,
    unit,
    isSaida,
  };
}

function StockBalanceEquation({ movement }: { movement: any }) {
  const { hasBalance, tinha, movQty, ficou, unit, isSaida } = getMovementBalanceInfo(movement);

  if (!hasBalance) {
    return (
      <div className="text-right font-mono tabular-nums">
        <span className={cn("text-sm font-black", isSaida ? "text-rose-400" : "text-emerald-400")}>
          {isSaida ? "−" : "+"}
          {formatStockQty(movQty)}
        </span>
        <span className="text-[10px] text-zinc-500 uppercase ml-1">{unit}</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-end gap-1.5 sm:gap-2.5 bg-zinc-950/70 border border-zinc-800/80 rounded-xl px-3 py-1.5">
      {/* TINHA */}
      <div className="flex flex-col items-end min-w-[46px]">
        <span className="text-[9px] font-black uppercase tracking-wider text-yellow-400 leading-none mb-1">
          Tinha
        </span>
        <span className="text-sm font-black font-mono tabular-nums text-yellow-300 leading-none">
          {formatStockQty(tinha)}
        </span>
      </div>

      {/* SINAL (- ou +) */}
      <span
        className={cn(
          "text-base font-black font-mono leading-none pb-0.5 select-none",
          isSaida ? "text-rose-400" : "text-emerald-400"
        )}
      >
        {isSaida ? "−" : "+"}
      </span>

      {/* SAIU ou ENTROU */}
      <div className="flex flex-col items-end min-w-[46px]">
        <span
          className={cn(
            "text-[9px] font-black uppercase tracking-wider leading-none mb-1",
            isSaida ? "text-rose-400" : "text-emerald-400"
          )}
        >
          {isSaida ? "Saiu" : "Entrou"}
        </span>
        <span
          className={cn(
            "text-sm font-black font-mono tabular-nums leading-none",
            isSaida ? "text-rose-400" : "text-emerald-400"
          )}
        >
          {formatStockQty(movQty)}
        </span>
      </div>

      {/* IGUAL (=) */}
      <span className="text-base font-black font-mono text-zinc-400 leading-none pb-0.5 select-none">
        =
      </span>

      {/* FICOU */}
      <div className="flex flex-col items-end min-w-[62px] pl-2 border-l border-zinc-800">
        <span className="text-[9px] font-black uppercase tracking-wider leading-none mb-1 text-emerald-400">
          Ficou
        </span>
        <span className="text-sm font-black font-mono tabular-nums leading-none text-emerald-300">
          {formatStockQty(ficou)}
          <span className="text-[10px] font-bold uppercase text-zinc-400 ml-1">{unit}</span>
        </span>
      </div>
    </div>
  );
}

export default function AdminGlobalStock() {
  const { user } = useAuth();
  const isArmazem = user?.role === "armazem";
  const [activeTab, setActiveTab] = useState<"dashboard" | "movimentos" | "contagem">("dashboard");
  
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState("todos");
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [movements, setMovements] = useState<any[]>([]);
  const [overviewMovements, setOverviewMovements] = useState<any[]>([]);
  const [hasSearchedMovements, setHasSearchedMovements] = useState(false);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [draftMoveFilter, setDraftMoveFilter] = useState<MoveFilterState>(DEFAULT_MOVE_FILTER);
  const [appliedMoveFilter, setAppliedMoveFilter] = useState<MoveFilterState>(DEFAULT_MOVE_FILTER);
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const productDropdownRef = useRef<HTMLDivElement | null>(null);

  const [stores, setStores] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const deferredSearchTerm = React.useDeferredValue(searchTerm);
  const [loading, setLoading] = useState(true);

  const [displayCountProducts, setDisplayCountProducts] = useState<number>(30);
  const [displayCountMovements, setDisplayCountMovements] = useState<number>(30);
  
  const observerProductsRef = useRef<IntersectionObserver | null>(null);
  const loadMoreProductsRef = React.useCallback((node: HTMLDivElement | null) => {
    if (observerProductsRef.current) observerProductsRef.current.disconnect();
    if (node) {
      observerProductsRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          setDisplayCountProducts(c => c + 30);
        }
      }, { threshold: 0.1 });
      observerProductsRef.current.observe(node);
    }
  }, []);

  const observerMovementsRef = useRef<IntersectionObserver | null>(null);
  const loadMoreMovementsRef = React.useCallback((node: HTMLDivElement | null) => {
    if (observerMovementsRef.current) observerMovementsRef.current.disconnect();
    if (node) {
      observerMovementsRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          setDisplayCountMovements(c => c + 30);
        }
      }, { threshold: 0.1 });
      observerMovementsRef.current.observe(node);
    }
  }, []);

  const [expandedMoveGroups, setExpandedMoveGroups] = useState<Record<string, boolean>>({});

  const toggleMoveGroup = (groupId: string) => {
    setExpandedMoveGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        productDropdownRef.current &&
        !productDropdownRef.current.contains(event.target as Node)
      ) {
        setIsProductDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredProductOptions = useMemo(() => {
    const q = draftMoveFilter.productQuery.trim().toLowerCase();
    if (!q || draftMoveFilter.produtoId !== "all") {
      return products.slice(0, 80);
    }
    return products
      .filter(
        (p) =>
          String(p.nome || "").toLowerCase().includes(q) ||
          String(p.barcode_ean || p.codigo_barras || "").toLowerCase().includes(q)
      )
      .slice(0, 80);
  }, [products, draftMoveFilter.productQuery, draftMoveFilter.produtoId]);

  const buildMovementGroups = React.useCallback((list: any[]) => {
    const groups: Record<string, any> = {};

    list.forEach((m) => {
      const date = new Date(m.created_at).toDateString();
      let groupKey = "";
      let displayTitle = "";
      let isGroup = true;

      const cleanMotivo = cleanMovementMotivo(m.motivo);
      const prodName = m.produto?.nome || m.produto_nome || "";

      if (m.tipo === "entrada") {
        const faturaMatch = cleanMotivo.match(/Fatura\s*#?\s*([^\s,)]+)/i);
        const refMatch = m.motivo?.match(/\[ref:([^\]]+)\]/i);
        if (faturaMatch) {
          const faturaNum = faturaMatch[1];
          groupKey = refMatch ? `entrada_fatura_ref_${refMatch[1]}` : `entrada_fatura_${faturaNum}_${date}`;
          displayTitle = `Entrada Fatura #${faturaNum}`;
        } else {
          groupKey = `entrada_outros_${m.id}`;
          displayTitle = prodName
            ? `${prodName}${cleanMotivo ? ` — ${cleanMotivo}` : ""}`
            : cleanMotivo || "Entrada de Stock";
          isGroup = false;
        }
      } else {
        if (m.user_target_id) {
          const storeName = stores.find((s) => String(s.id) === String(m.user_target_id))?.name || "Loja";
          groupKey = `saida_loja_${m.user_target_id}_${date}`;
          displayTitle = `Saída para ${storeName}`;
        } else {
          groupKey = `saida_outros_${m.id}`;
          displayTitle = prodName
            ? `${prodName}${cleanMotivo ? ` — ${cleanMotivo}` : ""}`
            : cleanMotivo || "Saída de Stock";
          isGroup = false;
        }
      }

      if (!groups[groupKey]) {
        groups[groupKey] = {
          id: groupKey,
          isGroup,
          title: displayTitle,
          tipo: m.tipo,
          created_at: m.created_at,
          user_target_id: m.user_target_id,
          items: [],
          totalItems: 0,
        };
      }
      groups[groupKey].items.push(m);
      groups[groupKey].totalItems += 1;
    });

    return Object.values(groups).sort(
      (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [stores]);

  const groupedMovements = useMemo(
    () => buildMovementGroups(movements),
    [movements, buildMovementGroups]
  );

  const handleSearchMovements = async () => {
    const nextFilter = { ...draftMoveFilter };
    setIsProductDropdownOpen(false);
    setAppliedMoveFilter(nextFilter);
    setHasSearchedMovements(true);
    setDisplayCountMovements(30);

    try {
      setLoadingMovements(true);
      const { startIso, endIso } = toLocalDayIsoRange(nextFilter.startDate, nextFilter.endDate);
      const params: Record<string, string> = {
        _t: String(Date.now()),
      };
      if (startIso) params.startDate = startIso;
      if (endIso) params.endDate = endIso;
      if (nextFilter.storeId && nextFilter.storeId !== "all") {
        params.lojaId = nextFilter.storeId;
      }
      if (nextFilter.produtoId && nextFilter.produtoId !== "all") {
        params.produtoId = nextFilter.produtoId;
      } else if (nextFilter.productQuery.trim()) {
        params.search = nextFilter.productQuery.trim();
      }

      const res = await api.get("/admin/stock/movimentacoes", { params });
      const fetched = Array.isArray(res.data) ? res.data : [];
      setMovements(fetched);

      const isProductFiltered =
        nextFilter.produtoId !== "all" || Boolean(nextFilter.productQuery.trim());
      if (isProductFiltered && fetched.length > 0) {
        const builtGroups = buildMovementGroups(fetched);
        const initialExpanded: Record<string, boolean> = {};
        builtGroups.slice(0, 30).forEach((g: any) => {
          if (g.totalItems > 1) {
            initialExpanded[g.id] = true;
          }
        });
        setExpandedMoveGroups(initialExpanded);
      } else {
        setExpandedMoveGroups({});
      }
    } catch (error) {
      console.error("Erro ao pesquisar movimentações:", error);
      Swal.fire({
        icon: "error",
        title: "Erro",
        text: "Não foi possível carregar os movimentos de stock.",
        background: "#18181b",
        color: "#fff",
      });
    } finally {
      setLoadingMovements(false);
    }
  };

  const handleClearMovements = () => {
    setDraftMoveFilter(DEFAULT_MOVE_FILTER);
    setAppliedMoveFilter(DEFAULT_MOVE_FILTER);
    setMovements([]);
    setExpandedMoveGroups({});
    setHasSearchedMovements(false);
    setIsProductDropdownOpen(false);
    setDisplayCountMovements(30);
  };

  const fetchData = async () => {
    try {
      const [prodRes, usersRes, catRes] = await Promise.all([
        api.get("/produtos"),
        api.get("/admin/users"),
        api.get("/categorias")
      ]);
      setProducts(Array.isArray(prodRes.data) ? prodRes.data.sort((a: any, b: any) => (a.nome || "").localeCompare(b.nome || "", "pt-PT")) : []);
      setStores(
        Array.isArray(usersRes.data)
          ? usersRes.data
              .filter((u: any) => u.role === "loja")
              .sort((a: any, b: any) => String(a.name || "").localeCompare(String(b.name || ""), "pt-PT"))
          : []
      );
      setCategories(Array.isArray(catRes.data) ? sortCategories(catRes.data) : []);
    } catch (error) {
      console.error("Erro ao carregar dados de stock global:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel("global-stock-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "produtos" }, fetchData)
      .on("postgres_changes", { event: "*", schema: "public", table: "stock_loja" }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (
      (activeFilter === "mais_movimentados" || activeFilter === "menos_movimentados") &&
      overviewMovements.length === 0
    ) {
      api
        .get("/admin/stock/movimentacoes")
        .then((res) => {
          if (Array.isArray(res.data)) setOverviewMovements(res.data);
        })
        .catch((err) => console.error("Erro ao carregar resumo de movimentações:", err));
    }
  }, [activeFilter, overviewMovements.length]);

  const exportToCSV = () => {
    let csvContent = "\uFEFFData;Produto;Tipo;Tinha (Antes);Movimento;Ficou (Depois);Unidade;Destino/Motivo\n";
    movements.forEach((m) => {
      const data = new Date(m.created_at).toLocaleString("pt-PT");
      const produto = (m.produto?.nome || m.produto_nome || "").replace(/;/g, ",");
      const { hasBalance, tinha, movQty, ficou, unit, isSaida } = getMovementBalanceInfo(m);
      const tipo = isSaida ? "SAÍDA" : "ENTRADA";
      const tinhaStr = hasBalance ? formatStockQty(tinha) : "-";
      const movStr = `${isSaida ? "-" : "+"}${formatStockQty(movQty)}`;
      const ficouStr = hasBalance ? formatStockQty(ficou) : "-";
      const cleanExportMotivo = cleanMovementMotivo(m.motivo);
      const destino = m.user_target_id
        ? `LOJA: ${stores.find((s) => s.id === m.user_target_id)?.name || m.user_target_id}`
        : cleanExportMotivo;

      csvContent += `${data};${produto};${tipo};${tinhaStr};${movStr};${ficouStr};${unit};${destino}\n`;
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `movimentos_stock_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  const handleQuickEditStock = async (produto: any) => {
    if (user?.role !== "admin") return;
    const { value: newStock } = await Swal.fire({
      title: "Stock Armazém",
      input: "number",
      inputLabel: `Alterar stock de ${produto.nome}`,
      inputValue: produto.stock_armazem || 0,
      showCancelButton: true,
      cancelButtonText: "Cancelar",
      confirmButtonText: "Salvar",
      confirmButtonColor: "#10b981",
      inputAttributes: {
        step: "0.001",
      }
    });

    if (newStock !== undefined && newStock !== false) {
       try {
         await api.put(`/produtos/${produto.id}/stock-armazem`, { stock_armazem: Number(newStock) });
         setProducts(prev => prev.map(p => p.id === produto.id ? { ...p, stock_armazem: Number(newStock) } : p));
         Swal.fire({ title: "Sucesso", icon: "success", toast: true, position: "top-end", timer: 2000, showConfirmButton: false });
       } catch (error) {
         console.error("Erro ao alterar stock:", error);
         Swal.fire("Erro", "Falha ao alterar o stock do produto.", "error");
       }
    }
  };

  const filteredProdutos = useMemo(() => {
    let result = products.filter(p => 
      (!selectedCategory || (selectedCategory === "null" ? !p.categoria_id : p.categoria_id?.toString() === selectedCategory)) &&
      (p.nome.toLowerCase().includes(deferredSearchTerm.toLowerCase()) || 
      (p.codigo_barras && p.codigo_barras.toLowerCase().includes(deferredSearchTerm.toLowerCase())))
    );

    switch(activeFilter) {
      case "stock_critico": return result.filter(p => Number(p.stock_armazem) > 0 && Number(p.stock_armazem) < 10);
      case "excesso_stock": return result.filter(p => Number(p.stock_armazem) > 100);
      case "sem_stock": return result.filter(p => Number(p.stock_armazem) <= 0);
      case "com_margem": return result.filter(p => Number(p.preco) > Number(p.preco_custo));
      case "sem_margem": return result.filter(p => Number(p.preco) <= Number(p.preco_custo));
      case "com_stock": return result.filter(p => Number(p.stock_armazem) > 0);
      case "maior_custo": return result.sort((a,b) => ((Number(b.stock_armazem) || 0) * (Number(b.preco_custo) || 0)) - ((Number(a.stock_armazem) || 0) * (Number(a.preco_custo) || 0)));
      case "maior_pvp": return result.sort((a,b) => ((Number(b.stock_armazem) || 0) * (Number(b.preco) || 0)) - ((Number(a.stock_armazem) || 0) * (Number(a.preco) || 0)));
      case "mais_movimentados": {
         const movMap = new Map();
         overviewMovements.forEach(m => {
            if (m.produto_id) movMap.set(m.produto_id, (movMap.get(m.produto_id) || 0) + Number(m.quantidade || 0));
         });
         return result.sort((a,b) => (movMap.get(b.id) || 0) - (movMap.get(a.id) || 0));
      }
      case "menos_movimentados": {
         const movMap = new Map();
         overviewMovements.forEach(m => {
            if (m.produto_id) movMap.set(m.produto_id, (movMap.get(m.produto_id) || 0) + Number(m.quantidade || 0));
         });
         return result.sort((a,b) => (movMap.get(a.id) || 0) - (movMap.get(b.id) || 0));
      }
      default: return result;
    }
  }, [products, deferredSearchTerm, selectedCategory, activeFilter, overviewMovements]);

  // Estatísticas
  const valorTotalCusto = products.reduce((acc, p) => acc + ((Number(p.stock_armazem) || 0) * (Number(p.preco_custo) || 0)), 0);
  const valorTotalPVP = products.reduce((acc, p) => acc + ((Number(p.stock_armazem) || 0) * (Number(p.preco) || 0)), 0);
  const totalPecas = products.reduce((acc, p) => acc + (Number(p.stock_armazem) || 0), 0);
  const semMargem = products.filter(p => Number(p.stock_armazem) > 0 && Number(p.preco) <= Number(p.preco_custo)).length;

  return (
    <div className="w-full min-h-full flex flex-col pt-2 px-4 sm:px-6 lg:px-8 pb-12 bg-zinc-950">
      
      {/* Header Melhorado */}
      <div className="sticky top-0 z-40 bg-zinc-950 pt-2 md:pt-4 pb-4 -mt-2 md:-mt-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <BrandTitle title="Armazém" titleClassName="max-md:mt-0 md:-mt-4 max-md:pl-0 max-md:pt-0 max-md:ml-0" hideUnderline />
        
        <div className="flex bg-zinc-900/50 p-1 rounded-lg border border-zinc-800/80 w-full sm:w-auto overflow-x-auto no-scrollbar">
           <button 
              onClick={() => setActiveTab("dashboard")}
              className={`flex-1 sm:flex-none px-4 py-1.5 text-[10px] flex items-center justify-center font-black uppercase tracking-wider rounded-md transition-all whitespace-nowrap ${
                 activeTab === 'dashboard' ? 'bg-blue-500 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
              }`}
           >
              Visão Geral
           </button>
           <button 
              onClick={() => setActiveTab("movimentos")}
              className={`flex-1 sm:flex-none px-4 py-1.5 text-[10px] flex items-center justify-center font-black uppercase tracking-wider rounded-md transition-all whitespace-nowrap ${
                 activeTab === 'movimentos' ? 'bg-blue-500 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
              }`}
           >
              Movimentos
           </button>
           <button 
              onClick={() => setActiveTab("contagem")}
              className={`flex-1 sm:flex-none px-4 py-1.5 text-[10px] flex items-center justify-center font-black uppercase tracking-wider rounded-md transition-all whitespace-nowrap ${
                 activeTab === 'contagem' ? 'bg-blue-500 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
              }`}
           >
              Faltas
           </button>
        </div>
      </div>

      {/* Conteúdo com scroll */}
      <div className="flex-1">
         
         {activeTab === "dashboard" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                
                {/* Bento Grid Stats */}
                {!isArmazem && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Card 1 */}
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
                       <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors" />
                       <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1 flex items-center justify-between">
                          Valor em Armazém (Custo)
                          <Wallet size={14} className="text-emerald-500" />
                       </p>
                       <p className="text-2xl font-black text-white mt-2 tracking-tight">€{valorTotalCusto.toLocaleString('pt-PT', {minimumFractionDigits: 2})}</p>
                       <div className="mt-2 text-xs font-medium text-emerald-500 flex items-center gap-1">
                          <TrendingUp size={12} /> Custo total imobilizado
                       </div>
                    </div>

                    {/* Card 2 */}
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
                       <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-colors" />
                       <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1 flex items-center justify-between">
                          Capital Previsional (PVP)
                          <TrendingUp size={14} className="text-blue-500" />
                       </p>
                       <p className="text-2xl font-black text-white mt-2 tracking-tight">€{valorTotalPVP.toLocaleString('pt-PT', {minimumFractionDigits: 2})}</p>
                       <div className="mt-2 text-xs font-medium text-blue-500 flex items-center gap-1">
                          Margem: €{(valorTotalPVP - valorTotalCusto).toLocaleString('pt-PT', {minimumFractionDigits: 2})}
                       </div>
                    </div>

                    {/* Card 3 */}
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
                       <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-colors" />
                       <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1 flex items-center justify-between">
                          Volume Físico
                          <Package size={14} className="text-indigo-500" />
                       </p>
                       <p className="text-2xl font-black text-white mt-2 tracking-tight">{totalPecas.toLocaleString('pt-PT')} <span className="text-sm text-zinc-500 font-medium">unidades</span></p>
                       <div className="mt-2 text-xs font-medium text-zinc-400">
                          Total de itens físicos guardados
                       </div>
                    </div>

                    {/* Card 4 */}
                    <div className={cn("border rounded-2xl p-5 shadow-sm relative overflow-hidden group transition-colors", semMargem > 0 ? "bg-orange-500/5 border-orange-500/20" : "bg-zinc-900 border-zinc-800")}>
                       {semMargem > 0 && <div className="absolute -right-4 -top-4 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl" />}
                       <p className={cn("text-[10px] font-black uppercase tracking-widest mb-1 flex items-center justify-between", semMargem > 0 ? "text-orange-500/80" : "text-zinc-500")}>
                          Avisos de Rentabilidade
                          <AlertTriangle size={14} className={semMargem > 0 ? "text-orange-500" : "text-zinc-600"} />
                       </p>
                       <p className={cn("text-2xl font-black mt-2 tracking-tight", semMargem > 0 ? "text-orange-500" : "text-white")}>
                          {semMargem} <span className="text-sm font-medium opacity-70">referências</span>
                       </p>
                       <div className={cn("mt-2 text-xs font-medium", semMargem > 0 ? "text-orange-500/80" : "text-zinc-500")}>
                          {semMargem > 0 ? "PVP <= Preço de Custo" : "Todas as margens saudáveis"}
                       </div>
                    </div>
                  </div>
                )}

                {/* Floating Toolbar: Search, Filters & Categories */}
                <div className="sticky top-2 z-20 flex flex-col mb-4 max-w-full pointer-events-none">
                  <div className="flex flex-col xl:flex-row gap-2 bg-zinc-950/80  border border-zinc-800/50 rounded-2xl shadow-xl max-w-full pointer-events-auto p-2 items-center">
                    
                    {/* Search & Filter */}
                    <div className="flex w-full xl:w-auto items-center gap-2 shrink-0 border-b xl:border-b-0 xl:border-r border-zinc-800/50 pb-2 xl:pb-0 xl:pr-2">
                       <div className="relative w-full xl:w-64">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                          <input 
                            type="text" placeholder="Procurar artigo..." 
                            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 py-2 pl-9 pr-3 rounded-xl text-xs font-medium outline-none text-white placeholder:text-zinc-600 focus:bg-zinc-800/50 focus:border-zinc-700 transition-colors"
                          />
                       </div>
                       <div className="relative">
                          <button 
                            onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                            className={`flex items-center justify-center gap-2 px-4 py-2 ${activeFilter !== 'todos' ? 'bg-blue-500 hover:bg-blue-600 text-white border-blue-500' : 'bg-zinc-900 hover:bg-zinc-800 text-white border-zinc-800'} border rounded-xl text-xs font-bold uppercase tracking-widest transition-colors shrink-0`}
                          >
                             <Filter size={14} /> <span className="hidden sm:inline">Filtros</span>
                          </button>
                          
                          {isFilterMenuOpen && (
                             <div className="absolute top-full left-0 sm:left-auto sm:right-0 mt-2 w-56 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-50">
                                <div className="p-2 space-y-1">
                                   {[
                                      { id: "todos", label: "Todos os Produtos" },
                                      { id: "com_stock", label: "Em Stock (>0)" },
                                      { id: "sem_stock", label: "Sem Stock (0)" },
                                      { id: "stock_critico", label: "Stock Crítico (<10)" },
                                      { id: "excesso_stock", label: "Excesso Stock (>100)" },
                                      { id: "com_margem", label: "Com Margem" },
                                      { id: "sem_margem", label: "Sem Margem (Custo ≥ PVP)" },
                                      { id: "maior_custo", label: "Maior Custo Imobilizado" },
                                      { id: "maior_pvp", label: "Maior Valor PVP" },
                                      { id: "mais_movimentados", label: "Mais Movimentados" },
                                      { id: "menos_movimentados", label: "Menos Movimentados" },
                                   ].map((f) => (
                                      <button
                                        key={f.id}
                                        onClick={() => {
                                           setActiveFilter(f.id);
                                           setIsFilterMenuOpen(false);
                                        }}
                                        className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors ${
                                           activeFilter === f.id ? "bg-white/10 text-white" : "text-zinc-400 hover:bg-white/5 hover:text-white"
                                        }`}
                                      >
                                         {f.label}
                                      </button>
                                   ))}
                                </div>
                             </div>
                          )}
                       </div>
                    </div>

                    {/* Categories Scroll */}
                    <div className="flex overflow-x-auto no-scrollbar gap-2 w-full xl:w-auto">
                      <button
                        onClick={() => setSelectedCategory(null)}
                        className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border rounded-xl flex items-center justify-center shrink-0 ${
                          !selectedCategory
                            ? "bg-emerald-500 text-black border-emerald-500 shadow-lg shadow-emerald-500/20"
                            : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-white hover:bg-zinc-800"
                        }`}
                      >
                        Todos
                      </button>
                      {categories.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => setSelectedCategory(c.id.toString())}
                          className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border rounded-xl flex items-center gap-2 shrink-0 ${
                            selectedCategory === c.id.toString()
                              ? "bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/20"
                              : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-white hover:bg-zinc-800"
                          }`}
                        >
                          {c.nome}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Main Table */}
                <div className="bg-zinc-900 border border-zinc-800 shadow-xl rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                     <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                          <tr className="border-b border-zinc-800 bg-zinc-950/50">
                             <th className="p-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Identificação do Artigo</th>
                             <th className="p-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">Arm. Central</th>
                             <th className="p-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">Custo Un.</th>
                             <th className="p-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">P.V.P Un.</th>
                             <th className="p-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">Total (PVP)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/50">
                           {filteredProdutos.slice(0, displayCountProducts).map(p => (
                              <tr key={p.id} className="hover:bg-zinc-800/30 transition-colors group">
                                 <td className="p-4">
                                   <div 
                                     className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity"
                                     onClick={() => setSelectedProduct(p)}
                                   >
                                      {p.imagem_url ? (
                                         <img src={p.imagem_url} alt={p.nome} className="w-10 h-10 rounded-lg object-cover ring-1 ring-white/10 group-hover:scale-105 transition-transform" />
                                      ) : (
                                         <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0 ring-1 ring-white/5 group-hover:scale-105 transition-transform">
                                            <Package size={16} className="text-zinc-500" />
                                         </div>
                                      )}
                                      <div>
                                         <p className="text-sm font-bold text-zinc-200 group-hover:text-blue-400 transition-colors truncate max-w-[200px] sm:max-w-md">{p.nome}</p>
                                         <div className="flex items-center gap-2 mt-0.5">
                                           <p className="text-[10px] font-bold text-zinc-500 tracking-wider font-mono">{p.codigo_barras || "S/ REF"}</p>
                                           {Number(p.preco) <= Number(p.preco_custo) && (
                                              <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest bg-orange-500/10 text-orange-500 border border-orange-500/20">
                                                Sem Margem
                                              </span>
                                           )}
                                         </div>
                                      </div>
                                   </div>
                                 </td>
                                 <td className="p-4 text-right">
                                   <div 
                                      className={cn("flex items-center justify-end gap-1.5 rounded pl-4 pr-1 py-1 transition-colors group/qty", user?.role === 'admin' ? "cursor-pointer hover:bg-white/5" : "")}
                                      onClick={() => handleQuickEditStock(p)}
                                      title={user?.role === 'admin' ? "Clique para ajustar" : ""}
                                   >
                                     <span className={`text-2xl font-black ${
                                        Number(p.stock_armazem) <= 0 ? "text-red-500" : 
                                        Number(p.stock_armazem) < 10 ? "text-orange-500" : 
                                        "text-emerald-500"
                                     }`}>
                                       {p.stock_armazem || 0}
                                     </span>
                                     <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">
                                       {p.unidade_base}
                                     </span>
                                   </div>
                                 </td>
                                 <td className="p-4 text-right">
                                   <span className="text-sm font-medium text-zinc-400">€{Number(p.preco_custo || 0).toFixed(2)}</span>
                                 </td>
                                 <td className="p-4 text-right">
                                   <span className="text-sm font-medium text-blue-400">€{Number(p.preco || 0).toFixed(2)}</span>
                                 </td>
                                 <td className="p-4 text-right">
                                   <span className="text-sm font-black text-white">€{(Number(p.stock_armazem || 0) * Number(p.preco || 0)).toFixed(2)}</span>
                                 </td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                     {filteredProdutos.length > displayCountProducts && (
                       <div ref={loadMoreProductsRef} className="w-full flex justify-center py-6">
                         <span className="px-6 py-3 text-zinc-500 font-medium tracking-tight text-sm">
                           Carregando mais itens...
                         </span>
                       </div>
                     )}
                  </div>
                  {filteredProdutos.length === 0 && (
                     <div className="p-16 text-center flex flex-col items-center">
                        <ArchiveRestore size={48} className="text-zinc-700 mb-4" />
                        <p className="text-sm font-black text-zinc-500 uppercase tracking-widest">
                           {searchTerm ? "Nenhum artigo encontrado" : "Inventário Vazio"}
                        </p>
                     </div>
                  )}
                </div>
            </motion.div>
         )}
         
         {activeTab === "contagem" && (
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
               <AdminStockCounts categories={categories} />
            </motion.div>
         )}

         {activeTab === "movimentos" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
               {/* Painel de Filtros sob demanda */}
               <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 shadow-xl">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                     {/* 1. Data de Início */}
                     <div>
                        <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">
                           Data de Início
                        </label>
                        <input
                           type="date"
                           value={draftMoveFilter.startDate}
                           onChange={(e) =>
                              setDraftMoveFilter((prev) => ({ ...prev, startDate: e.target.value }))
                           }
                           onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                 e.preventDefault();
                                 handleSearchMovements();
                              }
                           }}
                           className="w-full px-3 h-10 bg-zinc-950/70 border border-zinc-800 hover:border-zinc-700 focus:border-blue-500/60 rounded-xl text-sm text-zinc-200 outline-none transition-colors [color-scheme:dark]"
                        />
                     </div>

                     {/* 2. Data de Fim */}
                     <div>
                        <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">
                           Data de Fim
                        </label>
                        <input
                           type="date"
                           value={draftMoveFilter.endDate}
                           onChange={(e) =>
                              setDraftMoveFilter((prev) => ({ ...prev, endDate: e.target.value }))
                           }
                           onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                 e.preventDefault();
                                 handleSearchMovements();
                              }
                           }}
                           className="w-full px-3 h-10 bg-zinc-950/70 border border-zinc-800 hover:border-zinc-700 focus:border-blue-500/60 rounded-xl text-sm text-zinc-200 outline-none transition-colors [color-scheme:dark]"
                        />
                     </div>

                     {/* 3. Lojas */}
                     <div>
                        <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">
                           Loja
                        </label>
                        <select
                           value={draftMoveFilter.storeId}
                           onChange={(e) =>
                              setDraftMoveFilter((prev) => ({ ...prev, storeId: e.target.value }))
                           }
                           className="w-full px-3 h-10 bg-zinc-950/70 border border-zinc-800 hover:border-zinc-700 focus:border-blue-500/60 rounded-xl text-sm text-zinc-200 outline-none transition-colors"
                        >
                           <option value="all">Todas as Lojas</option>
                           <option value="armazem">Armazém Central (Entradas / Ajustes)</option>
                           {stores.map((store) => (
                              <option key={store.id} value={String(store.id)}>
                                 {store.name}
                              </option>
                           ))}
                        </select>
                     </div>

                     {/* 4. Produto (Pesquisável + Seleção) */}
                     <div ref={productDropdownRef} className="relative">
                        <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">
                           Produto
                        </label>
                        <div className="relative">
                           <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                           <input
                              type="text"
                              placeholder="Todos os produtos..."
                              value={draftMoveFilter.productQuery}
                              onFocus={() => setIsProductDropdownOpen(true)}
                              onChange={(e) => {
                                 const val = e.target.value;
                                 setDraftMoveFilter((prev) => ({
                                    ...prev,
                                    productQuery: val,
                                    produtoId: "all",
                                 }));
                                 setIsProductDropdownOpen(true);
                              }}
                              onKeyDown={(e) => {
                                 if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleSearchMovements();
                                 } else if (e.key === "Escape") {
                                    setIsProductDropdownOpen(false);
                                 }
                              }}
                              className="w-full pl-9 pr-14 h-10 bg-zinc-950/70 border border-zinc-800 hover:border-zinc-700 focus:border-blue-500/60 rounded-xl text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition-colors"
                           />
                           <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                              {(draftMoveFilter.productQuery || draftMoveFilter.produtoId !== "all") && (
                                 <button
                                    type="button"
                                    onClick={() => {
                                       setDraftMoveFilter((prev) => ({
                                          ...prev,
                                          produtoId: "all",
                                          productQuery: "",
                                       }));
                                    }}
                                    className="p-1 text-zinc-500 hover:text-zinc-200 rounded-md transition-colors cursor-pointer"
                                    title="Limpar produto"
                                 >
                                    <X className="w-3.5 h-3.5" />
                                 </button>
                              )}
                              <button
                                 type="button"
                                 onClick={() => setIsProductDropdownOpen((prev) => !prev)}
                                 className="p-1 text-zinc-500 hover:text-zinc-300 rounded-md transition-colors cursor-pointer"
                                 tabIndex={-1}
                              >
                                 <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", isProductDropdownOpen ? "rotate-180" : "")} />
                              </button>
                           </div>
                        </div>

                        {isProductDropdownOpen && (
                           <div className="absolute left-0 right-0 top-full mt-1.5 max-h-64 overflow-y-auto bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl z-50 divide-y divide-zinc-800/60">
                              <button
                                 type="button"
                                 onClick={() => {
                                    setDraftMoveFilter((prev) => ({
                                       ...prev,
                                       produtoId: "all",
                                       productQuery: "",
                                    }));
                                    setIsProductDropdownOpen(false);
                                 }}
                                 className={cn(
                                    "w-full px-3.5 py-2.5 text-left text-xs font-semibold flex items-center justify-between hover:bg-zinc-900 transition-colors cursor-pointer",
                                    draftMoveFilter.produtoId === "all" && !draftMoveFilter.productQuery
                                       ? "text-blue-400 bg-blue-500/10"
                                       : "text-zinc-300"
                                 )}
                              >
                                 <span>Todos os Produtos</span>
                                 {draftMoveFilter.produtoId === "all" && !draftMoveFilter.productQuery && (
                                    <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                 )}
                              </button>
                              {filteredProductOptions.length === 0 ? (
                                 <div className="px-3.5 py-3 text-xs text-zinc-500">
                                    Nenhum produto na lista (prima Pesquisar para procurar no motivo).
                                 </div>
                              ) : (
                                 filteredProductOptions.map((prod) => {
                                    const isSel = String(draftMoveFilter.produtoId) === String(prod.id);
                                    return (
                                       <button
                                          key={prod.id}
                                          type="button"
                                          onClick={() => {
                                             setDraftMoveFilter((prev) => ({
                                                ...prev,
                                                produtoId: String(prod.id),
                                                productQuery: String(prod.nome || ""),
                                             }));
                                             setIsProductDropdownOpen(false);
                                          }}
                                          className={cn(
                                             "w-full px-3.5 py-2 text-left text-xs flex items-center justify-between gap-2 hover:bg-zinc-900 transition-colors cursor-pointer",
                                             isSel ? "bg-blue-500/15 text-blue-300 font-bold" : "text-zinc-200"
                                          )}
                                       >
                                          <span className="truncate">{prod.nome}</span>
                                          <div className="flex items-center gap-1.5 shrink-0">
                                             <span className="text-[10px] uppercase font-mono text-zinc-500">
                                                {prod.unidade_base || "un"}
                                             </span>
                                             {isSel && <Check className="w-3.5 h-3.5 text-blue-400" />}
                                          </div>
                                       </button>
                                    );
                                 })
                              )}
                           </div>
                        )}
                     </div>
                  </div>

                  {/* Barra de ações: Exportar + Limpar + Pesquisar */}
                  <div className="mt-4 pt-3.5 border-t border-zinc-800/70 flex flex-wrap items-center justify-between gap-2.5">
                     <div className="flex items-center gap-2.5">
                        {hasSearchedMovements && !loadingMovements && (
                           <span className="text-xs text-zinc-400 font-medium">
                              <strong className="text-zinc-100">{movements.length}</strong>{" "}
                              {movements.length === 1 ? "registo encontrado" : "registos encontrados"}
                              {appliedMoveFilter.startDate || appliedMoveFilter.endDate ? (
                                 <span className="text-zinc-500 ml-1">
                                    ({appliedMoveFilter.startDate ? new Date(`${appliedMoveFilter.startDate}T12:00:00`).toLocaleDateString("pt-PT") : "início"}
                                    {" → "}
                                    {appliedMoveFilter.endDate ? new Date(`${appliedMoveFilter.endDate}T12:00:00`).toLocaleDateString("pt-PT") : "hoje"})
                                 </span>
                              ) : null}
                           </span>
                        )}
                        {hasSearchedMovements && movements.length > 0 && (
                           <button
                              type="button"
                              onClick={exportToCSV}
                              className="px-3.5 h-9 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/80 rounded-xl text-[11px] font-bold uppercase tracking-wider text-zinc-200 transition-all flex items-center gap-1.5 cursor-pointer"
                           >
                              <Download size={14} /> <span>Exportar CSV</span>
                           </button>
                        )}
                     </div>

                     <div className="flex items-center gap-2.5 ml-auto">
                        <button
                           type="button"
                           onClick={handleClearMovements}
                           className="px-4 h-10 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-zinc-100 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                           title="Limpar filtros e ocultar lista"
                        >
                           <RotateCcw className="w-3.5 h-3.5" />
                           Limpar
                        </button>
                        <button
                           type="button"
                           onClick={handleSearchMovements}
                           disabled={loadingMovements}
                           className="px-6 h-10 bg-blue-600 hover:bg-blue-500 active:scale-[0.99] disabled:opacity-50 text-white rounded-xl text-xs font-bold tracking-wide transition-all flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                        >
                           <Search className="w-4 h-4" />
                           {loadingMovements ? "A carregar..." : "Pesquisar"}
                        </button>
                     </div>
                  </div>
               </div>

               {/* Resultados sob demanda */}
               {!hasSearchedMovements ? (
                  <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl py-16 px-6 text-center">
                     <div className="w-11 h-11 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-3.5 text-zinc-400">
                        <Search className="w-5 h-5" />
                     </div>
                     <p className="text-sm font-semibold text-zinc-200">
                        Os movimentos estão ocultos até realizar a pesquisa
                     </p>
                     <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto">
                        Selecione a data de início e fim, a loja ou o produto acima e clique em Pesquisar.
                     </p>
                  </div>
               ) : loadingMovements ? (
                  <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl py-20 px-6 flex flex-col items-center justify-center gap-3">
                     <RefreshCcw className="w-7 h-7 text-blue-400 animate-spin" />
                     <p className="text-xs text-zinc-400 font-medium">A carregar movimentos de stock...</p>
                  </div>
               ) : groupedMovements.length === 0 ? (
                  <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl py-16 px-6 text-center flex flex-col items-center">
                     <History size={44} className="text-zinc-700 mb-3" />
                     <p className="text-sm font-bold text-zinc-200 mb-1">
                        Nenhum movimento encontrado
                     </p>
                     <p className="text-xs text-zinc-500">
                        Não existem movimentos para os filtros selecionados.
                     </p>
                  </div>
                ) : (
                  <div className="bg-zinc-900 border border-zinc-800 shadow-xl rounded-2xl overflow-hidden">
                     {/* Legenda clara de cores + botão Expandir/Recolher lotes */}
                     <div className="px-4 sm:px-5 py-3 bg-zinc-950/70 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
                           <span className="text-zinc-500 font-semibold">Leitura do cálculo:</span>
                           <span className="font-bold text-yellow-400">Tinha (antes)</span>
                           <span className="text-zinc-600" aria-hidden="true">·</span>
                           <span className="font-bold text-emerald-400">+ Entrou</span>
                           <span className="text-zinc-600" aria-hidden="true">/</span>
                           <span className="font-bold text-rose-400">− Saiu</span>
                           <span className="text-zinc-600" aria-hidden="true">·</span>
                           <span className="font-bold text-emerald-400">= Ficou (saldo)</span>
                        </div>

                        {groupedMovements.some((g: any) => g.totalItems > 1) && (
                           <button
                              type="button"
                              onClick={() => {
                                 const visibleMulti = groupedMovements
                                    .slice(0, displayCountMovements)
                                    .filter((g: any) => g.totalItems > 1);
                                 const allExpanded = visibleMulti.every((g: any) => expandedMoveGroups[g.id]);
                                 if (allExpanded) {
                                    setExpandedMoveGroups({});
                                 } else {
                                    const next: Record<string, boolean> = { ...expandedMoveGroups };
                                    visibleMulti.forEach((g: any) => {
                                       next[g.id] = true;
                                    });
                                    setExpandedMoveGroups(next);
                                 }
                              }}
                              className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-xs font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer"
                           >
                              {groupedMovements
                                 .slice(0, displayCountMovements)
                                 .filter((g: any) => g.totalItems > 1)
                                 .every((g: any) => expandedMoveGroups[g.id])
                                 ? "Recolher Lotes"
                                 : "Expandir Todos os Lotes"}
                           </button>
                        )}
                     </div>

                     <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse whitespace-nowrap">
                           <thead>
                              <tr className="border-b border-zinc-800 bg-zinc-950/50">
                                 <th className="p-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest w-10"></th>
                                 <th className="p-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Data / Hora</th>
                                 <th className="p-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Produto / Destino / Motivo</th>
                                 <th className="p-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">Operação</th>
                                 <th className="p-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">Cálculo de Stock (Tinha · Mov · Ficou)</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-zinc-800/50">
                              {groupedMovements.slice(0, displayCountMovements).map((group: any) => {
                                 const isSingleItem = group.totalItems === 1;
                                 const singleItem = isSingleItem ? group.items[0] : null;
                                 const singleProdName = singleItem
                                    ? singleItem.produto?.nome || singleItem.produto_nome || "Desconhecido"
                                    : "";
                                 const singleCleanMotivo = singleItem ? cleanMovementMotivo(singleItem.motivo) : "";

                                 return (
                                    <React.Fragment key={group.id}>
                                       <tr
                                          className={cn(
                                             "hover:bg-zinc-800/30 transition-colors group",
                                             !isSingleItem && "cursor-pointer",
                                             !isSingleItem && expandedMoveGroups[group.id] ? "bg-zinc-800/20" : ""
                                          )}
                                          onClick={() => {
                                             if (!isSingleItem) toggleMoveGroup(group.id);
                                          }}
                                       >
                                          <td className="p-4 text-center">
                                             {!isSingleItem ? (
                                                <Plus
                                                   size={14}
                                                   className={cn(
                                                      "text-zinc-500 transition-transform inline-block",
                                                      expandedMoveGroups[group.id] ? "rotate-45 text-white" : ""
                                                   )}
                                                />
                                             ) : (
                                                <span className="inline-block w-3.5" />
                                             )}
                                          </td>
                                          <td className="p-4">
                                             <div className="text-xs font-mono font-medium text-zinc-500 flex flex-col">
                                                <span className="text-zinc-300">{new Date(group.created_at).toLocaleDateString("pt-PT")}</span>
                                                <span>{new Date(group.created_at).toLocaleTimeString("pt-PT")}</span>
                                             </div>
                                          </td>
                                          <td className="p-4">
                                             {isSingleItem ? (
                                                <div className="flex flex-col max-w-[340px] sm:max-w-[480px]">
                                                   <span className="text-sm font-bold text-zinc-100 truncate">
                                                      {singleProdName}
                                                   </span>
                                                   <span className="text-xs text-zinc-400 truncate mt-0.5">
                                                      {group.isGroup
                                                         ? `${group.title}${singleCleanMotivo ? ` · ${singleCleanMotivo}` : ""}`
                                                         : singleCleanMotivo || group.title}
                                                   </span>
                                                </div>
                                             ) : (
                                                <p className={cn("text-sm font-bold truncate max-w-[340px] sm:max-w-[480px]", expandedMoveGroups[group.id] ? "text-blue-400" : "text-zinc-200")}>
                                                   {group.title}
                                                </p>
                                             )}
                                          </td>
                                          <td className="p-4 text-center">
                                             <span
                                                className={cn(
                                                   "text-xs font-bold uppercase tracking-wider",
                                                   group.tipo === "entrada"
                                                      ? "text-emerald-400"
                                                      : group.tipo === "saida"
                                                      ? "text-rose-400"
                                                      : "text-amber-400"
                                                )}
                                             >
                                                {group.tipo === "entrada" ? "Entrada" : group.tipo === "saida" ? "Saída" : group.tipo}
                                             </span>
                                          </td>
                                          <td className="p-4 text-right">
                                             {isSingleItem && singleItem ? (
                                                <StockBalanceEquation movement={singleItem} />
                                             ) : (
                                                <div className="inline-flex flex-col items-end">
                                                   <span className="text-sm font-bold text-white">
                                                      {group.totalItems} artigos
                                                   </span>
                                                   <span className="text-[11px] text-blue-400 font-medium">
                                                      {expandedMoveGroups[group.id] ? "Ocultar cálculo" : "Clique para ver saldos"}
                                                   </span>
                                                </div>
                                             )}
                                          </td>
                                       </tr>

                                       {!isSingleItem && expandedMoveGroups[group.id] && (
                                          <tr>
                                             <td colSpan={5} className="p-0 bg-black/40">
                                                <div className="px-4 sm:px-10 py-3.5 border-l-2 border-blue-500/50 space-y-2">
                                                   {group.items.map((m: any) => {
                                                      const itemMotivo = cleanMovementMotivo(m.motivo);
                                                      return (
                                                         <div
                                                            key={m.id}
                                                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-2.5 border-b border-zinc-800/50 last:border-0 hover:bg-white/[0.03] px-3 sm:px-4 rounded-xl transition-colors"
                                                         >
                                                            <div className="flex flex-col min-w-0">
                                                               <span className="text-sm font-bold text-zinc-100 truncate">
                                                                  {m.produto?.nome || m.produto_nome || "Desconhecido"}
                                                               </span>
                                                               <div className="flex items-center flex-wrap gap-2 mt-0.5">
                                                                  <span className="text-[11px] text-zinc-500 font-mono tabular-nums">
                                                                     {m.created_at ? new Date(m.created_at).toLocaleTimeString("pt-PT") : ""}
                                                                  </span>
                                                                  {itemMotivo && (
                                                                     <>
                                                                        <span className="text-zinc-700" aria-hidden="true">·</span>
                                                                        <span className="text-[11px] text-zinc-400 truncate max-w-[360px]">
                                                                           {itemMotivo}
                                                                        </span>
                                                                     </>
                                                                  )}
                                                               </div>
                                                            </div>
                                                            <div className="flex items-center justify-end shrink-0">
                                                               <StockBalanceEquation movement={m} />
                                                            </div>
                                                         </div>
                                                      );
                                                   })}
                                                </div>
                                             </td>
                                          </tr>
                                       )}
                                    </React.Fragment>
                                 );
                              })}
                           </tbody>
                        </table>
                        {groupedMovements.length > displayCountMovements && (
                           <div ref={loadMoreMovementsRef} className="w-full flex justify-center py-6">
                              <span className="px-6 py-3 text-zinc-500 font-medium tracking-tight text-sm">
                                 Carregando mais itens...
                              </span>
                           </div>
                        )}
                     </div>
                  </div>
                )}
            </motion.div>
         )}
         
      </div>

      <ProductDescriptionModal 
        isOpen={!!selectedProduct} 
        onClose={() => setSelectedProduct(null)} 
        product={selectedProduct} 
        adminMode={true}
        hideCostAndTotal={false}
      />
    </div>
  );
}


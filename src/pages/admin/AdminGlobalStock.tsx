import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  Search, Plus, AlertCircle, RefreshCcw, Package,
  Wallet, Layers, Download, History, ArchiveRestore, TrendingUp, TrendingDown,
  AlertTriangle, Filter
} from "lucide-react";
import api from "../../lib/api";
import { supabase } from "../../lib/supabase";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { motion } from "motion/react";
import { BrandTitle } from "../../components/BrandTitle";
import Swal from "sweetalert2";

import AdminStockExits from "./AdminStockExits";
import AdminStockCounts from "./AdminStockCounts";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import { ProductDescriptionModal } from "../../components/ProductDescriptionModal";

export default function AdminGlobalStock() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "quebras" | "movimentos" | "contagem">("dashboard");
  
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState("todos");
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [movements, setMovements] = useState<any[]>([]);
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

  const fetchData = async () => {
    try {
      const [prodRes, moveRes, usersRes, catRes] = await Promise.all([
        api.get("/produtos"),
        api.get("/admin/stock/movimentacoes"),
        api.get("/admin/users"),
        api.get("/categorias")
      ]);
      setProducts(Array.isArray(prodRes.data) ? prodRes.data.sort((a: any, b: any) => (a.nome || "").localeCompare(b.nome || "")) : []);
      setMovements(Array.isArray(moveRes.data) ? moveRes.data : []);
      setStores(Array.isArray(usersRes.data) ? usersRes.data.filter((u: any) => u.role === "loja") : []);
      setCategories(Array.isArray(catRes.data) ? catRes.data : []);
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
      .on("postgres_changes", { event: "*", schema: "public", table: "movimentacoes_stock" }, fetchData)
      .on("postgres_changes", { event: "*", schema: "public", table: "produtos" }, fetchData)
      .on("postgres_changes", { event: "*", schema: "public", table: "stock_loja" }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const exportToCSV = () => {
    let csvContent = "\uFEFFData;Produto;Tipo;Quantidade;Destino/Motivo\n";
    movements.forEach(m => {
      const data = new Date(m.created_at).toLocaleString("pt-PT");
      const produto = (m.produto?.nome || m.produto_nome || "").replace(/;/g, ",");
      const tipo = m.tipo === "entrada" ? "ENTRADA" : "SAÍDA";
      const quantidade = `${m.quantidade} ${m.unidade || m.produto?.unidade_medida}`;
      const destino = m.user_target_id ? `LOJA: ${stores.find((s) => s.id === m.user_target_id)?.name || m.user_target_id}` : (m.motivo || "");
      
      csvContent += `${data};${produto};${tipo};${quantidade};${destino}\n`;
    });
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `movimentos_stock_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  const handleQuickEditStock = async (produto: any) => {
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
         movements.forEach(m => {
            if (m.produto_id) movMap.set(m.produto_id, (movMap.get(m.produto_id) || 0) + Number(m.quantidade || 0));
         });
         return result.sort((a,b) => (movMap.get(b.id) || 0) - (movMap.get(a.id) || 0));
      }
      case "menos_movimentados": {
         const movMap = new Map();
         movements.forEach(m => {
            if (m.produto_id) movMap.set(m.produto_id, (movMap.get(m.produto_id) || 0) + Number(m.quantidade || 0));
         });
         return result.sort((a,b) => (movMap.get(a.id) || 0) - (movMap.get(b.id) || 0));
      }
      default: return result;
    }
  }, [products, searchTerm, selectedCategory, activeFilter, movements]);

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
           <button 
              onClick={() => setActiveTab("quebras")}
              className={`flex-1 sm:flex-none px-4 py-1.5 text-[10px] flex items-center justify-center font-black uppercase tracking-wider rounded-md transition-all whitespace-nowrap ${
                 activeTab === 'quebras' ? 'bg-blue-500 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
              }`}
           >
              Quebras
           </button>
        </div>
      </div>

      {/* Conteúdo com scroll */}
      <div className="flex-1">
         
         {activeTab === "dashboard" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                
                {/* Bento Grid Stats */}
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
                                      className="flex items-center justify-end gap-1.5 cursor-pointer hover:bg-white/5 rounded pl-4 pr-1 py-1 transition-colors group/qty"
                                      onClick={() => handleQuickEditStock(p)}
                                      title="Clique para ajustar"
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
               <AdminStockCounts />
            </motion.div>
         )}

         {activeTab === "quebras" && (
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
               <AdminStockExits />
            </motion.div>
         )}

         {activeTab === "movimentos" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
               <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-black text-white tracking-tight">
                      Auditoria de Movimentos
                    </h2>
                    <p className="text-zinc-500 text-xs mt-1">Histórico completo de entradas e saídas.</p>
                  </div>
                  <button onClick={exportToCSV} className="flex items-center gap-2 px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-xs font-bold uppercase tracking-widest text-white transition-all shadow-sm active:scale-95">
                     <Download size={16} /> <span className="hidden sm:inline">Exportar Base</span>
                  </button>
               </div>
               
               <div className="bg-zinc-900 border border-zinc-800 shadow-xl rounded-2xl overflow-hidden mt-6">
                 <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                       <thead>
                         <tr className="border-b border-zinc-800 bg-zinc-950/50">
                            <th className="p-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Timestamp</th>
                            <th className="p-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Artigo</th>
                            <th className="p-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">Operação</th>
                            <th className="p-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">Qtd</th>
                            <th className="p-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">Referência / Destino</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-zinc-800/50">
                          {movements.slice(0, displayCountMovements).map(m => (
                             <tr key={m.id} className="hover:bg-zinc-800/30 transition-colors group">
                                <td className="p-4">
                                   <div className="text-xs font-mono font-medium text-zinc-500 flex flex-col">
                                      <span className="text-zinc-300">{new Date(m.created_at).toLocaleDateString("pt-PT")}</span>
                                      <span>{new Date(m.created_at).toLocaleTimeString("pt-PT")}</span>
                                   </div>
                                </td>
                                <td className="p-4">
                                  <p className="text-sm font-bold text-zinc-200 truncate max-w-[200px] sm:max-w-md">
                                    {m.produto?.nome || m.produto_nome || "Desconhecido"}
                                  </p>
                                </td>
                                <td className="p-4 text-center">
                                  <div className={`inline-flex items-center justify-center px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest border ${m.tipo === "entrada" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : m.tipo === "saida" ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-orange-500/10 text-orange-400 border-orange-500/20"}`}>
                                    {m.tipo === "entrada" ? "Reposição" : m.tipo === "saida" ? "Saída" : m.tipo}
                                  </div>
                                </td>
                                <td className="p-4 text-right">
                                  <span className="text-sm font-bold text-white">
                                    {m.tipo === "saida" ? "-" : "+"}{m.quantidade} <span className="text-[10px] text-zinc-500 uppercase ml-0.5">{m.unidade || m.produto?.unidade_medida || m.produto?.unidade_base}</span>
                                  </span>
                                </td>
                                <td className="p-4 text-right">
                                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest bg-zinc-800/50 px-2 py-1 rounded">
                                    {m.user_target_id ? `L: ${stores.find(s => s.id === m.user_target_id)?.name || m.user_target_id.slice(0,5)}` : (m.motivo || "—")}
                                  </span>
                                </td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                    {movements.length > displayCountMovements && (
                      <div ref={loadMoreMovementsRef} className="w-full flex justify-center py-6">
                        <span className="px-6 py-3 text-zinc-500 font-medium tracking-tight text-sm">
                          Carregando mais itens...
                        </span>
                      </div>
                    )}
                 </div>
                 {movements.length === 0 && (
                    <div className="p-16 text-center flex flex-col items-center">
                       <History size={48} className="text-zinc-700 mb-4" />
                       <p className="text-sm font-black text-zinc-500 uppercase tracking-widest">
                          Nenhum registo encontrado
                       </p>
                    </div>
                 )}
               </div>
            </motion.div>
         )}
         
      </div>

      <ProductDescriptionModal 
        isOpen={!!selectedProduct} 
        onClose={() => setSelectedProduct(null)} 
        product={selectedProduct} 
        adminMode={true}
      />
    </div>
  );
}


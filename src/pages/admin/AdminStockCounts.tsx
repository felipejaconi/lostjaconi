import React, { useState, useEffect, useMemo } from "react";
import { Layers, Search, AlertCircle, CheckCircle2, TrendingDown, TrendingUp, PackageSearch, Filter, ShoppingCart, ChevronDown, ChevronUp, Store, Clock, Printer, Maximize2, Minimize2, ArrowUpDown } from "lucide-react";
import api from "../../lib/api";

type OrderDetail = {
  orderId: string;
  storeName: string;
  requestedQty: number; // in base unit
  displayQty: number; // as ordered
  originalUnit: string;
  date: string;
};

export default function AdminStockCounts() {
  const [products, setProducts] = useState<any[]>([]);
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "missing" | "sufficient">("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"missing_first" | "name" | "stock_first">("missing_first");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [prodsRes, ordersRes] = await Promise.all([
          api.get("/produtos"),
          api.get("/pedidos?limit=5000") // get all pending requests
        ]);
        
        setProducts(Array.isArray(prodsRes.data) ? prodsRes.data : []);
        
        // Filter only pending/processing orders (using correct status)
        const activeOrders = (Array.isArray(ordersRes.data) ? ordersRes.data : [])
           .filter(o => o.status === "pendente" || o.status === "processando" || o.status === "em_processamento");
           
        setPendingOrders(activeOrders);
      } catch (err) {
        console.error("Erro ao carregar dados de contagem:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const countData = useMemo(() => {
    const productStats: Record<string, { totalRequested: number, orders: OrderDetail[] }> = {};
    
    pendingOrders.forEach(order => {
      const storeName = order.loja_nome || order.user?.name || "Loja Desconhecida";
      const itemsArr = Array.isArray(order.pedido_itens) ? order.pedido_itens : [];
      
      itemsArr.forEach((item: any) => {
        const pid = String(item.produto_id);
        const qty = Number(item.quantidade_pedida != null ? item.quantidade_pedida : item.quantidade) || 0;
        
        const productData = item.produto;
        let factor = 1;
        if (productData) {
          if (item.unidade !== productData.unidade_base) {
            const unitObj = (productData.product_units || []).find((u: any) => u.unit === item.unidade);
            if (unitObj) {
              factor = unitObj.factor;
            } else if (item.unidade === 'cx') {
              factor = Number(productData.fator_conversao_venda) || 1; 
            } else {
              // Extract aprox weight from name (e.g., "(aprox 500g)")
              const aproxMatch = (productData.nome || "").match(/aprox\.?\s*([\d,.]+)\s*(kg|g)/i);
              if (aproxMatch) {
                 const aproxValue = parseFloat(aproxMatch[1].replace(',', '.'));
                 const aproxUnit = aproxMatch[2].toLowerCase();
                 const baseUnit = productData.unidade_base?.toLowerCase();
                 
                 if (baseUnit === 'kg') {
                    if (aproxUnit === 'g') factor = aproxValue / 1000;
                    else if (aproxUnit === 'kg') factor = aproxValue;
                 } else if (baseUnit === 'g') {
                    if (aproxUnit === 'g') factor = aproxValue;
                    else if (aproxUnit === 'kg') factor = aproxValue * 1000;
                 }
              }
            }
          }
        }
        const baseQty = qty * factor;

        if (!productStats[pid]) {
            productStats[pid] = { totalRequested: 0, orders: [] };
        }
        productStats[pid].totalRequested += baseQty;
        productStats[pid].orders.push({
            orderId: order.id,
            storeName,
            requestedQty: baseQty,
            displayQty: qty,
            originalUnit: item.unidade || productData?.unidade_base || "un",
            date: order.created_at
        });
      });
    });

    const mapped = products.map(p => {
      const pid = String(p.id);
      const stock = Number(p.stock_armazem) || 0;
      const stats = productStats[pid] || { totalRequested: 0, orders: [] };
      const requested = stats.totalRequested;
      const diff = stock - requested;
      
      return {
        ...p,
        stock_armazem: stock,
        requested,
        orders: stats.orders,
        diff,
        needsAttention: requested > 0 && diff < 0
      };
    });

    return mapped.filter(item => {
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        if (!item.nome.toLowerCase().includes(term) && !(item.codigo_barras && item.codigo_barras.toLowerCase().includes(term))) {
          return false;
        }
      }
      
      if (selectedCategory !== "all") {
         const cName = item.categoria_nome || item.categoria?.nome;
         if (cName !== selectedCategory) return false;
      }
      
      if (filterType === "missing" && !item.needsAttention) return false;
      if (filterType === "sufficient" && (item.requested === 0 || item.diff < 0)) return false;
      if (!searchTerm && filterType === "all" && item.stock_armazem === 0 && item.requested === 0) return false;
      
      return true;
    }).sort((a, b) => {
      if (sortBy === "missing_first") {
         if (a.needsAttention && !b.needsAttention) return -1;
         if (!a.needsAttention && b.needsAttention) return 1;
         if (a.requested > 0 && b.requested === 0) return -1;
         if (a.requested === 0 && b.requested > 0) return 1;
         return a.nome.localeCompare(b.nome);
      } else if (sortBy === "stock_first") {
         return b.stock_armazem - a.stock_armazem;
      } else {
         return a.nome.localeCompare(b.nome);
      }
    });

  }, [products, pendingOrders, searchTerm, filterType, selectedCategory, sortBy]);

  const availableCategories = useMemo(() => {
      const cats = new Set<string>();
      products.forEach(p => {
         if (p.categoria_nome) cats.add(p.categoria_nome);
         else if (p.categoria?.nome) cats.add(p.categoria.nome);
      });
      return Array.from(cats).sort();
  }, [products]);

  const toggleRow = (id: string) => {
    const newSet = new Set(expandedRows);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedRows(newSet);
  };

  const toggleExpandAll = () => {
    const itemsReq = countData.filter(i => i.requested > 0);
    if (expandedRows.size >= itemsReq.length && itemsReq.length > 0) {
      setExpandedRows(new Set());
    } else {
      setExpandedRows(new Set(itemsReq.map(i => String(i.id))));
    }
  };

  const handlePrint = () => {
    // Expand requested rows for printing
    setExpandedRows(new Set(countData.filter(i => i.requested > 0).map(i => String(i.id))));
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const totalMissing = countData.filter(i => i.needsAttention).length;

  return (
    <div className="pt-2 md:pt-4 pb-32 print:p-0 print:pb-0 print:bg-white print:text-black">
      <style>
        {`
          @media print {
            body { background: white !important; color: black !important; -webkit-print-color-adjust: exact; }
            .print\\:hidden { display: none !important; }
            .print\\:text-black { color: black !important; }
            .print\\:bg-white { background: white !important; }
            .print\\:border-gray-200 { border-color: #e5e7eb !important; }
            
            nav, header, [role="navigation"], .sidebar { display: none !important; }
            .no-scrollbar { overflow: visible !important; height: auto !important; max-height: none !important; }
            table { font-size: 11px !important; color: black !important; page-break-inside: auto; }
            tr { page-break-inside: avoid; page-break-after: auto; }
            thead { display: table-header-group; }
            tfoot { display: table-footer-group; }
          }
        `}
      </style>
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6 shrink-0 print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center gap-6">
           <h1 className="text-3xl lg:text-4xl font-semibold text-zinc-100 tracking-tight flex items-center gap-3">
             <PackageSearch className="w-8 h-8 text-amber-500" />
             Faltas
           </h1>
           
           <div className="flex items-center divide-x divide-zinc-800 bg-zinc-900/80 border border-zinc-800/80 rounded-lg shadow-sm mt-2 lg:mt-0">
             <div className="flex items-center gap-2 px-3 py-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider hidden sm:inline">Com Stock:</span>
                <span className="text-xs font-black text-zinc-100">{products.filter(p => Number(p.stock_armazem) > 0).length}</span>
             </div>
             
             <div className="flex items-center gap-2 px-3 py-1.5">
                <ShoppingCart className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider hidden sm:inline">Pendentes:</span>
                <span className="text-xs font-black text-zinc-100">{pendingOrders.length}</span>
             </div>

             <div className={`flex items-center gap-2 px-3 py-1.5 transition-colors ${totalMissing > 0 ? "bg-rose-500/10 text-rose-500" : "text-zinc-400 hover:text-zinc-300"}`}>
                <AlertCircle className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">Rupturas:</span>
                <span className="text-xs font-black">{totalMissing}</span>
             </div>
           </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
           <button onClick={toggleExpandAll} className="flex items-center gap-2 px-4 py-2 border border-zinc-700 bg-zinc-800 text-zinc-200 text-sm font-semibold rounded-lg hover:bg-zinc-700 transition-colors">
              {expandedRows.size > 0 ? <><Minimize2 className="w-4 h-4" /> Recolher</> : <><Maximize2 className="w-4 h-4" /> Expandir</>}
           </button>
           <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 border border-blue-500/50 bg-blue-500/10 text-blue-400 text-sm font-semibold rounded-lg hover:bg-blue-500 hover:text-white transition-colors">
              <Printer className="w-4 h-4" /> Imprimir Faltas
           </button>
        </div>
      </div>

      <div className="print:block hidden mb-6 pb-4 border-b border-gray-200">
         <h1 className="text-2xl font-bold">Relatório de Faltas e Necessidades</h1>
         <p className="text-sm">Data de emissão: {new Date().toLocaleDateString()}</p>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col bg-zinc-950 border border-zinc-800 print:border-gray-300 rounded-2xl shadow-xl z-20 print:shadow-none print:rounded-none">
        <div className="bg-zinc-900/50 p-4 border-b border-zinc-800 shrink-0 flex flex-col xl:flex-row xl:items-center justify-between gap-4 print:hidden">
            <div className="relative w-full xl:w-80">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
               <input
                 type="text"
                 placeholder="Pesquisar artigo..."
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="w-full bg-zinc-950 border border-zinc-800 hover:border-zinc-700 focus:border-zinc-600 rounded-lg py-2.5 pl-9 pr-4 text-zinc-100 placeholder:text-zinc-600 text-sm outline-none transition-colors"
               />
            </div>

            <div className="flex flex-wrap items-center gap-2 overflow-x-auto no-scrollbar pb-2 xl:pb-0">
               <div className="relative group shrink-0">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-zinc-500 group-hover:text-zinc-400">
                     <Filter className="w-3.5 h-3.5" />
                  </div>
                  <select 
                     value={selectedCategory} 
                     onChange={(e) => setSelectedCategory(e.target.value)}
                     className="bg-zinc-950 border border-zinc-800 rounded-lg py-1.5 pl-9 pr-8 text-xs text-zinc-300 font-medium outline-none hover:border-zinc-700 transition-colors appearance-none cursor-pointer"
                  >
                     <option value="all">Todas as Categorias</option>
                     {availableCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                     ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none group-hover:text-zinc-400" />
               </div>
               
               <div className="relative group shrink-0">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-zinc-500 group-hover:text-zinc-400">
                     <ArrowUpDown className="w-3.5 h-3.5" />
                  </div>
                  <select 
                     value={sortBy} 
                     onChange={(e) => setSortBy(e.target.value as any)}
                     className="bg-zinc-950 border border-zinc-800 rounded-lg py-1.5 pl-9 pr-8 text-xs text-zinc-300 font-medium outline-none hover:border-zinc-700 transition-colors appearance-none cursor-pointer"
                  >
                     <option value="missing_first">Rupturas Primeiro</option>
                     <option value="stock_first">Maior Stock Primeiro</option>
                     <option value="name">Alfabético</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none group-hover:text-zinc-400" />
               </div>

               <div className="w-px h-6 bg-zinc-800 mx-1 hidden sm:block"></div>

               <div className="relative group shrink-0">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-zinc-500 group-hover:text-zinc-400">
                     <Layers className="w-3.5 h-3.5" />
                  </div>
                  <select 
                     value={filterType} 
                     onChange={(e) => setFilterType(e.target.value as any)}
                     className="bg-zinc-950 border border-zinc-800 rounded-lg py-1.5 pl-9 pr-8 text-xs text-zinc-300 font-medium outline-none hover:border-zinc-700 transition-colors appearance-none cursor-pointer"
                  >
                     <option value="all">Mostrar Tudo</option>
                     <option value="missing">Em Faltas (Ruptura)</option>
                     <option value="sufficient">Com Stock</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none group-hover:text-zinc-400" />
               </div>
            </div>
        </div>

        <div className="flex-1 overflow-auto p-0 no-scrollbar print:overflow-visible">
          {loading ? (
            <div className="flex items-center justify-center h-full min-h-[300px]">
              <img src={`${import.meta.env.VITE_SUPABASE_URL || "https://ybaoaskddcmwoincsnwm.supabase.co"}/storage/v1/object/public/uploads/icon.png`} alt="Carregando..." className="w-8 h-8 animate-spin opacity-80" />
            </div>
          ) : countData.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 min-h-[300px]">
              <PackageSearch className="w-12 h-12 text-zinc-700 mb-4" />
              <p className="text-sm font-medium text-zinc-300">Nenhum dado encontrado</p>
              <p className="text-xs text-zinc-500 mt-1">Experimente alterar os filtros ou pesquisar por outro artigo.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[800px] print:min-w-0 print:w-full">
               <thead>
                 <tr className="bg-zinc-900/50 border-b border-zinc-800 sticky top-0 z-10 print:bg-gray-100 print:border-gray-300 print:text-black">
                   <th className="px-6 py-3 w-10 print:px-2 print:hidden"></th>
                   <th className="px-6 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider print:text-black print:px-2">Artigo</th>
                   <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider text-center print:text-black print:px-2">Stock Armazém (Base)</th>
                   <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider text-center print:text-black print:px-2">Lojas Pediram</th>
                   <th className="px-6 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider text-right print:text-black print:px-2">Saldo / Faltas</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-zinc-800/50 print:divide-gray-200">
                  {countData.map(item => {
                    const isExpanded = expandedRows.has(item.id);
                    const isMissing = item.needsAttention;
                    
                    let aproxText = null;
                    if (isMissing) {
                        const targetStr = item.nome + ' ' + (item.unidade_base || '');
                        const aproxMatch = targetStr.match(/aprox\.?\s*([\d,.]+)\s*(kg|g)/i);
                        if (aproxMatch) {
                            const aproxValue = parseFloat(aproxMatch[1].replace(',', '.'));
                            const unit = aproxMatch[2].toLowerCase();
                            
                            let aproxFactor = 1;
                            const baseUnit = item.unidade_base?.toLowerCase();
                            if (baseUnit === 'kg') {
                               if (unit === 'g') aproxFactor = aproxValue / 1000;
                               else if (unit === 'kg') aproxFactor = aproxValue;
                            } else if (baseUnit === 'g') {
                               if (unit === 'g') aproxFactor = aproxValue;
                               else if (unit === 'kg') aproxFactor = aproxValue * 1000;
                            }
                            
                            const missingBaseUnits = Math.abs(item.diff);
                            if (aproxFactor > 0) {
                               const unitsNeeded = Math.ceil(missingBaseUnits / aproxFactor);
                               aproxText = `pedir aprox. ${unitsNeeded} un`;
                            }
                        }
                    }

                    
                    return (
                    <React.Fragment key={item.id}>
                      <tr onClick={() => item.requested > 0 && toggleRow(item.id)} className={`transition-colors ${item.requested > 0 ? 'cursor-pointer hover:bg-zinc-800/50' : ''} ${isMissing ? 'bg-rose-500/[0.02] print:bg-rose-50' : isExpanded ? 'bg-zinc-800/30' : ''}`}>
                         <td className="px-6 py-4 print:hidden">
                           {item.requested > 0 && (
                             <button className="p-1 rounded bg-zinc-800/50 text-zinc-400 hover:text-zinc-200 cursor-pointer">
                               {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                             </button>
                           )}
                         </td>
                         <td className="px-6 py-4 print:px-2">
                            <p className="text-sm font-semibold text-zinc-100 print:text-black">{item.nome}</p>
                            <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mt-0.5 break-all line-clamp-1 w-64 text-ellipsis print:text-gray-600 print:w-auto">REF: {item.codigo_barras || String(item.id).substring(0,6)}</p>
                         </td>
                         <td className="px-4 py-4 text-center print:px-2">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-sm font-semibold text-zinc-100 tabular-nums print:bg-transparent print:border-none print:text-black">
                              {item.stock_armazem.toFixed(item.stock_armazem % 1 !== 0 ? 2 : 0)} <span className="text-[10px] font-medium text-zinc-500 uppercase">{item.unidade_base}</span>
                            </span>
                         </td>
                         <td className="px-4 py-4 text-center print:px-2">
                            {item.requested > 0 ? (
                               <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-sm font-semibold tabular-nums print:bg-transparent print:text-black ${isMissing ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 print:border-none' : 'bg-zinc-900 text-zinc-300 border-zinc-700 print:border-none'}`}>
                                 {item.requested.toFixed(item.requested % 1 !== 0 ? 2 : 0)} <span className="text-[10px] font-medium uppercase">{item.unidade_base}</span>
                               </span>
                            ) : (
                                <span className="text-sm text-zinc-500 print:text-black">-</span>
                            )}
                         </td>
                         <td className="px-6 py-4 text-right print:px-2">
                            <div className="flex flex-col items-end">
                               <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-bold tabular-nums print:border-none ${item.diff < 0 ? 'bg-rose-500/10 text-rose-500 border-rose-500/20 print:text-red-700 print:bg-transparent' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 print:text-green-700 print:bg-transparent'}`}>
                                 {item.diff < 0 ? <TrendingDown className="w-4 h-4 print:hidden" /> : <TrendingUp className="w-4 h-4 print:hidden" />}
                                 {Math.abs(item.diff).toFixed(item.diff % 1 !== 0 ? 2 : 0)}
                               </div>
                               {isMissing && (
                                  <div className="flex flex-col items-end gap-1 mt-1.5">
                                     <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider flex items-center gap-1 print:text-red-700">
                                        <AlertCircle className="w-3 h-3 print:hidden" /> Faltam {Math.abs(item.diff).toFixed(item.diff % 1 !== 0 ? 2 : 0)} {item.unidade_base}
                                     </p>
                                     {aproxText && (
                                        <p className="text-[10px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1">
                                           {aproxText}
                                        </p>
                                     )}
                                  </div>
                               )}
                               {!isMissing && item.requested > 0 && (
                                  <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mt-1.5 flex items-center gap-1 print:hidden">
                                     <CheckCircle2 className="w-3 h-3" /> Stock Ok
                                  </p>
                               )}
                            </div>
                         </td>
                      </tr>
                      {isExpanded && item.orders.length > 0 && (
                         <tr>
                           <td colSpan={5} className="p-0 border-b border-zinc-800/50 bg-zinc-900/30 print:bg-white print:border-gray-200">
                              <div className="px-12 py-4 shadow-inner border-y border-zinc-800/50 print:shadow-none print:border-none print:px-4">
                                <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2 mb-3 print:text-black">
                                   <Store className="w-3.5 h-3.5 print:hidden" /> Detalhe de Pedidos das Lojas
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 print:grid-cols-2">
                                   {item.orders.map((o: any, idx: number) => (
                                      <div key={`${o.orderId}-${idx}`} className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 flex items-center justify-between print:border-gray-200 print:bg-gray-50">
                                         <div>
                                            <p className="text-sm font-semibold text-zinc-200 print:text-black">{o.storeName}</p>
                                            <p className="text-[10px] text-zinc-500 mt-0.5 flex items-center gap-1"><Clock className="w-3 h-3 print:hidden"/> {new Date(o.date).toLocaleDateString()}</p>
                                         </div>
                                         <div className="text-right">
                                            <p className="text-sm font-bold text-amber-500 tabular-nums print:text-black">{o.displayQty.toFixed(o.displayQty % 1 !== 0 ? 2 : 0)} <span className="text-[10px] uppercase text-zinc-500 print:text-gray-600">{o.originalUnit}</span></p>
                                            {o.originalUnit !== item.unidade_base && (
                                               <p className="text-[10px] text-zinc-500 print:text-gray-500">={o.requestedQty.toFixed(o.requestedQty % 1 !== 0 ? 2 : 0)} {item.unidade_base}</p>
                                            )}
                                         </div>
                                      </div>
                                   ))}
                                </div>
                                {isMissing && (
                                  <div className="mt-4 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 flex gap-3 print:bg-red-50 print:border-red-200">
                                     <AlertCircle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5 print:text-red-600" />
                                     <div>
                                        <p className="text-xs font-semibold text-orange-400 print:text-red-700">Atenção na Separação</p>
                                        <p className="text-[10px] text-orange-400/80 mt-0.5 print:text-red-800">O stock atual de {item.stock_armazem.toFixed(item.stock_armazem % 1 !== 0 ? 2 : 0)} {item.unidade_base} não é suficiente para os pedidos ({item.requested.toFixed(item.requested % 1 !== 0 ? 2 : 0)} {item.unidade_base}). Será necessário reajustar a quantidade na separação.</p>
                                     </div>
                                  </div>
                                )}
                              </div>
                           </td>
                         </tr>
                      )}
                    </React.Fragment>
                  )})}
               </tbody>
            </table>
          )}
        </div>
      </div>

    </div>
  );
}

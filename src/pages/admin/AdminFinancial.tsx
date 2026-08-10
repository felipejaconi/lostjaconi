import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  Banknote, TrendingDown, TrendingUp, Search, Plus, Filter, 
  FileText, CheckCircle2, Clock, Calendar, AlertCircle, Building2,
  ChevronRight, CreditCard, ArrowUpRight, ArrowDownRight, Wallet, Receipt, Store, ShoppingCart, LayoutDashboard
} from "lucide-react";
import Swal from "sweetalert2";
import api from "../../lib/api";
import { clsx, type ClassValue } from "clsx";
import { Modal } from "../../components/ui/Modal";
import { BrandTitle } from "../../components/BrandTitle";
import AdminReports from "./AdminReports";
import AdminExpenseEntries from "./AdminExpenseEntries";
import { useAuth } from "../../context/AuthContext";
import { useSearchParams } from "react-router-dom";
import { twMerge } from "tailwind-merge";
import Decimal from "decimal.js";

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function getPedidoTotalComIva(pedido: any): number {
  let sumSubtotal = 0;
  let sumIva = 0;
  (pedido.pedido_itens || []).forEach((item: any) => {
    const qty = Number(item.quantidade) || 0;
    const preco = Number(item.preco_unitario || 0);
    const liq = qty * preco;
    const ivaPerc = Number(item.produto?.iva || 0);
    const ivaVal = liq * (ivaPerc / 100);
    sumSubtotal += liq;
    sumIva += ivaVal;
  });
  return sumSubtotal + sumIva;
}

function getPedidoTotalIva(pedido: any): number {
  let sumIva = 0;
  (pedido.pedido_itens || []).forEach((item: any) => {
    const qty = Number(item.quantidade) || 0;
    const preco = Number(item.preco_unitario || 0);
    const liq = qty * preco;
    const ivaPerc = Number(item.produto?.iva || 0);
    sumIva += liq * (ivaPerc / 100);
  });
  return sumIva;
}


export default function AdminFinancial() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const isArmazem = user?.role === "armazem";
  const [faturas, setFaturas] = useState<any[]>([]);
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<"dashboard" | "faturas" | "fornecedores" | "despesas" | "relatorios">(() => {
    if (searchParams.get("tab") === "faturas") return "faturas";
    if (user?.role === "armazem") return "faturas";
    return "dashboard";
  });
  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState("todos");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [selectedStore, setSelectedStore] = useState<any>(null);
  const [selectedFatura, setSelectedFatura] = useState<any>(null);

  const [payFormData, setPayFormData] = useState({ valor: "", data_pagamento: new Date().toISOString().split("T")[0], metodo: "transferencia" });

  const [filterDataAPagar, setFilterDataAPagar] = useState({
    periodo: "todos",
    status: "todos",
    fornecedor: "todos",
    loja: "todos"
  });

  const [filterDataAReceber, setFilterDataAReceber] = useState({
    periodo: "todos",
    status: "todos",
    loja: "todos"
  });

  const [formData, setFormData] = useState({
    numero_fatura: "",
    fornecedor_id: "",
    tipo: "despesa", 
    valor_total: "",
    data_emissao: new Date().toISOString().split("T")[0],
    data_vencimento: ""
  });

  const [pedidos, setPedidos] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);

  const [displayCountFaturas, setDisplayCountFaturas] = useState<number>(30);
  const [displayCountReceber, setDisplayCountReceber] = useState<number>(30);
  
  const observerFaturasRef = useRef<IntersectionObserver | null>(null);
  const loadMoreFaturasRef = React.useCallback((node: HTMLDivElement | null) => {
    if (observerFaturasRef.current) observerFaturasRef.current.disconnect();
    if (node) {
      observerFaturasRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          setDisplayCountFaturas(c => c + 30);
        }
      }, { threshold: 0.1 });
      observerFaturasRef.current.observe(node);
    }
  }, []);

  const observerReceberRef = useRef<IntersectionObserver | null>(null);
  const loadMoreReceberRef = React.useCallback((node: HTMLDivElement | null) => {
    if (observerReceberRef.current) observerReceberRef.current.disconnect();
    if (node) {
      observerReceberRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          setDisplayCountReceber(c => c + 30);
        }
      }, { threshold: 0.1 });
      observerReceberRef.current.observe(node);
    }
  }, []);

  useEffect(() => {
    fetchDados();
  }, []);

  useEffect(() => {
    if (searchParams.get("tab") === "faturas") {
      setActiveTab("faturas");
    }
  }, [searchParams]);


  const fetchDados = async () => {
    try {
      setIsLoading(true);
      const [fatRes, fornRes, pedRes, usersRes] = await Promise.all([
         api.get("/admin/faturas").catch(() => ({ data: [] })),
         api.get("/admin/fornecedores").catch(() => ({ data: [] })),
         api.get("/pedidos").catch(() => ({ data: [] })),
         api.get("/admin/users").catch(() => ({ data: [] }))
      ]);
      setFaturas(fatRes.data);
      setFornecedores(fornRes.data);
      setPedidos(pedRes.data || []);
      setStores((usersRes.data || []).filter((u: any) => u.role === 'loja').sort((a: any, b: any) => (a.name || "").localeCompare(b.name || "")));
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarcarRecebido = async (pedido: any) => {
    try {
      await api.put(`/pedidos/${pedido.id}/status`, { status: "concluido" });
      Swal.fire("Sucesso", "Pagamento recebido e pedido concluído.", "success");
      fetchDados();
    } catch (err: any) {
      Swal.fire("Erro", err.message || "Falha ao registrar recebimento", "error");
    }
  };

  const handleReverterRecebido = async (pedido: any) => {
    try {
      const { isConfirmed } = await Swal.fire({
        title: "Reverter Recebimento?",
        text: `Deseja reverter o recebimento de € ${getPedidoTotalComIva(pedido).toFixed(2)} da loja ${pedido.loja_nome || 'Desconhecida'}? O status voltará para 'A Receber'.`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#f59e0b",
        cancelButtonColor: "#3f3f46",
        confirmButtonText: "Sim, Reverter"
      });

      if (!isConfirmed) return;

      await api.put(`/pedidos/${pedido.id}/status`, { status: "entregue" });
      Swal.fire("Sucesso", "Recebimento revertido.", "success");
      fetchDados();
    } catch (err: any) {
      Swal.fire("Erro", err.message || "Falha ao reverter recebimento", "error");
    }
  };

  const handleCreateDespesa = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
         ...formData,
         valor_total: Number(formData.valor_total),
         valor_pendente: Number(formData.valor_total),
         status_pagamento: "pendente"
      };
      await api.post("/admin/faturas", payload);
      Swal.fire({
         title: 'Sucesso',
         text: 'Despesa registada com sucesso',
         icon: 'success',
         background: '#18181b', color: '#f4f4f5',
         confirmButtonColor: '#10b981'
      });
      setIsModalOpen(false);
      fetchDados();
    } catch(err: any) {
      Swal.fire({
         title: 'Erro',
         text: err.response?.data?.error || "Erro ao registrar despesa",
         icon: 'error',
         background: '#18181b', color: '#f4f4f5'
      });
    }
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/admin/faturas/${selectedFatura.id}/pagar`, payFormData);
      Swal.fire({
         title: 'Sucesso',
         text: 'Pagamento registado',
         icon: 'success',
         background: '#18181b', color: '#f4f4f5',
         confirmButtonColor: '#10b981'
      });
      setIsPayModalOpen(false);
      fetchDados();
    } catch(err: any) {
      Swal.fire({
         title: 'Erro',
         text: err.response?.data?.error || "Erro ao efetuar pagamento",
         icon: 'error',
         background: '#18181b', color: '#f4f4f5'
      });
    }
  };

  const stats = useMemo(() => {
     let totalCompras = new Decimal(0);
     let totalDespesas = new Decimal(0);
     let totalPendente = new Decimal(0);
     let totalVencido = new Decimal(0);
     let totalIvaCredito = new Decimal(0);
     let totalIvaDebito = new Decimal(0);
     let totalReceber = new Decimal(0);
     const expiringBills: any[] = [];
     const fornecedorStats: Record<string, { id: string; nome: string; nif: string; tipo: string; total: Decimal }> = {};
     
     const today = new Date();
     const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

     faturas.forEach(f => {
        const val = new Decimal(f.valor_total || 0);
        const pend = new Decimal(f.valor_pendente || 0);
        
        if (f.tipo === 'compra') totalCompras = totalCompras.add(val);
        else if (f.tipo?.startsWith('despesa')) totalDespesas = totalDespesas.add(val);
        
        totalPendente = totalPendente.add(pend);

        // Agrupar gastos por fornecedor
        const fornId = f.fornecedor_id;
        if (fornId && f.fornecedor) {
           if (!fornecedorStats[fornId]) {
              fornecedorStats[fornId] = {
                 id: fornId,
                 nome: f.fornecedor.nome || "-",
                 nif: f.fornecedor.nif || "-",
                 tipo: f.fornecedor.tipo || "-",
                 total: new Decimal(0)
              };
           }
           fornecedorStats[fornId].total = fornecedorStats[fornId].total.add(val);
        }

        // Calculate IVA (Priorizar coluna de alta precisão valor_iva na própria fatura se existir)
        const invoiceDate = new Date(f.data_emissao);
        const isCurrentMonth = invoiceDate.getMonth() === today.getMonth() && invoiceDate.getFullYear() === today.getFullYear();
        
        if (isCurrentMonth) {
           if (f.valor_iva !== undefined && f.valor_iva !== null) {
               totalIvaCredito = totalIvaCredito.add(new Decimal(f.valor_iva));
           } else if (f.fatura_itens && f.fatura_itens.length > 0) {
              f.fatura_itens.forEach((item: any) => {
                 if (item.valor_iva !== undefined && item.valor_iva !== null && item.valor_liquido !== undefined && item.valor_liquido !== null) {
                     const ivaNat = new Decimal(item.valor_iva || 0);
                     totalIvaCredito = totalIvaCredito.add(ivaNat);
                 } else {
                     const q = new Decimal(item.quantidade || 0);
                     const c = new Decimal(item.preco_custo || item.preco_unitario || 0);
                     const liq = q.mul(c);
                     const iva = new Decimal(item.iva !== undefined ? item.iva : (item.produto?.iva || 0));
                     totalIvaCredito = totalIvaCredito.add(liq.mul(iva).div(100));
                 }
              });
           }
        }

        // Expiring bills check
        if (pend.greaterThan(0)) {
           let isOverdue = false;
           const t = new Date();
           t.setHours(0, 0, 0, 0);
           if (f.data_vencimento) {
              const vDate = new Date(f.data_vencimento);
              vDate.setHours(0, 0, 0, 0);
              if (vDate < t) isOverdue = true;
           } else if (f.data_emissao) {
              const eDate = new Date(f.data_emissao);
              eDate.setHours(0, 0, 0, 0);
              if (eDate < t) isOverdue = true;
           }
           if (isOverdue) {
              totalVencido = totalVencido.add(pend);
           }
           
           if (f.data_vencimento) {
              const vDate = new Date(f.data_vencimento);
              if (vDate <= nextWeek) {
                 expiringBills.push(f);
              }
           }
        }
     });

     pedidos.forEach(p => {
        const isUnpaid = ['pronto', 'entregue'].includes(p.status?.toLowerCase());
        const isValidOrder = ['pronto', 'entregue', 'concluido'].includes(p.status?.toLowerCase());
        
        if (isUnpaid) {
           totalReceber = totalReceber.add(new Decimal(getPedidoTotalComIva(p) || 0));
        }
        
        if (isValidOrder) {
           const pDate = p.created_at ? new Date(p.created_at) : new Date();
           if (pDate.getMonth() === today.getMonth() && pDate.getFullYear() === today.getFullYear()) {
              totalIvaDebito = totalIvaDebito.add(new Decimal(getPedidoTotalIva(p) || 0));
           }
        }
     });

     const topFornecedoresList = Object.values(fornecedorStats)
         .map(t => ({ ...t, total: t.total.toNumber() }))
         .sort((a, b) => b.total - a.total);

     return {
        totalCompras: totalCompras.toNumber(),
        totalDespesas: totalDespesas.toNumber(),
        totalPendente: totalPendente.toNumber(),
        totalVencido: totalVencido.toNumber(),
        totalIvaCredito: totalIvaCredito.toNumber(),
        totalIvaDebito: totalIvaDebito.toNumber(),
        totalReceber: totalReceber.toNumber(),
        topFornecedores: topFornecedoresList,
        expiringBills: expiringBills.sort((a, b) => new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime())
     };
  }, [faturas, pedidos]);

  const getVencimentoText = (dateString: string, statusPagamento: string) => {
    if (!dateString || statusPagamento === 'pago') return null;
    const venc = new Date(dateString);
    venc.setHours(0,0,0,0);
    const today = new Date();
    today.setHours(0,0,0,0);
    const diffTime = venc.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return <span className="text-[10px] font-bold text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded ml-1">Vencida há {Math.abs(diffDays)} dia(s)</span>;
    if (diffDays === 0) return <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded ml-1">Vence hoje</span>;
    return <span className="text-[10px] font-bold text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded ml-1">{diffDays} dia(s)</span>;
  };

  const filterByPeriod = (dateString: string | null | undefined, period: string) => {
    if (period === "todos" || !dateString) return true;
    const date = new Date(dateString);
    const now = new Date();
    
    if (period === "semana") {
      const today = new Date();
      const firstDay = new Date(today.setDate(today.getDate() - today.getDay()));
      const lastDay = new Date(today.setDate(today.getDate() - today.getDay() + 6));
      return date >= firstDay && date <= lastDay;
    }
    if (period === "mes") {
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }
    if (period === "ano") {
      return date.getFullYear() === now.getFullYear();
    }
    return true;
  };

  const filteredFaturas = faturas.filter(f => {
    const textMatch = (f.numero_fatura || "").toLowerCase().includes(search.toLowerCase()) || 
                      (f.fornecedor?.nome || "").toLowerCase().includes(search.toLowerCase());
    let tipoMatch = true;
    if (activeTab === 'faturas') {
       if (filterTipo === 'todos') {
          tipoMatch = f.tipo === 'compra' || f.tipo?.startsWith('despesa');
       } else if (filterTipo === 'despesa') {
          tipoMatch = f.tipo?.startsWith('despesa');
       } else {
          tipoMatch = f.tipo === filterTipo;
       }
    }
    const periodMatch = filterByPeriod(f.data_emissao, filterDataAPagar.periodo);
    
    let statusMatch = true;
    if (filterDataAPagar.status !== "todos") {
       if (filterDataAPagar.status === "pago") statusMatch = f.status_pagamento === "pago";
       if (filterDataAPagar.status === "nao_pago") statusMatch = ["pendente", "parcial"].includes(f.status_pagamento || 'pendente');
    }
    
    const fornecedorMatch = filterDataAPagar.fornecedor === "todos" || String(f.fornecedor_id) === filterDataAPagar.fornecedor;
    
    let lojaMatch = true;
    if (filterDataAPagar.loja !== "todos") {
       if (filterDataAPagar.loja === "armazem") {
          let isArmazemDespesa = false;
          if (f.tipo?.startsWith('despesa')) {
             if (!f.descrição || f.descrição === "null") {
                isArmazemDespesa = true;
             } else {
                const descString = (f.descrição || "").toLowerCase();
                const fornecedorNome = (f.fornecedor?.nome || "").toLowerCase();
                if (descString.includes("armazem central") || descString.includes("armazém central") || fornecedorNome.includes("armazem central") || fornecedorNome.includes("armazém central")) {
                   isArmazemDespesa = true;
                }
             }
          }
          lojaMatch = f.tipo === 'compra' || isArmazemDespesa;
       } else {
          try {
             if (f.descrição && f.descrição !== "null") {
                const desc = JSON.parse(f.descrição);
                lojaMatch = String(desc.loja_id) === filterDataAPagar.loja;
             } else {
                lojaMatch = false;
             }
          } catch(e) {
             lojaMatch = false;
          }
       }
    }
    
    return textMatch && tipoMatch && periodMatch && statusMatch && fornecedorMatch && lojaMatch;
  });

  const faturasReceber = pedidos.filter(p => {
    const isReceberBase = ['pronto', 'entregue', 'concluido'].includes(p.status?.toLowerCase());
    const textMatch = (p.loja_nome || "").toLowerCase().includes(search.toLowerCase());
    const periodMatch = filterByPeriod(p.created_at, filterDataAReceber.periodo);
    
    let statusMatch = true;
    if (filterDataAReceber.status !== "todos") {
       if (filterDataAReceber.status === "pago") statusMatch = p.status?.toLowerCase() === "concluido";
       if (filterDataAReceber.status === "nao_pago") statusMatch = ['pronto', 'entregue'].includes(p.status?.toLowerCase());
    }
    
    const lojaMatch = filterDataAReceber.loja === "todos" || String(p.user_id) === filterDataAReceber.loja;
    
    return isReceberBase && textMatch && periodMatch && statusMatch && lojaMatch;
  });

  return (
    <div className="">
      
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#050505] pt-2 md:pt-4 pb-2 -mt-2 md:-mt-4 mb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <BrandTitle title="Financeiro" titleClassName="max-md:mt-0 md:-mt-4 max-md:pl-0 max-md:pt-0 max-md:ml-0" hideUnderline />
           
                {!isArmazem && (
              <div className="flex bg-[#0a0a0a] p-1.5 rounded-2xl border border-white/5 w-full sm:w-auto overflow-x-auto no-scrollbar gap-1 shadow-inner">
              <button 
                 onClick={() => setActiveTab("dashboard")}
                 className={`shrink-0 sm:flex-none px-4 sm:px-5 py-2.5 text-xs flex items-center justify-center gap-2 font-bold uppercase tracking-wider rounded-xl transition-all duration-300 whitespace-nowrap ${
                    activeTab === "dashboard" ? "bg-amber-500 text-black shadow-[0_0_20px_-5px_rgba(245,158,11,0.4)]" : "text-zinc-400 hover:text-amber-400 hover:bg-white/5"
                 }`}
              >
                 <LayoutDashboard size={14} className={activeTab === "dashboard" ? "text-black" : ""} />
                 Dashboard
              </button>
              <button 
                 onClick={() => setActiveTab("faturas")}
                 className={`shrink-0 sm:flex-none px-4 sm:px-5 py-2.5 text-xs flex items-center justify-center gap-2 font-bold uppercase tracking-wider rounded-xl transition-all duration-300 whitespace-nowrap ${
                    activeTab === "faturas" ? "bg-rose-500 text-white shadow-[0_0_20px_-5px_rgba(243,24,104,0.4)]" : "text-zinc-400 hover:text-rose-400 hover:bg-white/5"
                 }`}
              >
                 <Receipt size={14} />
                 Faturas a Pagar
              </button>
              <button 
                 onClick={() => setActiveTab("fornecedores")}
                 className={`shrink-0 sm:flex-none px-4 sm:px-5 py-2.5 text-xs flex items-center justify-center gap-2 font-bold uppercase tracking-wider rounded-xl transition-all duration-300 whitespace-nowrap ${
                    activeTab === "fornecedores" ? "bg-blue-500 text-white shadow-[0_0_20px_-5px_rgba(59,130,246,0.4)]" : "text-zinc-400 hover:text-blue-400 hover:bg-white/5"
                 }`}
              >
                 <ShoppingCart size={14} />
                 Faturas a Receber
              </button>
              <button 
                  onClick={() => setActiveTab("relatorios")}
                 className={`shrink-0 sm:flex-none px-4 sm:px-5 py-2.5 text-xs flex items-center justify-center gap-2 font-bold uppercase tracking-wider rounded-xl transition-all duration-300 whitespace-nowrap ${
                    activeTab === "relatorios" ? "bg-emerald-500 text-black shadow-[0_0_20px_-5px_rgba(16,185,129,0.4)]" : "text-zinc-400 hover:text-emerald-400 hover:bg-white/5"
                 }`}
              >
                 <FileText size={14} className={activeTab === "relatorios" ? "text-black" : ""} />
                 Relatórios
              </button>
           </div>
           )}
        <div className="flex items-center gap-3">
        </div>
      </div>


      {/* Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
         {isLoading ? (
            <div className="flex items-center justify-center h-64 w-full">
               <img src={`${import.meta.env.VITE_SUPABASE_URL || "https://ybaoaskddcmwoincsnwm.supabase.co"}/storage/v1/object/public/uploads/icon.png`} alt="Carregando..." className="w-8 h-8 animate-spin opacity-80" />
            </div>
         ) : (
            <>

         {activeTab === "relatorios" && (
            <div className="mt-6"><AdminReports embedded={true} /></div>
         )}
         
         {activeTab === "dashboard" && (
            <div className="space-y-6 mt-6">
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
                  {/* 1. Compras Stock */}
                  <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 shadow-sm">
                     <div className="flex items-center justify-between mb-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20">
                           <Banknote className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1"><ArrowUpRight className="w-3 h-3 text-blue-500" /> Stock</span>
                     </div>
                     <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-1">Compras (Stock)</p>
                     <p className="text-xl font-bold text-zinc-100">€ {stats.totalCompras.toLocaleString('pt-PT', {minimumFractionDigits:2})}</p>
                  </div>

                  {/* 2. Contas a Pagar */}
                  <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 shadow-sm">
                     <div className="flex items-center justify-between mb-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20">
                           <Clock className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded">Pendente</span>
                     </div>
                     <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-1">Contas a Pagar</p>
                     <p className="text-xl font-bold text-amber-500">€ {stats.totalPendente.toLocaleString('pt-PT', {minimumFractionDigits:2})}</p>
                  </div>
                  
                  {/* 2.5 Contas Vencidas */}
                  <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 shadow-sm relative overflow-hidden group">
                     <div className="flex items-center justify-between mb-3 relative z-10">
                        <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-500 border border-rose-500/20">
                           <AlertCircle className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded">Atrasado</span>
                     </div>
                     <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-1 relative z-10">Contas Vencidas</p>
                     <p className="text-xl font-bold text-rose-500 relative z-10">€ {stats.totalVencido.toLocaleString('pt-PT', {minimumFractionDigits:2})}</p>
                     <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-rose-500/5 blur-2xl rounded-full group-hover:bg-rose-500/10 transition-colors"></div>
                  </div>

                  {/* 3. Credito IVA */}
                  <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 shadow-sm relative overflow-hidden group">
                     <div className="flex items-center justify-between mb-3 relative z-10">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                           <Receipt className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">Recuperável</span>
                     </div>
                     <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-1 relative z-10">Crédito IVA (Compras)</p>
                     <p className="text-xl font-bold text-emerald-400 relative z-10">€ {stats.totalIvaCredito.toLocaleString('pt-PT', {minimumFractionDigits:2})}</p>
                     <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-emerald-500/5 blur-2xl rounded-full group-hover:bg-emerald-500/10 transition-colors"></div>
                  </div>

                  {/* 3.5. Debito IVA */}
                  <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 shadow-sm relative overflow-hidden group">
                     <div className="flex items-center justify-between mb-3 relative z-10">
                        <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-500 border border-rose-500/20">
                           <Receipt className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded">A Pagar (Vendas)</span>
                     </div>
                     <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-1 relative z-10">Débito de IVA</p>
                     <p className="text-xl font-bold text-rose-400 relative z-10">€ {stats.totalIvaDebito.toLocaleString('pt-PT', {minimumFractionDigits:2})}</p>
                     <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-rose-500/5 blur-2xl rounded-full group-hover:bg-rose-500/10 transition-colors"></div>
                  </div>

                  {/* 4. Despesas e Custos */}
                  <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 shadow-sm">
                     <div className="flex items-center justify-between mb-3">
                        <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-500 border border-rose-500/20">
                           <TrendingDown className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1"><ArrowDownRight className="w-3 h-3 text-rose-500" /> Operacional</span>
                     </div>
                     <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-1">Despesas / Custos</p>
                     <p className="text-xl font-bold text-zinc-100">€ {stats.totalDespesas.toLocaleString('pt-PT', {minimumFractionDigits:2})}</p>
                  </div>

                  {/* 5. Contas a Receber */}
                  <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 shadow-sm">
                     <div className="flex items-center justify-between mb-3">
                        <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-300 border border-zinc-700">
                           <Store className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded">A Receber</span>
                     </div>
                     <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-1">Contas a Receber</p>
                     <p className="text-xl font-bold text-zinc-100">€ {stats.totalReceber.toLocaleString('pt-PT', {minimumFractionDigits:2})}</p>
                  </div>
               </div>

               {/* Alertas */}
               <div className="grid grid-cols-1 gap-6">                  {/* Lojas Gestão */}
                  <div className="bg-zinc-950 border border-zinc-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                     <div className="p-5 border-b border-zinc-800">
                        <h3 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
                           <Store className="w-4 h-4 text-amber-500" /> Gestão por Loja
                        </h3>
                     </div>
                     <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {stores.map(store => (
                           <div key={store.id} className="relative group bg-[#0a0a0a] border border-amber-500/30 rounded-2xl p-5 transition-all duration-300 shadow-[0_0_30px_-5px_rgba(245,158,11,0.1)] flex flex-col justify-between overflow-hidden">
                              <div className="absolute top-0 right-0 p-4 opacity-10">
                                 <Store className="w-16 h-16 text-amber-500 transform rotate-12" />
                              </div>
                              
                              <div className="relative z-10 flex-1 mt-2 mb-6 flex items-center justify-center">
                                 <h4 className="text-xl text-center text-[#facc15] tracking-wider leading-tight" style={{ fontFamily: "'Yellowtail', cursive", textShadow: "2px 2px 4px rgba(0,0,0,0.5)" }} title={store.name}>
                                    {store.name}
                                 </h4>
                              </div>
                              
                              <div className="relative z-10 grid grid-cols-3 gap-2">
                                 <button 
                                    onClick={() => { setSelectedStore(store); setIsStoreModalOpen(true); }}
                                    className="flex flex-col items-center justify-center gap-1.5 py-2.5 px-1 bg-white/5 hover:bg-amber-500/10 text-zinc-400 hover:text-amber-400 rounded-xl transition-colors border border-white/5 hover:border-amber-500/20 group/btn"
                                    title="Nova Despesa"
                                 >
                                    <Plus size={14} className="group-hover/btn:scale-110 transition-transform" />
                                    <span className="text-[9px] font-bold uppercase tracking-wider">Nova</span>
                                 </button>
                                 <button 
                                    onClick={() => { 
                                       setActiveTab("fornecedores");
                                       setFilterDataAReceber({...filterDataAReceber, loja: String(store.id)});
                                    }}
                                    className="flex flex-col items-center justify-center gap-1.5 py-2.5 px-1 bg-white/5 hover:bg-blue-500/10 text-zinc-400 hover:text-blue-400 rounded-xl transition-colors border border-white/5 hover:border-blue-500/20 group/btn"
                                    title="Compras"
                                 >
                                    <ShoppingCart size={14} className="group-hover/btn:scale-110 transition-transform" />
                                    <span className="text-[9px] font-bold uppercase tracking-wider">Compras</span>
                                 </button>
                                 <button 
                                    onClick={() => { 
                                       setActiveTab("faturas");
                                       setFilterTipo("despesa");
                                       setFilterDataAPagar({...filterDataAPagar, loja: String(store.id)});
                                    }}
                                    className="flex flex-col items-center justify-center gap-1.5 py-2.5 px-1 bg-white/5 hover:bg-rose-500/10 text-zinc-400 hover:text-rose-400 rounded-xl transition-colors border border-white/5 hover:border-rose-500/20 group/btn"
                                    title="Despesas"
                                 >
                                    <Receipt size={14} className="group-hover/btn:scale-110 transition-transform" />
                                    <span className="text-[9px] font-bold uppercase tracking-wider">Despesas</span>
                                 </button>
                              </div>
                           </div>
                        ))}
                        {stores.length === 0 && (
                           <div className="col-span-full text-center p-8">
                              <p className="text-sm text-zinc-500">Nenhuma loja encontrada.</p>
                           </div>
                        )}
                     </div>
                  </div>

               </div>
            </div>
         )}


         {activeTab === "faturas" && (
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl shadow-sm flex flex-col h-full min-h-[500px]">
               <div className="sticky top-[calc(66.63px-1px)] md:top-[calc(66.63px-1px)] z-30 p-2 sm:p-3 border-b border-zinc-800 flex flex-col xl:flex-row gap-4 justify-between items-center bg-zinc-950 mt-[67px]">
                  <div className="relative w-full sm:w-80">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                     <input
                       type="text"
                       placeholder="Pesquisar fatura ou fornecedor..."
                       value={search}
                       onChange={(e) => setSearch(e.target.value)}
                       className="w-full pl-9 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 focus:border-zinc-600 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition-colors"
                     />
                  </div>
                  <div className="flex flex-nowrap sm:flex-wrap items-center gap-2 w-full sm:w-auto overflow-x-auto no-scrollbar pb-1 sm:pb-0">
                     <div className="flex items-center gap-2 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg shrink-0">
                        <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)} className="bg-transparent text-sm text-zinc-300 outline-none appearance-none">
                           <option value="todos">Todos os Tipos</option>
                           <option value="compra">Compras (Stock)</option>
                           <option value="despesa">Despesas</option>
                        </select>
                     </div>
                     <div className="flex items-center gap-2 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg shrink-0">
                        <select value={filterDataAPagar.periodo} onChange={e => setFilterDataAPagar({...filterDataAPagar, periodo: e.target.value})} className="bg-transparent text-sm text-zinc-300 outline-none appearance-none">
                           <option value="todos">Todo o período</option>
                           <option value="semana">Esta Semana</option>
                           <option value="mes">Este Mês</option>
                           <option value="ano">Este Ano</option>
                        </select>
                     </div>
                     <div className="flex items-center gap-2 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg shrink-0">
                        <select value={filterDataAPagar.status} onChange={e => setFilterDataAPagar({...filterDataAPagar, status: e.target.value})} className="bg-transparent text-sm text-zinc-300 outline-none appearance-none">
                           <option value="todos">Todos os Status</option>
                           <option value="pago">Pagos</option>
                           <option value="nao_pago">Pendentes / Parciais</option>
                        </select>
                     </div>
                     <div className="flex items-center gap-2 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg shrink-0">
                        <select value={filterDataAPagar.fornecedor} onChange={e => setFilterDataAPagar({...filterDataAPagar, fornecedor: e.target.value})} className="bg-transparent text-sm text-zinc-300 outline-none appearance-none max-w-[150px] truncate">
                           <option value="todos">Fornecedores</option>
                           {fornecedores.map(f => (
                              <option key={f.id} value={f.id}>{f.nome}</option>
                           ))}
                        </select>
                     </div>
                     <div className="flex items-center gap-2 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg shrink-0">
                        <select value={filterDataAPagar.loja} onChange={e => setFilterDataAPagar({...filterDataAPagar, loja: e.target.value})} className="bg-transparent text-sm text-zinc-300 outline-none appearance-none max-w-[150px] truncate">
                           <option value="todos">Todas Lojas</option>
                           <option value="armazem">Armazém Central</option>
                           {stores.map((s: any) => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                           ))}
                        </select>
                     </div>
                  </div>
               </div>
               
               <div className="flex-1 overflow-x-auto no-scrollbar">
                  <table className="w-full text-left min-w-[900px]">
                     <thead>
                        <tr className="bg-zinc-900/50 border-b border-zinc-800">
                           <th className="p-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Documento</th>
                           <th className="p-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Fornecedor</th>
                           <th className="p-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Datas</th>
                           <th className="p-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider text-right">Valor Total</th>
                           <th className="p-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider text-center">Estado</th>
                           <th className="p-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider text-right">Pendente</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-zinc-800/50">
                        {filteredFaturas.length === 0 ? (
                           <tr>
                              <td colSpan={6} className="p-10 text-center">
                                 <FileText className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                                 <p className="text-zinc-400 font-medium text-sm">Nenhuma fatura encontrada.</p>
                              </td>
                           </tr>
                        ) : (
                           filteredFaturas.slice(0, displayCountFaturas).map(f => (
                              <tr key={f.id} className="hover:bg-zinc-800/30 transition-colors cursor-pointer" onClick={() => { setSelectedFatura(f); setIsDetailsModalOpen(true); }}>
                                 <td className="p-4">
                                    <p className="text-sm font-bold text-zinc-100">{f.numero_fatura}</p>
                                    <p className={cn("text-[10px] font-bold uppercase tracking-wider mt-0.5", f.tipo === 'compra' ? "text-blue-500" : "text-rose-500")}>
                                       {f.tipo?.replace('despesa_', 'Despesa: ')}
                                    </p>
                                 </td>
                                 <td className="p-4">
                                    <p className="text-sm font-semibold text-zinc-300">{f.fornecedor?.nome}</p>
                                    <p className="text-[11px] text-zinc-500 uppercase mt-0.5">NIF: {f.fornecedor?.nif || "-"}</p>
                                    {(() => {
                                       try {
                                          if (f.descrição) {
                                             const desc = JSON.parse(f.descrição);
                                             if (desc.loja_id) {
                                                const s = stores.find((s: any) => String(s.id) === String(desc.loja_id));
                                                if (s) {
                                                   return <p className="text-[10px] font-bold text-amber-500 mt-1 uppercase tracking-wider">{s.name}</p>;
                                                }
                                             }
                                          }
                                       } catch(e) {}
                                       if (f.tipo?.startsWith('despesa')) {
                                          return <p className="text-[10px] font-bold text-blue-500 mt-1 uppercase tracking-wider">Armazém Central</p>;
                                       }
                                       return null;
                                    })()}
                                 </td>
                                 <td className="p-4 space-y-1 text-sm text-zinc-400">
                                    <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> <span className="text-[11px]">Em: {f.data_emissao}</span></div>
                                    {f.data_vencimento && (
                                       <div className="flex items-center gap-1.5 text-amber-500/80 flex-wrap">
                                          <Clock className="w-3.5 h-3.5" /> <span className="text-[11px]">Venc: {f.data_vencimento}</span>
                                          {getVencimentoText(f.data_vencimento, f.status_pagamento)}
                                       </div>
                                    )}
                                 </td>
                                 <td className="p-4 text-right">
                                    <span className="text-sm font-bold text-zinc-100">€ {Number(f.valor_total).toLocaleString('pt-PT', {minimumFractionDigits:2})}</span>
                                 </td>
                                 <td className="p-4 text-center">
                                    {f.status_pagamento === 'pago' ? (
                                       <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wider"><CheckCircle2 className="w-3 h-3" /> Pago</span>
                                    ) : f.status_pagamento === 'parcial' ? (
                                       <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[10px] font-bold uppercase tracking-wider"><Clock className="w-3 h-3" /> Parcial</span>
                                    ) : (
                                       <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-rose-500/10 text-rose-500 border border-rose-500/20 text-[10px] font-bold uppercase tracking-wider"><Clock className="w-3 h-3" /> Pendente</span>
                                    )}
                                 </td>
                                 <td className="p-4 text-right">
                                    <span className={cn("text-sm font-bold", Number(f.valor_pendente) > 0 ? "text-amber-500" : "text-zinc-500")}>
                                       € {Number(f.valor_pendente).toLocaleString('pt-PT', {minimumFractionDigits:2})}
                                    </span>
                                 </td>
                              </tr>
                           ))
                        )}
                     </tbody>
                  </table>
                  {filteredFaturas.length > displayCountFaturas && (
                    <div ref={loadMoreFaturasRef} className="w-full flex justify-center py-6">
                      <span className="px-6 py-3 text-zinc-500 font-medium tracking-tight text-sm">
                        Carregando mais itens...
                      </span>
                    </div>
                  )}
               </div>
            </div>
         )}


         {activeTab === "fornecedores" && (
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl shadow-sm flex flex-col h-full min-h-[500px]">
               <div className="sticky top-[calc(66.63px-1px)] md:top-[calc(66.63px-1px)] z-30 p-2 sm:p-3 border-b border-zinc-800 flex flex-col xl:flex-row gap-4 justify-between items-center bg-zinc-950 mt-[67px]">
                  <div className="relative w-full sm:w-80">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                     <input
                       type="text"
                       placeholder="Pesquisar loja..."
                       value={search}
                       onChange={(e) => setSearch(e.target.value)}
                       className="w-full pl-9 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 focus:border-zinc-600 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition-colors"
                     />
                  </div>
                  <div className="flex flex-nowrap sm:flex-wrap items-center gap-2 w-full sm:w-auto overflow-x-auto no-scrollbar pb-1 sm:pb-0">
                     <div className="flex items-center gap-2 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg shrink-0">
                        <Filter className="w-4 h-4 text-zinc-500" />
                        <select value={filterDataAReceber.periodo} onChange={e => setFilterDataAReceber({...filterDataAReceber, periodo: e.target.value})} className="bg-transparent text-sm text-zinc-300 outline-none appearance-none">
                           <option value="todos">Todo o período</option>
                           <option value="semana">Esta Semana</option>
                           <option value="mes">Este Mês</option>
                           <option value="ano">Este Ano</option>
                        </select>
                     </div>
                     <div className="flex items-center gap-2 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg shrink-0">
                        <select value={filterDataAReceber.status} onChange={e => setFilterDataAReceber({...filterDataAReceber, status: e.target.value})} className="bg-transparent text-sm text-zinc-300 outline-none appearance-none">
                           <option value="todos">Todos os Status</option>
                           <option value="pago">Recebidos</option>
                           <option value="nao_pago">A Receber</option>
                        </select>
                     </div>
                     <div className="flex items-center gap-2 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg shrink-0">
                        <select value={filterDataAReceber.loja} onChange={e => setFilterDataAReceber({...filterDataAReceber, loja: e.target.value})} className="bg-transparent text-sm text-zinc-300 outline-none appearance-none max-w-[150px] truncate">
                           <option value="todos">Todas as Lojas</option>
                           {stores.map(store => (
                              <option key={store.id} value={String(store.id)}>{store.name}</option>
                           ))}
                        </select>
                     </div>
                  </div>
               </div>
               
               <div className="flex-1 overflow-x-auto no-scrollbar">
                  <table className="w-full text-left min-w-[900px]">
                     <thead>
                        <tr className="bg-zinc-900/50 border-b border-zinc-800">
                           <th className="p-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Documento</th>
                           <th className="p-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Loja</th>
                           <th className="p-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Data</th>
                           <th className="p-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider text-right">Valor Total</th>
                           <th className="p-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider text-center">Estado</th>
                           <th className="p-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider text-right">Ação</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-zinc-800/50">
                        {faturasReceber.length === 0 ? (
                           <tr>
                              <td colSpan={6} className="p-10 text-center">
                                 <Banknote className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                                 <p className="text-zinc-400 font-medium text-sm">Nenhum valor pendente de recebimento.</p>
                              </td>
                           </tr>
                        ) : (
                           faturasReceber.slice(0, displayCountReceber).map((p: any) => (
                              <tr key={p.id} className="hover:bg-zinc-800/30 transition-colors">
                                 <td className="p-4">
                                    <p className="text-sm font-bold text-zinc-100">Pedido #{p.id.split('-')[0].toUpperCase()}</p>
                                 </td>
                                 <td className="p-4">
                                    <p className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                                       <Store className="w-4 h-4 text-amber-500" /> {p.loja_nome || 'Loja Desconhecida'}
                                    </p>
                                 </td>
                                 <td className="p-4">
                                    <p className="text-[11px] text-zinc-400 flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(p.created_at).toLocaleDateString('pt-PT')}</p>
                                 </td>
                                 <td className="p-4 text-right">
                                    <p className="text-sm font-black text-zinc-100">€{getPedidoTotalComIva(p).toFixed(2)}</p>
                                 </td>
                                 <td className="p-4 text-center">
                                    <span className={cn("inline-flex px-2 py-1 border text-[10px] font-bold uppercase tracking-wider rounded", p.status?.toLowerCase() === 'concluido' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20')}>
                                       {p.status?.toLowerCase() === 'concluido' ? 'Recebido' : 'A Receber'}
                                    </span>
                                 </td>
                                 <td className="p-4 text-right">
                                    {p.status?.toLowerCase() !== 'concluido' ? (
                                       <button 
                                          onClick={() => handleMarcarRecebido(p)}
                                          className="inline-flex py-1.5 px-3 bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold text-[10px] uppercase tracking-wider rounded-md transition-colors items-center justify-center gap-1.5"
                                       >
                                          <CheckCircle2 className="w-3.5 h-3.5" /> Marcar Recebido
                                       </button>
                                    ) : (
                                       <button 
                                          onClick={() => handleReverterRecebido(p)}
                                          className="inline-flex py-1.5 px-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 font-bold text-[10px] uppercase tracking-wider rounded-md transition-colors items-center justify-center gap-1.5"
                                       >
                                          <CheckCircle2 className="w-3.5 h-3.5" /> Pago (Reverter)
                                       </button>
                                    )}
                                 </td>
                              </tr>
                           ))
                        )}
                     </tbody>
                  </table>
               </div>
               {faturasReceber.length > displayCountReceber && (
                  <div ref={loadMoreReceberRef} className="w-full flex justify-center py-6">
                     <span className="px-6 py-3 text-zinc-500 font-medium tracking-tight text-sm">
                        Carregando mais itens...
                     </span>
                  </div>
               )}
            </div>
         )}
            </>
         )}
      </div>

      {/* Modal Despesa */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80  flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-950 rounded-2xl w-full max-w-lg border border-zinc-800 shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-zinc-800">
               <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2"><Plus className="w-4 h-4 text-blue-500" /> Nova Fatura/Despesa</h2>
               <p className="text-xs text-zinc-500 mt-1">Insira os detalhes do documento para criar uma despesa operacional manual.</p>
            </div>
            
            <form onSubmit={handleCreateDespesa} className="p-6 flex-1 space-y-4">
               <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wide mb-2">Fornecedor</label>
                  <select required value={formData.fornecedor_id} onChange={e => setFormData({...formData, fornecedor_id: e.target.value})} className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 focus:border-blue-500 focus:bg-zinc-950 rounded-xl text-zinc-100 outline-none text-sm appearance-none transition-colors">
                     <option value="">Selecione um fornecedor</option>
                     {fornecedores.filter(f => f.tipo === 'operacional').map(f => (
                        <option key={f.id} value={f.id}>{f.nome}</option>
                     ))}
                  </select>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                     <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wide mb-2">Nº Documento</label>
                     <input required type="text" value={formData.numero_fatura} onChange={e => setFormData({...formData, numero_fatura: e.target.value})} className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 focus:border-blue-500 focus:bg-zinc-950 rounded-xl text-zinc-100 outline-none text-sm transition-colors" />
                  </div>
                  <div>
                     <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wide mb-2">Valor Total (€)</label>
                     <input required type="number" step="0.01" min="0" value={formData.valor_total} onChange={e => setFormData({...formData, valor_total: e.target.value})} className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 focus:border-blue-500 focus:bg-zinc-950 rounded-xl text-zinc-100 outline-none font-bold text-sm transition-colors" />
                  </div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                     <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wide mb-2">Data Emissão</label>
                     <input required type="date" value={formData.data_emissao} onChange={e => setFormData({...formData, data_emissao: e.target.value})} className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 focus:border-blue-500 focus:bg-zinc-950 rounded-xl text-zinc-100 outline-none text-sm transition-colors" />
                  </div>
                  <div>
                     <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wide mb-2">Vencimento (Opç)</label>
                     <input type="date" value={formData.data_vencimento} onChange={e => setFormData({...formData, data_vencimento: e.target.value})} className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 focus:border-blue-500 focus:bg-zinc-950 rounded-xl text-zinc-100 outline-none text-sm transition-colors" />
                  </div>
               </div>
            </form>

            <div className="p-5 border-t border-zinc-800 bg-zinc-900/50 flex gap-4">
               <button onClick={() => setIsModalOpen(false)} type="button" className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-sm rounded-lg transition-colors">Cancelar</button>
               <button onClick={handleCreateDespesa} type="submit" className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-lg transition-colors">Confirmar Registo</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pagamento */}
      {isPayModalOpen && selectedFatura && (
        <div className="fixed inset-0 bg-black/80  flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-950 rounded-2xl w-full max-w-sm border border-zinc-800 shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-zinc-800">
               <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2"><CreditCard className="w-4 h-4 text-amber-500" /> Registar Pagamento</h2>
               <p className="text-xs text-zinc-500 mt-1">Quitação para fatura {selectedFatura.numero_fatura}</p>
            </div>
            
            <form onSubmit={handlePay} className="p-6 flex-1 space-y-4">
               <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wide mb-2">Valor a Pagar (€)</label>
                  <input required type="number" step="0.01" min="0" max={selectedFatura.valor_pendente} value={payFormData.valor} onChange={e => setPayFormData({...payFormData, valor: e.target.value})} className="w-full px-4 py-3 bg-zinc-900 border border-amber-500/50 focus:border-amber-400 focus:bg-zinc-950 rounded-xl text-amber-400 font-bold text-xl outline-none transition-colors" />
                  <p className="text-[11px] font-medium text-zinc-500 mt-2">Pendente: € {Number(selectedFatura.valor_pendente).toFixed(2)}</p>
               </div>
               <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wide mb-2">Data do Pagamento</label>
                  <input required type="date" value={payFormData.data_pagamento} onChange={e => setPayFormData({...payFormData, data_pagamento: e.target.value})} className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 focus:border-amber-500 focus:bg-zinc-950 rounded-xl text-zinc-100 outline-none text-sm transition-colors" />
               </div>
               <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wide mb-2">Método</label>
                  <select value={payFormData.metodo} onChange={e => setPayFormData({...payFormData, metodo: e.target.value})} className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 focus:border-amber-500 focus:bg-zinc-950 rounded-xl text-zinc-100 outline-none text-sm appearance-none transition-colors">
                     <option value="transferencia">Transferência Bancária</option>
                     <option value="dinheiro">Dinheiro</option>
                     <option value="mbway">MBWay</option>
                     <option value="debito_direto">Débito Direto</option>
                  </select>
               </div>
            </form>

            <div className="p-5 border-t border-zinc-800 bg-zinc-900/50 flex gap-4">
               <button onClick={() => setIsPayModalOpen(false)} type="button" className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-sm rounded-lg transition-colors">Cancelar</button>
               <button onClick={handlePay} type="submit" className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-900 font-bold text-sm rounded-lg transition-colors">Confirmar Pagamento</button>
            </div>
          </div>
        </div>
      )}

       {/* Modal Detalhes da Fatura */}
      {isDetailsModalOpen && selectedFatura && (() => {
        const safeDecimal = (val: any): Decimal => {
           if (val === null || val === undefined || val === '' || isNaN(val)) return new Decimal(0);
           try { return new Decimal(val); } catch (e) { return new Decimal(0); }
        };

        let calcLiquido = safeDecimal(selectedFatura.valor_liquido);
        let calcIva = safeDecimal(selectedFatura.valor_iva);

        if (calcLiquido.isZero() && selectedFatura.fatura_itens && selectedFatura.fatura_itens.length > 0) {
          selectedFatura.fatura_itens.forEach((item: any) => {
             const q = safeDecimal(item.quantidade);
             const c = safeDecimal(item.preco_custo || item.preco_unitario);
             const liq = item.valor_liquido !== undefined && item.valor_liquido !== null ? safeDecimal(item.valor_liquido) : q.mul(c);
             const iva = item.iva !== undefined && item.iva !== null ? safeDecimal(item.iva) : safeDecimal(item.produto?.iva);
             
             calcLiquido = calcLiquido.add(liq);
             if (item.valor_iva !== undefined && item.valor_iva !== null) {
                 calcIva = calcIva.add(safeDecimal(item.valor_iva));
             } else {
                 calcIva = calcIva.add(liq.mul(iva).div(100));
             }
          });
        }
        
        // Priorizar os valores exatos armazenados na base de dados (valor_total) no invés de recalcular e sobrepor
        const realFinal = safeDecimal(selectedFatura.valor_total);

        return (
        <div className="fixed inset-0 bg-black/80  flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-950 rounded-2xl w-full max-w-4xl border border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-zinc-800 flex justify-between items-start bg-zinc-900/30">
               <div>
                 <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
                   <FileText className="w-4 h-4 text-blue-500" /> Detalhes: {selectedFatura.numero_fatura}
                 </h2>
                 <p className="text-sm font-medium text-zinc-400 mt-1">{selectedFatura.fornecedor?.nome}</p>
                 {(() => {
                    try {
                       if (selectedFatura.descrição) {
                          const desc = JSON.parse(selectedFatura.descrição);
                          if (desc.loja_id) {
                             const s = stores.find((s: any) => String(s.id) === String(desc.loja_id));
                             if (s) {
                                return <p className="text-[11px] font-bold text-amber-500 mt-1 uppercase tracking-wider">Destino: {s.name}</p>;
                             }
                          }
                       }
                    } catch(e) {}
                    if (selectedFatura.tipo?.startsWith('despesa')) {
                       return <p className="text-[11px] font-bold text-blue-500 mt-1 uppercase tracking-wider">Destino: Armazém Central</p>;
                    }
                    return null;
                 })()}
               </div>
               <div className="text-right">
                  {selectedFatura.status_pagamento === 'pago' ? (
                     <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-md text-xs font-bold uppercase tracking-wide"><CheckCircle2 size={14} /> Fatura Fechada (Paga)</span>
                  ) : selectedFatura.status_pagamento === 'parcial' ? (
                     <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-md text-xs font-bold uppercase tracking-wide"><Clock size={14} /> Pagamento Parcial</span>
                  ) : (
                     <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-md text-xs font-bold uppercase tracking-wide"><AlertCircle size={14} /> Aguardando Pagamento</span>
                  )}
               </div>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto no-scrollbar space-y-6">
               
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/80">
                     <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest mb-1">Data Emissão</p>
                     <p className="text-sm font-semibold text-zinc-100">{selectedFatura.data_emissao}</p>
                  </div>
                  <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/80">
                     <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest mb-1">Vencimento</p>
                     <p className="text-sm font-semibold text-amber-500">{selectedFatura.data_vencimento || 'Sem Vencimento'}</p>
                  </div>
                  <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/80">
                     <p className="text-[10px] uppercase font-bold text-emerald-500/70 tracking-widest mb-1">Crédito IVA</p>
                     <p className="text-sm font-bold text-emerald-400">€ {calcIva.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber().toLocaleString('pt-PT', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                  </div>
                  <div className="bg-amber-500/5 p-4 rounded-xl border border-amber-500/20">
                     <p className="text-[10px] uppercase font-bold text-amber-500 tracking-widest mb-1">Valor Final Pendente</p>
                     <p className="text-lg font-bold text-amber-500">€ {Number(selectedFatura.valor_pendente).toLocaleString('pt-PT', {minimumFractionDigits: 2})}</p>
                  </div>
               </div>

               {selectedFatura.fatura_itens && selectedFatura.fatura_itens.length > 0 && (
                  <div>
                     <h3 className="text-sm font-semibold text-zinc-200 mb-3 border-b border-zinc-800 pb-2">Conteúdo da Fatura</h3>
                     <div className="bg-zinc-900/30 border border-zinc-800/80 rounded-xl overflow-x-auto">
                        <table className="w-full text-left">
                           <thead>
                              <tr className="border-b border-zinc-800">
                                 <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest whitespace-nowrap">Artigo</th>
                                 <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-right whitespace-nowrap">QTD</th>
                                 <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-right whitespace-nowrap">Custo Uni.</th>
                                 <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-right whitespace-nowrap">IVA</th>
                                 <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-right whitespace-nowrap">Liq.</th>
                                 <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-right whitespace-nowrap">Total</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-zinc-800/50">
                              {selectedFatura.fatura_itens.map((item: any) => {
                                 const q = safeDecimal(item.quantidade);
                                 const c = safeDecimal(item.preco_custo || item.preco_unitario);
                                 
                                 const liq = item.valor_liquido !== null && item.valor_liquido !== undefined ? safeDecimal(item.valor_liquido) : q.mul(c);
                                 const ivaPerc = item.iva !== null && item.iva !== undefined ? safeDecimal(item.iva) : safeDecimal(item.produto?.iva);
                                 const vIva = item.valor_iva !== null && item.valor_iva !== undefined ? safeDecimal(item.valor_iva) : liq.mul(ivaPerc).div(100);
                                 const tot = item.valor_total !== null && item.valor_total !== undefined ? safeDecimal(item.valor_total) : liq.add(vIva);
                                 return (
                                 <tr key={item.id} className="hover:bg-zinc-800/30 transition-colors">
                                    <td className="px-4 py-3">
                                       <p className="text-sm font-medium text-zinc-300 truncate max-w-[200px]" title={item.produto?.nome}>{item.produto?.nome || 'Artigo'}</p>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                       <span className="text-sm font-medium text-zinc-300 bg-zinc-900 px-2 py-0.5 rounded">{item.quantidade} <span className="text-[10px] text-zinc-500">{item.produto?.unidade_medida || 'un'}</span></span>
                                    </td>
                                    <td className="px-4 py-3 text-right text-sm text-zinc-400 font-medium">
                                       € {c.toDecimalPlaces(6, Decimal.ROUND_HALF_UP).toNumber().toLocaleString('pt-PT', {minimumFractionDigits: 4, maximumFractionDigits: 6})}
                                    </td>
                                    <td className="px-4 py-3 text-right text-sm text-zinc-500">{ivaPerc.toNumber()}%</td>
                                    <td className="px-4 py-3 text-right text-sm text-zinc-400">€ {liq.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber().toLocaleString('pt-PT', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                                    <td className="px-4 py-3 text-right text-sm font-bold text-zinc-100">€ {tot.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber().toLocaleString('pt-PT', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                                 </tr>
                                 );
                              })}
                           </tbody>
                        </table>
                     </div>
                     <div className="flex justify-end mt-4">
                        <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-4 w-64 space-y-2">
                           <div className="flex justify-between text-sm">
                              <span className="text-zinc-500">Subtotal</span>
                              <span className="text-zinc-300 font-medium">€ {calcLiquido.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber().toLocaleString('pt-PT', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                           </div>
                           <div className="flex justify-between text-sm border-b border-zinc-800 pb-2">
                              <span className="text-emerald-500/70">IVA (Crédito)</span>
                              <span className="text-emerald-500 font-medium">+ € {calcIva.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber().toLocaleString('pt-PT', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                           </div>
                           <div className="flex justify-between font-bold">
                              <span className="text-zinc-300">Total Global</span>
                              <span className="text-zinc-100">€ {realFinal.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber().toLocaleString('pt-PT', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                           </div>
                        </div>
                     </div>
                  </div>
               )}
            </div>

            <div className="p-5 border-t border-zinc-800 bg-zinc-900/50 flex gap-4 justify-end">
               <button onClick={() => setIsDetailsModalOpen(false)} type="button" className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-semibold rounded-lg transition-colors">Fechar Painel</button>
               {Number(selectedFatura.valor_pendente) > 0 && (
                  <button 
                     onClick={() => {
                        setPayFormData({ valor: selectedFatura.valor_pendente, data_pagamento: new Date().toISOString().split("T")[0], metodo: "transferencia" });
                        setIsDetailsModalOpen(false);
                        setIsPayModalOpen(true);
                     }}
                     className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold text-sm rounded-lg shadow-sm transition-colors flex items-center gap-2"
                  >
                     Registar Pagamento Fatura
                  </button>
               )}
            </div>
          </div>
        </div>
        );
      })()}


      {/* Modal Loja Específica */}
      <Modal isOpen={isStoreModalOpen} onClose={() => { setIsStoreModalOpen(false); setSelectedStore(null); }} title={`Nova Despesa: ${selectedStore?.name || ""}`} maxWidth="2xl">
          <div className="pt-2 sm:pt-4">
             {selectedStore && <AdminExpenseEntries compact={true} lojaId={selectedStore.id} onSuccess={() => {
                 fetchDados();
                 setIsStoreModalOpen(false);
                 setActiveTab("faturas");
                 setFilterTipo("despesa");
                 setFilterDataAPagar({...filterDataAPagar, loja: String(selectedStore.id)});
                 setSelectedStore(null);
             }} />}
          </div>
      </Modal>

    </div>
  );
}


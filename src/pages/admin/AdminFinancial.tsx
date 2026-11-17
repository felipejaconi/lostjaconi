import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  Banknote, TrendingDown, TrendingUp, Search, Plus, Filter, 
  FileText, CheckCircle2, Clock, Calendar, AlertCircle, Building2,
  ChevronRight, CreditCard, ArrowUpRight, ArrowDownRight, Wallet, Receipt, Store, ShoppingCart, LayoutDashboard,
  Trash2, RotateCcw, EyeOff
} from "lucide-react";
import Swal from "sweetalert2";
import api from "../../lib/api";
import { clsx, type ClassValue } from "clsx";
import { Modal } from "../../components/ui/Modal";
import { BrandTitle } from "../../components/BrandTitle";
import AdminExpenseEntries from "./AdminExpenseEntries";
import AdminPurchaseEntries from "./AdminPurchaseEntries";
import { useAuth } from "../../context/AuthContext";
import { useSearchParams } from "react-router-dom";
import { twMerge } from "tailwind-merge";
import Decimal from "decimal.js";

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function getPedidoTotalComIva(pedido: any): number {
  if (pedido.total_com_iva !== undefined && pedido.total_com_iva !== null) {
    return Number(pedido.total_com_iva);
  }
  let sumSubtotal = 0;
  let sumIva = 0;
  (pedido.pedido_itens || []).forEach((item: any) => {
    const qty = Number(item.quantidade) || 0;
    const preco = Number(item.preco_unitario || item.preco || 0);
    const liq = qty * preco;
    const ivaPerc = Number(item.produto?.iva || 0);
    const ivaVal = liq * (ivaPerc / 100);
    sumSubtotal += liq;
    sumIva += ivaVal;
  });
  return sumSubtotal + sumIva;
}

function getPedidoTotalIva(pedido: any): number {
  if (pedido.total_iva !== undefined && pedido.total_iva !== null) {
    return Number(pedido.total_iva);
  }
  let sumIva = 0;
  (pedido.pedido_itens || []).forEach((item: any) => {
    const qty = Number(item.quantidade) || 0;
    const preco = Number(item.preco_unitario || item.preco || 0);
    const liq = qty * preco;
    const ivaPerc = Number(item.produto?.iva || 0);
    sumIva += liq * (ivaPerc / 100);
  });
  return sumIva;
}

// In-memory client cache across tab navigations for instantaneous loading
let financialCache: {
  faturas: any[];
  fornecedores: any[];
  pedidos: any[];
  stores: any[];
  contasAnalise?: string[];
} | null = null;

let summaryCache: any = null;

const DEFAULT_FATURAS_FILTER = {
  texto: "",
  dataInicio: "",
  dataFim: "",
  status: "todos",
  fornecedor: "todos",
  centroCusto: "todos",
  contaAnalise: "todos",
};

function extractFaturaMeta(f: any, storesList: any[]) {
  let centroCusto = "";
  let contaAnalise = "";
  let lojaId = "";
  let formaPagamento = "";

  if (f?.descrição && f.descrição !== "null") {
    try {
      const desc = typeof f.descrição === "string" ? JSON.parse(f.descrição) : f.descrição;
      lojaId = desc?.loja_id ? String(desc.loja_id) : "";
      formaPagamento = desc?.forma_pagamento ? String(desc.forma_pagamento) : "";
      centroCusto = String(
        desc?.centro_custo ||
          (desc?.classificacao_tipo !== "conta_analise" ? desc?.classificacao_nome : "") ||
          ""
      ).trim();
      contaAnalise = String(
        desc?.conta_analise ||
          (desc?.classificacao_tipo === "conta_analise" ? desc?.classificacao_nome : "") ||
          ""
      ).trim();
    } catch {}
  }

  const lowerCC = centroCusto.toLowerCase();
  if (lowerCC === "armazém central" || lowerCC === "armazem central") {
    centroCusto = "DISTRIBUIDORA";
  } else if (
    lowerCC === "lost wind lda" ||
    lowerCC === "administração / sede" ||
    lowerCC === "administracao / sede"
  ) {
    centroCusto = "LOST WIND UNIPESSOAL,LDA";
  } else if (!centroCusto && lojaId) {
    const st = storesList.find((s: any) => String(s.id) === lojaId);
    if (st?.name) centroCusto = st.name;
  }

  return { centroCusto, contaAnalise, lojaId, formaPagamento };
}

export default function AdminFinancial() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const isArmazem = user?.role === "armazem";
  const [faturas, setFaturas] = useState<any[]>(() => financialCache?.faturas || []);
  const [fornecedores, setFornecedores] = useState<any[]>(() => financialCache?.fornecedores || []);
  const [savedContasAnalise, setSavedContasAnalise] = useState<string[]>(() => financialCache?.contasAnalise || []);
  const [summaryData, setSummaryData] = useState<any>(() => summaryCache);
  const [isLoading, setIsLoading] = useState(() => !summaryCache);
  const [isTabLoading, setIsTabLoading] = useState(false);
  
  const [activeTab, setActiveTab] = useState<"dashboard" | "faturas_compras" | "faturas_despesas" | "fornecedores">(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "compras" || tabParam === "faturas") return "faturas_compras";
    if (tabParam === "despesas") return "faturas_despesas";
    if (tabParam === "fornecedores" || tabParam === "receber") return "fornecedores";
    if (user?.role === "armazem") return "faturas_compras";
    return "dashboard";
  });
  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState("todos");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [checkoutFormData, setCheckoutFormData] = useState({ valor_liquido: "", valor_iva: "", valor_total: "" });
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [selectedStore, setSelectedStore] = useState<any>(null);
  const [selectedFatura, setSelectedFatura] = useState<any>(null);

  const [payFormData, setPayFormData] = useState({ valor: "", data_pagamento: new Date().toISOString().split("T")[0], metodo: "transferencia" });

  const [draftFilterAPagar, setDraftFilterAPagar] = useState(DEFAULT_FATURAS_FILTER);
  const [appliedFilterAPagar, setAppliedFilterAPagar] = useState(DEFAULT_FATURAS_FILTER);
  const [hasSearchedFaturas, setHasSearchedFaturas] = useState(false);

  const [filterDataAReceber, setFilterDataAReceber] = useState({
    periodo: "mes",
    status: "todos",
    loja: "todos"
  });

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const toggleGroup = (groupId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const [formData, setFormData] = useState({
    numero_fatura: "",
    fornecedor_id: "",
    tipo: "despesa", 
    valor_total: "",
    data_emissao: new Date().toISOString().split("T")[0],
    data_vencimento: "",
    parcelas: 1
  });

  const [pedidos, setPedidos] = useState<any[]>(() => financialCache?.pedidos || []);
  const [stores, setStores] = useState<any[]>(() => financialCache?.stores || []);

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
    fetchSummary();
  }, []);

  useEffect(() => {
    if (activeTab !== "dashboard") {
       lazyLoadTab(activeTab);
    }
  }, [activeTab]);

  const fetchSummary = async () => {
    try {
      if (!summaryCache) setIsLoading(true);
      
      const summaryPromise = api.get("/admin/financial/summary").catch(e => {
        console.error("Summary fetch error:", e);
        return { data: summaryCache || {} };
      });
      
      const usersPromise = api.get("/admin/users").catch(e => {
        console.error("Users fetch error:", e);
        return { data: financialCache?.stores || [] };
      });

      const pedidosPromise = api.get("/admin/financial/pedidos?period=mes").catch(e => {
        console.error("Pedidos fetch error:", e);
        return { data: financialCache?.pedidos || [] };
      });

      const [summaryRes, usersRes, pedRes] = await Promise.all([summaryPromise, usersPromise, pedidosPromise]);
      
      summaryCache = summaryRes.data;
      setSummaryData(summaryRes.data);
      
      const storesData = (Array.isArray(usersRes.data) ? usersRes.data : [])
        .filter((u: any) => u.role === 'loja');
      
      const pedData = Array.isArray(pedRes.data) ? pedRes.data : [];
      setPedidos(pedData);
      setStores(storesData);
      
      // Update cache
      financialCache = {
        faturas: financialCache?.faturas || [],
        fornecedores: financialCache?.fornecedores || [],
        pedidos: pedData,
        stores: storesData
      };

    } catch (err) {
      console.error("fetchSummary general error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const lazyLoadTab = async (tab: string, forcePeriod?: string, forceRefresh?: boolean) => {
     if (financialCache && tab === "dashboard" && !forceRefresh) return;
     
     setIsTabLoading(true);
     try {
        if (tab === "faturas_compras" || tab === "faturas_despesas") {
           if (faturas.length === 0 || forceRefresh) {
              const [fatRes, fornRes, usersRes, contasRes] = await Promise.all([
                 api.get("/admin/faturas"),
                 api.get("/admin/fornecedores"),
                 api.get("/admin/users"),
                 api.get("/admin/financeiro/contas-analise").catch(() => ({ data: [] })),
              ]);
              const fatData = fatRes.data || [];
              const fornData = fornRes.data || [];
              const storesData = ((usersRes.data as any[]) || []).filter((u: any) => u.role === 'loja');
              const contasData = Array.isArray(contasRes.data) ? contasRes.data : [];
              
              setFaturas(fatData);
              setFornecedores(fornData);
              setStores(storesData);
              setSavedContasAnalise(contasData);
              
              financialCache = {
                 ...financialCache,
                 faturas: fatData,
                 fornecedores: fornData,
                 pedidos: pedidos,
                 stores: storesData,
                 contasAnalise: contasData,
              } as any;
           }
        } else if (tab === "fornecedores") { // Actually "Faturas a Receber"
           const targetPeriod = forcePeriod || filterDataAReceber.periodo;
           if (pedidos.length === 0 || forcePeriod || forceRefresh) {
              const [pedRes, usersRes] = await Promise.all([
                 api.get(`/admin/financial/pedidos?period=${targetPeriod}`),
                 api.get("/admin/users")
              ]);
              const pedData = pedRes.data || [];
              const storesData = ((usersRes.data as any[]) || []).filter((u: any) => u.role === 'loja');
              
              setPedidos(pedData);
              setStores(storesData);
              
              financialCache = {
                 ...financialCache,
                 faturas: faturas,
                 fornecedores: fornecedores,
                 pedidos: pedData,
                 stores: storesData
              } as any;
           }
        }
     } catch(e) {
        console.error("Error lazy loading tab:", e);
     } finally {
        setIsTabLoading(false);
     }
  };

  const fetchDados = async (targetTab?: "dashboard" | "faturas_compras" | "faturas_despesas" | "fornecedores") => {
    // Redefine fetchDados to refresh everything if needed (called on mutations)
    summaryCache = null;
    financialCache = null;
    setPedidos([]);
    setFaturas([]);
    await fetchSummary();
    await lazyLoadTab(targetTab || activeTab, undefined, true);
  };

  const refreshSummaryOnly = async () => {
    try {
      const summaryRes = await api.get("/admin/financial/summary");
      summaryCache = summaryRes.data;
      setSummaryData(summaryRes.data);
    } catch (err) {
      console.error("refreshSummaryOnly error:", err);
    }
  };

  const handleMarcarRecebido = async (pedido: any) => {
    try {
      const { isConfirmed } = await Swal.fire({
        title: "Confirmar Recebimento?",
        text: `Deseja marcar o pedido de € ${getPedidoTotalComIva(pedido).toFixed(2)} da loja ${pedido.loja_nome || 'Desconhecida'} como recebido?`,
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#10b981",
        cancelButtonColor: "#3f3f46",
        confirmButtonText: "Sim, Recebido",
        cancelButtonText: "Cancelar"
      });

      if (!isConfirmed) return;

      await api.put(`/pedidos/${pedido.id}/status`, { status: "concluido", keep_date: true });
      
      // Update local state immediately preserving original created_at
      setPedidos(prev => prev.map(p => p.id === pedido.id ? { ...p, status: "concluido" } : p));
      
      // Update cache preserving original created_at
      if (financialCache) {
         financialCache.pedidos = financialCache.pedidos.map(p => p.id === pedido.id ? { ...p, status: "concluido" } : p);
      }
      
      // Refresh summary KPIs without overwriting the active pedidos list/period
      refreshSummaryOnly();

      Swal.fire({
        title: "Sucesso",
        text: "Pagamento recebido e pedido concluído.",
        icon: "success",
        timer: 2000,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });
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

      await api.put(`/pedidos/${pedido.id}/status`, { status: "entregue", keep_date: true });
      
      // Update local state immediately preserving original created_at
      setPedidos(prev => prev.map(p => p.id === pedido.id ? { ...p, status: "entregue" } : p));
      
      // Update cache preserving original created_at
      if (financialCache) {
         financialCache.pedidos = financialCache.pedidos.map(p => p.id === pedido.id ? { ...p, status: "entregue" } : p);
      }
      
      // Refresh summary KPIs without overwriting the active pedidos list/period
      refreshSummaryOnly();

      Swal.fire({
        title: "Sucesso",
        text: "Recebimento revertido.",
        icon: "success",
        timer: 2000,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });
    } catch (err: any) {
      Swal.fire("Erro", err.message || "Falha ao reverter recebimento", "error");
    }
  };

  const handleDeleteFatura = async (fatura: any) => {
    if (!fatura || !fatura.id) return;

    const faturaDesc = fatura.numero_fatura || `ID #${fatura.id}`;
    const fornecedorNome = fatura.fornecedor?.nome ? ` do fornecedor "${fatura.fornecedor.nome}"` : "";
    const valorTotalStr = fatura.valor_total ? ` no valor de € ${Number(fatura.valor_total).toFixed(2)}` : "";

    const { isConfirmed } = await Swal.fire({
      title: "Apagar Fatura?",
      html: `<div class="text-left text-sm space-y-2 text-zinc-300">
        <p>Tem a certeza que deseja apagar a fatura <b>${faturaDesc}</b>${fornecedorNome}${valorTotalStr}?</p>
        <p class="text-xs text-rose-400 font-semibold bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20">
          ⚠️ Esta ação é irreversível e irá eliminar a fatura, seus itens e movimentos financeiros associados.
        </p>
      </div>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#3f3f46",
      confirmButtonText: "Sim, Apagar Fatura",
      cancelButtonText: "Cancelar",
      reverseButtons: true
    });

    if (!isConfirmed) return;

    try {
      await api.delete(`/admin/faturas/${fatura.id}`);
      Swal.fire({
        title: "Sucesso!",
        text: `A fatura ${faturaDesc} foi apagada com sucesso.`,
        icon: "success",
        timer: 2000,
        showConfirmButton: false
      });
      setIsDetailsModalOpen(false);
      setSelectedFatura(null);
      fetchDados();
    } catch (err: any) {
      console.error("Erro ao apagar fatura:", err);
      Swal.fire("Erro", err.response?.data?.error || err.message || "Falha ao apagar fatura", "error");
    }
  };

  const handleCreateDespesa = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const numParcelas = Number(formData.parcelas) || 1;
      
      if (numParcelas > 1) {
         const payloadArray = [];
         const [year, month, day] = formData.data_emissao.split('-');
         let currentEmissao = new Date(Number(year), Number(month) - 1, Number(day));
         
         let currentVencimento: Date | null = null;
         if (formData.data_vencimento) {
             const [vYear, vMonth, vDay] = formData.data_vencimento.split('-');
             currentVencimento = new Date(Number(vYear), Number(vMonth) - 1, Number(vDay));
         }

         for (let i = 0; i < numParcelas; i++) {
             const suffix = `-P${i+1}/${numParcelas}`;
             
             // Check to properly format dates YYYY-MM-DD
             const pad = (n: number) => String(n).padStart(2, '0');
             const formatD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

             payloadArray.push({
                 numero_fatura: `${formData.numero_fatura}${suffix}`,
                 fornecedor_id: formData.fornecedor_id,
                 tipo: formData.tipo,
                 valor_total: Number(formData.valor_total),
                 valor_pendente: Number(formData.valor_total),
                 status_pagamento: "pendente",
                 data_emissao: formatD(currentEmissao),
                 data_vencimento: currentVencimento ? formatD(currentVencimento) : null
             });
             
             // increment 1 month
             currentEmissao.setMonth(currentEmissao.getMonth() + 1);
             if (currentVencimento) {
                 currentVencimento.setMonth(currentVencimento.getMonth() + 1);
             }
         }
         await api.post("/admin/faturas", payloadArray);
      } else {
         const payload = {
            numero_fatura: formData.numero_fatura,
            fornecedor_id: formData.fornecedor_id,
            tipo: formData.tipo,
            data_emissao: formData.data_emissao,
            data_vencimento: formData.data_vencimento || null,
            valor_total: Number(formData.valor_total),
            valor_pendente: Number(formData.valor_total),
            status_pagamento: "pendente"
         };
         await api.post("/admin/faturas", payload);
      }

      Swal.fire({
         title: 'Sucesso',
         text: numParcelas > 1 ? `Foram registadas ${numParcelas} parcelas com sucesso!` : 'Despesa registada com sucesso',
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
      
      const pagoVal = Number(payFormData.valor);
      
      // Update local state immediately
      setFaturas(prev => prev.map(f => {
         if (f.id === selectedFatura.id) {
            const newPend = Math.max(0, Number(f.valor_pendente) - pagoVal);
            return { 
               ...f, 
               valor_pendente: newPend,
               status_pagamento: newPend <= 0 ? 'pago' : 'parcial'
            };
         }
         return f;
      }));
      
      // Update cache
      if (financialCache) {
         financialCache.faturas = financialCache.faturas.map(f => {
            if (f.id === selectedFatura.id) {
               const newPend = Math.max(0, Number(f.valor_pendente) - pagoVal);
               return { ...f, valor_pendente: newPend, status_pagamento: newPend <= 0 ? 'pago' : 'parcial' };
            }
            return f;
         });
      }
      
      // Refresh summary stats
      fetchSummary();

      Swal.fire({
         title: 'Sucesso',
         text: 'Pagamento registado',
         icon: 'success',
         background: '#18181b', color: '#f4f4f5',
         confirmButtonColor: '#10b981',
         timer: 2000,
         showConfirmButton: false,
         toast: true,
         position: 'top-end'
      });
      setIsPayModalOpen(false);
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
     if (summaryData) {
        return {
           ...summaryData,
           topFornecedores: [] // We don't have this in summary but dashboard doesn't seem to show it anymore?
        };
     }
     
     let totalCompras = new Decimal(0);
     let totalDespesas = new Decimal(0);
     let totalPendente = new Decimal(0);
     let totalPendenteCompras = new Decimal(0);
     let totalPendenteDespesas = new Decimal(0);
     let totalVencido = new Decimal(0);
     let totalIvaCredito = new Decimal(0);
     let totalIvaDebito = new Decimal(0);
     let totalReceber = new Decimal(0);
     const expiringBills: any[] = [];
     const fornecedorStats: Record<string, { id: string; nome: string; nif: string; tipo: string; total: Decimal }> = {};
     
     const today = new Date();
     const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

     faturas.forEach(f => {
        if (f.tipo === 'entrada_stock' || f.tipo === 'compra' || f.status_pagamento === 'em_conferencia') return;
        const val = new Decimal(f.valor_total || 0);
        const pend = new Decimal(f.valor_pendente || 0);
        
        const isCompra = f.tipo === 'compra_financeiro';
        if (isCompra) {
           totalCompras = totalCompras.add(val);
           totalPendenteCompras = totalPendenteCompras.add(pend);
        } else {
           totalDespesas = totalDespesas.add(val);
           totalPendenteDespesas = totalPendenteDespesas.add(pend);
        }
        
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
        totalPendenteCompras: totalPendenteCompras.toNumber(),
        totalPendenteDespesas: totalPendenteDespesas.toNumber(),
        totalVencido: totalVencido.toNumber(),
        totalIvaCredito: totalIvaCredito.toNumber(),
        totalIvaDebito: totalIvaDebito.toNumber(),
        totalReceber: totalReceber.toNumber(),
        topFornecedores: topFornecedoresList,
        expiringBills: expiringBills.sort((a, b) => new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime())
     };
  }, [faturas, pedidos, summaryData]);

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

  const filterOptionsAPagar = useMemo(() => {
    const customCentros = new Set<string>();
    const contasMap = new Map<string, string>();
    const storeNames = new Set(stores.map((s: any) => (s.name || "").toLowerCase()));
    const builtInCentros = new Set([
      "distribuidora",
      "lost wind lda",
      "lost wind unipessoal,lda",
      "lost wind unipessoal, lda",
      "armazém central",
      "armazem central",
      "administração / sede",
      "administracao / sede",
      "logística / frota",
      "logistica / frota",
      "logistica/frota",
      "logística/frota",
      "a",
    ]);

    savedContasAnalise.forEach((ca) => {
      const clean = String(ca || "").trim();
      if (clean && !contasMap.has(clean.toLowerCase())) {
        contasMap.set(clean.toLowerCase(), clean);
      }
    });

    faturas.forEach((f) => {
      if (f.tipo === "entrada_stock" || f.tipo === "compra" || f.status_pagamento === "em_conferencia") return;
      const meta = extractFaturaMeta(f, stores);
      if (
        meta.centroCusto &&
        !builtInCentros.has(meta.centroCusto.toLowerCase()) &&
        !storeNames.has(meta.centroCusto.toLowerCase())
      ) {
        customCentros.add(meta.centroCusto);
      }
      if (meta.contaAnalise && !contasMap.has(meta.contaAnalise.toLowerCase())) {
        contasMap.set(meta.contaAnalise.toLowerCase(), meta.contaAnalise);
      }
    });

    return {
      customCentros: Array.from(customCentros).sort((a, b) => a.localeCompare(b, "pt-PT")),
      contasAnalise: Array.from(contasMap.values()).sort((a, b) => a.localeCompare(b, "pt-PT")),
    };
  }, [faturas, stores, savedContasAnalise]);

  const handlePesquisarFaturas = async () => {
    if (faturas.length === 0) {
      await lazyLoadTab(activeTab, undefined, true);
    }
    setAppliedFilterAPagar({ ...draftFilterAPagar });
    setDisplayCountFaturas(30);
    setHasSearchedFaturas(true);
  };

  const handleLimparFiltrosFaturas = () => {
    setDraftFilterAPagar(DEFAULT_FATURAS_FILTER);
    setAppliedFilterAPagar(DEFAULT_FATURAS_FILTER);
    setHasSearchedFaturas(false);
    setDisplayCountFaturas(30);
  };

  const filteredFaturas = faturas.filter(f => {
    if (f.tipo === 'entrada_stock' || f.tipo === 'compra' || f.status_pagamento === 'em_conferencia') return false;

    const queryText = appliedFilterAPagar.texto.trim().toLowerCase();
    const textMatch = !queryText ||
      (f.numero_fatura || "").toLowerCase().includes(queryText) ||
      (f.fornecedor?.nome || "").toLowerCase().includes(queryText) ||
      (f.observacoes || "").toLowerCase().includes(queryText);

    let tipoMatch = true;
    if (activeTab === 'faturas_compras') {
       tipoMatch = f.tipo === 'compra_financeiro';
    } else if (activeTab === 'faturas_despesas') {
       tipoMatch = f.tipo !== 'compra_financeiro';
    } else {
       if (filterTipo === 'compra') tipoMatch = f.tipo === 'compra_financeiro';
       else if (filterTipo === 'despesa') tipoMatch = f.tipo !== 'compra_financeiro';
    }

    const emissaoDateStr = String(f.data_emissao || "").slice(0, 10);
    let dateMatch = true;
    if (appliedFilterAPagar.dataInicio) {
      dateMatch = Boolean(emissaoDateStr) && emissaoDateStr >= appliedFilterAPagar.dataInicio;
    }
    if (dateMatch && appliedFilterAPagar.dataFim) {
      dateMatch = Boolean(emissaoDateStr) && emissaoDateStr <= appliedFilterAPagar.dataFim;
    }

    let statusMatch = true;
    if (appliedFilterAPagar.status !== "todos") {
       if (appliedFilterAPagar.status === "pago") {
         statusMatch = f.status_pagamento === "pago";
       } else if (appliedFilterAPagar.status === "nao_pago") {
         statusMatch = ["pendente", "parcial"].includes(f.status_pagamento || "pendente");
       } else if (appliedFilterAPagar.status === "vencido") {
         const pend = Number(f.valor_pendente || 0);
         const refDateStr = String(f.data_vencimento || f.data_emissao || "").slice(0, 10);
         const todayStr = new Date().toISOString().slice(0, 10);
         statusMatch = pend > 0 && Boolean(refDateStr) && refDateStr < todayStr;
       }
    }

    const fornecedorMatch =
      appliedFilterAPagar.fornecedor === "todos" ||
      String(f.fornecedor_id) === appliedFilterAPagar.fornecedor;

    const meta = extractFaturaMeta(f, stores);

    let centroCustoMatch = true;
    if (appliedFilterAPagar.centroCusto !== "todos") {
      const target = appliedFilterAPagar.centroCusto;
      if (target === "cc:DISTRIBUIDORA") {
        centroCustoMatch =
          meta.centroCusto.toUpperCase() === "DISTRIBUIDORA" ||
          (!meta.centroCusto && !meta.lojaId && f.tipo === "compra_financeiro");
      } else if (target === "cc:LOST WIND UNIPESSOAL,LDA") {
        centroCustoMatch = meta.centroCusto.toUpperCase() === "LOST WIND UNIPESSOAL,LDA";
      } else if (target.startsWith("loja:")) {
        const sId = target.replace("loja:", "");
        const st = stores.find((s: any) => String(s.id) === sId);
        centroCustoMatch =
          meta.lojaId === sId ||
          Boolean(st?.name && meta.centroCusto.toLowerCase() === st.name.toLowerCase());
      } else if (target.startsWith("custom:")) {
        const customName = target.replace("custom:", "");
        centroCustoMatch = meta.centroCusto.toLowerCase() === customName.toLowerCase();
      }
    }

    let contaAnaliseMatch = true;
    if (appliedFilterAPagar.contaAnalise !== "todos") {
      contaAnaliseMatch =
        meta.contaAnalise.toLowerCase() === appliedFilterAPagar.contaAnalise.toLowerCase();
    }

    return (
      textMatch &&
      tipoMatch &&
      dateMatch &&
      statusMatch &&
      fornecedorMatch &&
      centroCustoMatch &&
      contaAnaliseMatch
    );
  });

  const filteredFaturasTotals = useMemo(() => {
    let total = new Decimal(0);
    let iva = new Decimal(0);
    let pendente = new Decimal(0);
    filteredFaturas.forEach((f) => {
      total = total.add(new Decimal(f.valor_total || 0));
      iva = iva.add(new Decimal(f.valor_iva || 0));
      pendente = pendente.add(new Decimal(f.valor_pendente || 0));
    });
    return {
      total: total.toNumber(),
      iva: iva.toNumber(),
      pendente: pendente.toNumber(),
    };
  }, [filteredFaturas]);

  const groupedFaturas = useMemo(() => {
    const groups = new Map<string, any>();
    const result: any[] = [];
    
    filteredFaturas.forEach(f => {
      const match = f.numero_fatura?.match(/(.+)-P(\d+)\/(\d+)$/);
      if (match) {
        const baseNum = match[1];
        const currentP = match[2];
        const totalP = match[3];
        const baseGroupKey = `${f.fornecedor_id}-${baseNum}-${totalP}`;
        let groupKey = baseGroupKey;
        let dupIdx = 1;
        while (
          groups.has(groupKey) &&
          groups.get(groupKey).installments.some((inst: any) =>
            inst.numero_fatura?.endsWith(`-P${currentP}/${totalP}`)
          )
        ) {
          dupIdx += 1;
          groupKey = `${baseGroupKey}#${dupIdx}`;
        }
        
        if (!groups.has(groupKey)) {
          const groupObj = {
            isGroup: true,
            id: groupKey,
            numero_fatura: `${baseNum}`,
            tipo: f.tipo,
            fornecedor: f.fornecedor,
            fornecedor_id: f.fornecedor_id,
            data_emissao: f.data_emissao,
            data_vencimento: f.data_vencimento,
            descrição: f.descrição,
            installments: [],
            total_group_value: new Decimal(0),
            total_group_pendente: new Decimal(0),
            status_pagamento: "pendente",
            totalInstallments: Number(totalP),
          };
          groups.set(groupKey, groupObj);
          result.push(groupObj);
        }
        
        const group = groups.get(groupKey);
        group.installments.push(f);
        group.total_group_value = group.total_group_value.add(new Decimal(f.valor_total || 0));
        group.total_group_pendente = group.total_group_pendente.add(new Decimal(f.valor_pendente || 0));
      } else {
        result.push(f);
      }
    });

    groups.forEach(group => {
       group.installments.sort((a: any, b: any) => {
          const aNum = Number(a.numero_fatura.match(/-P(\d+)\/\d+$/)?.[2] || 0);
          const bNum = Number(b.numero_fatura.match(/-P(\d+)\/\d+$/)?.[2] || 0);
          return aNum - bNum;
       });
       group.valor_total = group.total_group_value.toNumber();
       group.valor_pendente = group.total_group_pendente.toNumber();
       group.status_pagamento = group.valor_pendente === 0 ? 'pago' : (group.valor_pendente < group.valor_total ? 'parcial' : 'pendente');
       
       if (group.installments.length > 0) {
          group.data_emissao = group.installments[0].data_emissao;
          group.data_vencimento = group.installments[0].data_vencimento;
       }
    });
    
    return result;
  }, [filteredFaturas]);

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
      <div className="sticky top-0 z-40 bg-[#050505] pt-2 md:pt-4 pb-2 -mt-2 md:-mt-4 mb-0 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shrink-0">
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 sm:gap-5">
          <BrandTitle title="Financeiro" titleClassName="max-md:mt-0 md:-mt-4 max-md:pl-0 max-md:pt-0 max-md:ml-0" hideUnderline />

          {user?.role === "admin" && (
            <button
              onClick={() => setIsPurchaseModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm shadow-emerald-500/20 border border-emerald-500/40 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus size={12} strokeWidth={2.75} />
              <span>Nova Fatura</span>
            </button>
          )}
        </div>

        <div
          role="tablist"
          aria-label="Secções do Financeiro"
          className="inline-flex items-center gap-1 p-1 bg-zinc-950 border border-zinc-800/90 rounded-xl overflow-x-auto no-scrollbar max-w-full self-center lg:self-auto"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "dashboard"}
            onClick={() => setActiveTab("dashboard")}
            className={cn(
              "group inline-flex items-center gap-2 h-9 px-3.5 text-xs font-semibold tracking-wide rounded-lg border transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-600",
              activeTab === "dashboard"
                ? "bg-zinc-800/95 text-white border-zinc-700/90 shadow-sm"
                : "border-transparent text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/80"
            )}
          >
            <LayoutDashboard
              className={cn(
                "w-3.5 h-3.5 shrink-0 transition-colors",
                activeTab === "dashboard"
                  ? "text-blue-400"
                  : "text-zinc-500 group-hover:text-zinc-300"
              )}
            />
            <span>Dashboard</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "faturas_compras" || activeTab === "faturas_despesas"}
            onClick={() => setActiveTab("faturas_compras")}
            className={cn(
              "group inline-flex items-center gap-2 h-9 px-3.5 text-xs font-semibold tracking-wide rounded-lg border transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-600",
              activeTab === "faturas_compras" || activeTab === "faturas_despesas"
                ? "bg-zinc-800/95 text-white border-zinc-700/90 shadow-sm"
                : "border-transparent text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/80"
            )}
          >
            <Receipt
              className={cn(
                "w-3.5 h-3.5 shrink-0 transition-colors",
                activeTab === "faturas_compras" || activeTab === "faturas_despesas"
                  ? "text-amber-400"
                  : "text-zinc-500 group-hover:text-zinc-300"
              )}
            />
            <span>Faturas a Pagar</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "fornecedores"}
            onClick={() => setActiveTab("fornecedores")}
            className={cn(
              "group inline-flex items-center gap-2 h-9 px-3.5 text-xs font-semibold tracking-wide rounded-lg border transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-600",
              activeTab === "fornecedores"
                ? "bg-zinc-800/95 text-white border-zinc-700/90 shadow-sm"
                : "border-transparent text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/80"
            )}
          >
            <Wallet
              className={cn(
                "w-3.5 h-3.5 shrink-0 transition-colors",
                activeTab === "fornecedores"
                  ? "text-emerald-400"
                  : "text-zinc-500 group-hover:text-zinc-300"
              )}
            />
            <span>Faturas a Receber</span>
          </button>
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

          {activeTab === "dashboard" && (
            <div className="space-y-6 mt-6">
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* 1. Faturas a Pagar (Compras) */}
                  <div 
                     onClick={() => setActiveTab("faturas_compras")}
                     className="bg-zinc-950 border border-zinc-800 hover:border-blue-500/50 rounded-xl p-4 shadow-sm cursor-pointer transition-all hover:bg-zinc-900/40 group"
                  >
                     <div className="flex items-center justify-between mb-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20 group-hover:scale-105 transition-transform">
                           <Receipt className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">Pendente</span>
                     </div>
                     <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-0.5">Faturas a Pagar</p>
                     <p className="text-[11px] font-bold text-blue-400 uppercase tracking-wider mb-1">(Compras)</p>
                     <p className="text-xl font-bold text-zinc-100">€ {stats.totalPendenteCompras.toLocaleString('pt-PT', {minimumFractionDigits:2})}</p>
                  </div>

                  {/* 2. Faturas a Pagar (Despesas) */}
                  <div 
                     onClick={() => setActiveTab("faturas_despesas")}
                     className="bg-zinc-950 border border-zinc-800 hover:border-amber-500/50 rounded-xl p-4 shadow-sm cursor-pointer transition-all hover:bg-zinc-900/40 group"
                  >
                     <div className="flex items-center justify-between mb-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20 group-hover:scale-105 transition-transform">
                           <TrendingDown className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">Pendente</span>
                     </div>
                     <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-0.5">Faturas a Pagar</p>
                     <p className="text-[11px] font-bold text-amber-400 uppercase tracking-wider mb-1">(Despesas)</p>
                     <p className="text-xl font-bold text-amber-500">€ {stats.totalPendenteDespesas.toLocaleString('pt-PT', {minimumFractionDigits:2})}</p>
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
                              
                              <div className="relative z-10 grid grid-cols-2 gap-2">
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
                                       setActiveTab("faturas_compras");
                                       const nextFilter = { ...DEFAULT_FATURAS_FILTER, centroCusto: `loja:${store.id}` };
                                       setDraftFilterAPagar(nextFilter);
                                       setAppliedFilterAPagar(nextFilter);
                                       setHasSearchedFaturas(true);
                                    }}
                                    className="flex flex-col items-center justify-center gap-1.5 py-2.5 px-1 bg-white/5 hover:bg-rose-500/10 text-zinc-400 hover:text-rose-400 rounded-xl transition-colors border border-white/5 hover:border-rose-500/20 group/btn"
                                    title="Faturas da Loja"
                                 >
                                    <Receipt size={14} className="group-hover/btn:scale-110 transition-transform" />
                                    <span className="text-[9px] font-bold uppercase tracking-wider">Faturas</span>
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


         {(activeTab === "faturas_compras" || activeTab === "faturas_despesas") && (() => {
            const isCompras = activeTab === "faturas_compras";
            const metodoLabels: Record<string, string> = {
               transferencia: "Transferência",
               dinheiro: "Dinheiro",
               debito_direto: "Débito Direto",
               pago: "Pago"
            };

            return (
            <div className="mt-5 space-y-5">
               {/* Painel de Filtros */}
               <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                     {/* 1. Pesquisa por texto */}
                     <div>
                        <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">
                           Nº Fatura / Pesquisa
                        </label>
                        <div className="relative">
                           <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                           <input
                              type="text"
                              placeholder="Nº fatura, fornecedor ou obs..."
                              value={draftFilterAPagar.texto}
                              onChange={(e) =>
                                 setDraftFilterAPagar({ ...draftFilterAPagar, texto: e.target.value })
                              }
                              onKeyDown={(e) => {
                                 if (e.key === "Enter") {
                                    e.preventDefault();
                                    handlePesquisarFaturas();
                                 }
                              }}
                              className="w-full pl-9 pr-3 h-10 bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 focus:border-blue-500/60 rounded-xl text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition-colors"
                           />
                        </div>
                     </div>

                     {/* 2. Data Inicial */}
                     <div>
                        <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">
                           Data Inicial
                        </label>
                        <input
                           type="date"
                           value={draftFilterAPagar.dataInicio}
                           onChange={(e) =>
                              setDraftFilterAPagar({ ...draftFilterAPagar, dataInicio: e.target.value })
                           }
                           className="w-full px-3 h-10 bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 focus:border-blue-500/60 rounded-xl text-sm font-mono tabular-nums text-zinc-100 outline-none transition-colors [color-scheme:dark]"
                        />
                     </div>

                     {/* 3. Data Final */}
                     <div>
                        <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">
                           Data Final
                        </label>
                        <input
                           type="date"
                           value={draftFilterAPagar.dataFim}
                           onChange={(e) =>
                              setDraftFilterAPagar({ ...draftFilterAPagar, dataFim: e.target.value })
                           }
                           className="w-full px-3 h-10 bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 focus:border-blue-500/60 rounded-xl text-sm font-mono tabular-nums text-zinc-100 outline-none transition-colors [color-scheme:dark]"
                        />
                     </div>

                     {/* 4. Estado */}
                     <div>
                        <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">
                           Estado de Pagamento
                        </label>
                        <select
                           value={draftFilterAPagar.status}
                           onChange={(e) =>
                              setDraftFilterAPagar({ ...draftFilterAPagar, status: e.target.value })
                           }
                           className="w-full px-3 h-10 bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 focus:border-blue-500/60 rounded-xl text-sm text-zinc-200 outline-none transition-colors"
                        >
                           <option value="todos">Todos os Estados</option>
                           <option value="nao_pago">Pendentes / Parciais</option>
                           <option value="pago">Pagos</option>
                           <option value="vencido">Vencidas</option>
                        </select>
                     </div>

                     {/* 5. Centro de Custo */}
                     <div>
                        <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">
                           Centro de Custo
                        </label>
                        <select
                           value={draftFilterAPagar.centroCusto}
                           onChange={(e) =>
                              setDraftFilterAPagar({ ...draftFilterAPagar, centroCusto: e.target.value })
                           }
                           className="w-full px-3 h-10 bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 focus:border-blue-500/60 rounded-xl text-sm text-zinc-200 outline-none transition-colors"
                        >
                           <option value="todos">Todos os Centros de Custo</option>
                           <option value="cc:DISTRIBUIDORA">DISTRIBUIDORA</option>
                           <option value="cc:LOST WIND UNIPESSOAL,LDA">LOST WIND UNIPESSOAL,LDA</option>
                           {stores.length > 0 && (
                              <optgroup label="Lojas">
                                 {stores.map((s: any) => (
                                    <option key={s.id} value={`loja:${s.id}`}>
                                       {s.name}
                                    </option>
                                 ))}
                              </optgroup>
                           )}
                           {filterOptionsAPagar.customCentros.length > 0 && (
                              <optgroup label="Outros Centros de Custo">
                                 {filterOptionsAPagar.customCentros.map((cc) => (
                                    <option key={cc} value={`custom:${cc}`}>
                                       {cc}
                                    </option>
                                 ))}
                              </optgroup>
                           )}
                        </select>
                     </div>

                     {/* 6. Conta de Análise */}
                     <div>
                        <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">
                           Conta de Análise
                        </label>
                        <select
                           value={draftFilterAPagar.contaAnalise}
                           onChange={(e) =>
                              setDraftFilterAPagar({ ...draftFilterAPagar, contaAnalise: e.target.value })
                           }
                           className="w-full px-3 h-10 bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 focus:border-blue-500/60 rounded-xl text-sm text-zinc-200 outline-none transition-colors"
                        >
                           <option value="todos">Todas as Contas de Análise</option>
                           {filterOptionsAPagar.contasAnalise.map((ca) => (
                              <option key={ca} value={ca}>
                                 {ca}
                              </option>
                           ))}
                        </select>
                     </div>

                     {/* 7. Fornecedor */}
                     <div>
                        <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">
                           Fornecedor
                        </label>
                        <select
                           value={draftFilterAPagar.fornecedor}
                           onChange={(e) =>
                              setDraftFilterAPagar({ ...draftFilterAPagar, fornecedor: e.target.value })
                           }
                           className="w-full px-3 h-10 bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 focus:border-blue-500/60 rounded-xl text-sm text-zinc-200 outline-none transition-colors"
                        >
                           <option value="todos">Todos os Fornecedores</option>
                           {fornecedores.map((f) => (
                              <option key={f.id} value={String(f.id)}>
                                 {f.nome}
                              </option>
                           ))}
                        </select>
                     </div>

                     {/* 8. Botões Limpar + Pesquisar */}
                     <div className="flex items-end gap-2">
                        <button
                           type="button"
                           onClick={handleLimparFiltrosFaturas}
                           className="px-4 h-10 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-zinc-100 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                           title="Limpar filtros e ocultar lista"
                        >
                           <RotateCcw className="w-3.5 h-3.5" />
                           Limpar
                        </button>
                        <button
                           type="button"
                           onClick={handlePesquisarFaturas}
                           disabled={isTabLoading}
                           className="flex-1 px-5 h-10 bg-blue-600 hover:bg-blue-500 active:scale-[0.99] disabled:opacity-50 text-white rounded-xl text-xs font-bold tracking-wide transition-all flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                        >
                           <Search className="w-4 h-4" />
                           {isTabLoading ? "A carregar..." : "Pesquisar"}
                        </button>
                     </div>
                  </div>
               </div>

               {/* Área de Resultados (Oculta até clicar em Pesquisar) */}
               {!hasSearchedFaturas ? (
                  <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl py-16 px-6 text-center">
                     <div className="w-11 h-11 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-3.5 text-zinc-400">
                        <Search className="w-5 h-5" />
                     </div>
                     <p className="text-sm font-semibold text-zinc-200">
                        As faturas estão ocultas até realizar a pesquisa
                     </p>
                     <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto">
                        Escolha o intervalo de datas, centro de custo, conta de análise ou fornecedor acima e clique em Pesquisar.
                     </p>
                  </div>
               ) : (
                  <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col">
                     {/* Resumo dos Resultados Filtrados */}
                     <div className="px-5 py-3.5 bg-zinc-900/40 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
                           <div>
                              <span className="text-zinc-500">Faturas: </span>
                              <span className="font-mono tabular-nums font-semibold text-zinc-200">
                                 {groupedFaturas.length}
                              </span>
                           </div>
                           <span className="text-zinc-800 hidden sm:inline">·</span>
                           <div>
                              <span className="text-zinc-500">Total Filtrado: </span>
                              <span className="font-mono tabular-nums font-semibold text-zinc-100">
                                 € {filteredFaturasTotals.total.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}
                              </span>
                           </div>
                           <span className="text-zinc-800 hidden sm:inline">·</span>
                           <div>
                              <span className="text-zinc-500">IVA: </span>
                              <span className="font-mono tabular-nums font-semibold text-emerald-400">
                                 € {filteredFaturasTotals.iva.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}
                              </span>
                           </div>
                           <span className="text-zinc-800 hidden sm:inline">·</span>
                           <div>
                              <span className="text-zinc-500">Pendente: </span>
                              <span className="font-mono tabular-nums font-bold text-amber-400">
                                 € {filteredFaturasTotals.pendente.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}
                              </span>
                           </div>
                        </div>

                        <button
                           type="button"
                           onClick={() => setHasSearchedFaturas(false)}
                           className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                        >
                           <EyeOff className="w-3.5 h-3.5" />
                           Ocultar Lista
                        </button>
                     </div>

                     <div className="flex-1 overflow-x-auto no-scrollbar">
                        <table className="w-full text-left min-w-[960px]">
                           <thead>
                              <tr className="bg-zinc-900/50 border-b border-zinc-800">
                                 <th className="px-4 py-3 text-xs font-semibold text-zinc-400 whitespace-nowrap">Documento</th>
                                 <th className="px-4 py-3 text-xs font-semibold text-zinc-400 whitespace-nowrap">Fornecedor</th>
                                 <th className="px-4 py-3 text-xs font-semibold text-zinc-400 whitespace-nowrap">Centro de Custo / Conta</th>
                                 <th className="px-4 py-3 text-xs font-semibold text-zinc-400 whitespace-nowrap">Datas</th>
                                 <th className="px-4 py-3 text-xs font-semibold text-zinc-400 text-right whitespace-nowrap">Valor Total</th>
                                 <th className="px-4 py-3 text-xs font-semibold text-zinc-400 text-center whitespace-nowrap">Estado</th>
                                 <th className="px-4 py-3 text-xs font-semibold text-zinc-400 text-right whitespace-nowrap">Pendente</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-zinc-800/60">
                              {filteredFaturas.length === 0 ? (
                                 <tr>
                                    <td colSpan={7} className="p-12 text-center">
                                       <FileText className="w-9 h-9 text-zinc-700 mx-auto mb-3" />
                                       <p className="text-zinc-300 font-medium text-sm">
                                          {isCompras ? "Nenhuma fatura encontrada para os filtros selecionados." : "Nenhuma fatura encontrada."}
                                       </p>
                                       <p className="text-xs text-zinc-500 mt-1">
                                          Ajuste as datas ou os filtros acima e pesquise novamente.
                                       </p>
                                       {isCompras && user?.role === "admin" && (
                                          <button
                                             onClick={() => setIsPurchaseModalOpen(true)}
                                             className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border border-emerald-500/40 cursor-pointer"
                                          >
                                             <Plus size={12} strokeWidth={2.75} />
                                             Nova Fatura
                                          </button>
                                       )}
                                    </td>
                                 </tr>
                              ) : (
                                 groupedFaturas.slice(0, displayCountFaturas).map(f => {
                                    const isExpanded = f.isGroup && expandedGroups[f.id];
                                    const meta = extractFaturaMeta(f, stores);
                                    return (
                                    <React.Fragment key={f.id}>
                                       <tr
                                          className={cn(
                                             "transition-colors cursor-pointer",
                                             isExpanded ? "bg-zinc-900/60" : "hover:bg-zinc-900/40"
                                          )}
                                          onClick={(e) => {
                                             if (f.isGroup) toggleGroup(f.id, e as any);
                                             else { setSelectedFatura(f); setIsDetailsModalOpen(true); }
                                          }}
                                       >
                                          <td className="px-4 py-3.5">
                                             <div className="flex items-center gap-2">
                                                {f.isGroup && (
                                                   <ChevronRight className={cn("w-4 h-4 text-zinc-500 transition-transform shrink-0", isExpanded && "rotate-90")} />
                                                )}
                                                <div>
                                                   <p className="text-sm font-semibold text-zinc-100">{f.numero_fatura}</p>
                                                   <div className="flex items-center gap-1.5 text-xs text-zinc-500 mt-0.5">
                                                      <span>{meta.formaPagamento ? (metodoLabels[meta.formaPagamento] || meta.formaPagamento) : "Compra"}</span>
                                                      {f.isGroup && (
                                                         <>
                                                            <span>·</span>
                                                            <span>{f.totalInstallments} parcelas</span>
                                                         </>
                                                      )}
                                                   </div>
                                                </div>
                                             </div>
                                          </td>
                                          <td className="px-4 py-3.5">
                                             <p className="text-sm font-medium text-zinc-200">{f.fornecedor?.nome || "-"}</p>
                                             <p className="text-xs text-zinc-500 font-mono tabular-nums mt-0.5">NIF: {f.fornecedor?.nif || "-"}</p>
                                             {f.observacoes && (
                                                <p className="text-xs text-zinc-500 italic mt-1 line-clamp-1" title={f.observacoes}>
                                                   &quot;{f.observacoes}&quot;
                                                </p>
                                             )}
                                          </td>
                                          <td className="px-4 py-3.5">
                                             {meta.centroCusto || meta.contaAnalise ? (
                                                <div className="space-y-0.5">
                                                   {meta.centroCusto && (
                                                      <p className="text-xs font-semibold text-blue-400">{meta.centroCusto}</p>
                                                   )}
                                                   {meta.contaAnalise && (
                                                      <p className="text-xs text-emerald-400">{meta.contaAnalise}</p>
                                                   )}
                                                </div>
                                             ) : (
                                                <span className="text-xs text-zinc-600">—</span>
                                             )}
                                          </td>
                                          <td className="px-4 py-3.5 space-y-1 text-xs text-zinc-400 font-mono tabular-nums">
                                             <div>Emissão: {f.data_emissao || "-"}</div>
                                             {f.data_vencimento && (
                                                <div className="flex items-center gap-1.5 text-amber-400/90 flex-wrap font-sans">
                                                   <span className="font-mono tabular-nums">Venc: {f.data_vencimento}</span>
                                                   {getVencimentoText(f.data_vencimento, f.status_pagamento)}
                                                </div>
                                             )}
                                          </td>
                                          <td className="px-4 py-3.5 text-right font-mono tabular-nums">
                                             <span className="text-sm font-semibold text-zinc-100">
                                                € {Number(f.valor_total).toLocaleString('pt-PT', {minimumFractionDigits:2})}
                                             </span>
                                          </td>
                                          <td className="px-4 py-3.5 text-center">
                                             {f.status_pagamento === 'pago' ? (
                                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400">
                                                   <CheckCircle2 className="w-3.5 h-3.5" /> Pago
                                                </span>
                                             ) : f.status_pagamento === 'parcial' ? (
                                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400">
                                                   <Clock className="w-3.5 h-3.5" /> Parcial
                                                </span>
                                             ) : (
                                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-400">
                                                   <Clock className="w-3.5 h-3.5" /> Pendente
                                                </span>
                                             )}
                                          </td>
                                          <td className="px-4 py-3.5 text-right font-mono tabular-nums">
                                             <span className={cn("text-sm font-semibold", Number(f.valor_pendente) > 0 ? "text-amber-400" : "text-zinc-500")}>
                                                € {Number(f.valor_pendente).toLocaleString('pt-PT', {minimumFractionDigits:2})}
                                             </span>
                                          </td>
                                       </tr>
                                       
                                       {isExpanded && f.installments.map((inst: any) => {
                                          const instMeta = extractFaturaMeta(inst, stores);
                                          return (
                                          <tr
                                             key={inst.id}
                                             className="bg-zinc-900/25 hover:bg-zinc-900/50 transition-colors cursor-pointer"
                                             onClick={() => { setSelectedFatura(inst); setIsDetailsModalOpen(true); }}
                                          >
                                             <td className="px-4 py-3 pl-10">
                                                <p className="text-xs font-semibold text-zinc-300">{inst.numero_fatura}</p>
                                             </td>
                                             <td className="px-4 py-3">
                                                <p className="text-xs font-medium text-zinc-400">{inst.fornecedor?.nome || "-"}</p>
                                             </td>
                                             <td className="px-4 py-3">
                                                <span className="text-xs text-zinc-500">{instMeta.centroCusto || "—"}</span>
                                             </td>
                                             <td className="px-4 py-3 text-xs text-zinc-400">
                                                {inst.data_vencimento && (
                                                   <div className="flex items-center gap-1.5 text-amber-400/90 flex-wrap">
                                                      <span className="font-mono tabular-nums">Venc: {inst.data_vencimento}</span>
                                                      {getVencimentoText(inst.data_vencimento, inst.status_pagamento)}
                                                   </div>
                                                )}
                                             </td>
                                             <td className="px-4 py-3 text-right font-mono tabular-nums">
                                                <span className="text-xs font-medium text-zinc-300">
                                                   € {Number(inst.valor_total).toLocaleString('pt-PT', {minimumFractionDigits:2})}
                                                </span>
                                             </td>
                                             <td className="px-4 py-3 text-center">
                                                {inst.status_pagamento === 'pago' ? (
                                                   <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400"><CheckCircle2 className="w-3 h-3" /> Pago</span>
                                                ) : inst.status_pagamento === 'parcial' ? (
                                                   <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-400"><Clock className="w-3 h-3" /> Parcial</span>
                                                ) : (
                                                   <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-400"><Clock className="w-3 h-3" /> Pendente</span>
                                                )}
                                             </td>
                                             <td className="px-4 py-3 text-right font-mono tabular-nums">
                                                <span className={cn("text-xs font-medium", Number(inst.valor_pendente) > 0 ? "text-amber-400" : "text-zinc-500")}>
                                                   € {Number(inst.valor_pendente).toLocaleString('pt-PT', {minimumFractionDigits:2})}
                                                </span>
                                             </td>
                                          </tr>
                                          );
                                       })}
                                    </React.Fragment>
                                    );
                                 })
                              )}
                           </tbody>
                        </table>
                        {groupedFaturas.length > displayCountFaturas && (
                          <div ref={loadMoreFaturasRef} className="w-full flex justify-center py-6">
                            <span className="px-6 py-3 text-zinc-500 font-medium tracking-tight text-sm">
                              Carregando mais itens...
                            </span>
                          </div>
                        )}
                     </div>
                  </div>
               )}
            </div>
            );
         })()}


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
                  <div className="inline-flex bg-black/40 p-1 rounded-lg border border-white/5 shadow-inner w-full sm:w-auto h-[38px]">
                     <button 
                        onClick={() => {
                           setFilterDataAReceber({...filterDataAReceber, periodo: 'mes'});
                           lazyLoadTab("fornecedores", "mes");
                        }}
                        className={`flex-1 sm:flex-none px-4 text-[10px] flex items-center justify-center font-black uppercase tracking-wider rounded-md transition-all ${
                          filterDataAReceber.periodo === 'mes' ? 'bg-amber-600 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                        }`}
                     >
                        Mensal
                     </button>
                     <button 
                        onClick={() => {
                           setFilterDataAReceber({...filterDataAReceber, periodo: 'ano'});
                           lazyLoadTab("fornecedores", "ano");
                        }}
                        className={`flex-1 sm:flex-none px-4 text-[10px] flex items-center justify-center font-black uppercase tracking-wider rounded-md transition-all ${
                          filterDataAReceber.periodo === 'ano' ? 'bg-amber-600 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                        }`}
                     >
                        Anual
                     </button>
                     <button 
                        onClick={() => {
                           setFilterDataAReceber({...filterDataAReceber, periodo: 'todos'});
                           lazyLoadTab("fornecedores", "todos");
                        }}
                        className={`flex-1 sm:flex-none px-4 text-[10px] flex items-center justify-center font-black uppercase tracking-wider rounded-md transition-all ${
                          filterDataAReceber.periodo === 'todos' ? 'bg-amber-600 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                        }`}
                     >
                        Todas
                     </button>
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
               <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wide mb-2">Nº de Parcelas (Meses)</label>
                  <input required type="number" min="1" step="1" value={formData.parcelas} onChange={e => setFormData({...formData, parcelas: parseInt(e.target.value) || 1})} className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 focus:border-blue-500 focus:bg-zinc-950 rounded-xl text-zinc-100 outline-none text-sm transition-colors" />
                  <p className="text-[10px] text-zinc-500 mt-2">
                     Se inserir 2 ou mais, o sistema lançará a despesa para os meses seguintes automaticamente (Ex: P1/2, P2/2).
                  </p>
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
                    const metodoLabels: Record<string, string> = {
                       transferencia: "Transferência",
                       dinheiro: "Dinheiro",
                       debito_direto: "Débito Direto",
                       pago: "Pago"
                    };
                    try {
                       if (selectedFatura.descrição) {
                          const desc = JSON.parse(selectedFatura.descrição);
                          if (desc.centro_custo || desc.conta_analise || desc.classificacao_nome || desc.forma_pagamento) {
                             const centroCusto = desc.centro_custo || (desc.classificacao_tipo !== "conta_analise" ? desc.classificacao_nome : "");
                             const contaAnalise = desc.conta_analise || (desc.classificacao_tipo === "conta_analise" ? desc.classificacao_nome : "");
                             return (
                                <div className="mt-1 space-y-0.5">
                                   {centroCusto && (
                                      <p className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">Centro de Custo: {centroCusto}</p>
                                   )}
                                   {contaAnalise && (
                                      <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Conta Análise: {contaAnalise}</p>
                                   )}
                                   {desc.forma_pagamento && (
                                      <p className="text-[11px] text-zinc-400">Forma de Pagamento: {metodoLabels[desc.forma_pagamento] || desc.forma_pagamento}</p>
                                   )}
                                </div>
                             );
                          }
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

                {selectedFatura.observacoes && (
                   <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                         <div className="w-1.5 h-4 bg-amber-500 rounded-full"></div>
                         <h3 className="text-xs font-bold text-amber-500 uppercase tracking-widest">Observações da Fatura</h3>
                      </div>
                      <p className="text-sm text-zinc-300 italic whitespace-pre-wrap">&quot;{selectedFatura.observacoes}&quot;</p>
                   </div>
                )}

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
                                       <p className="text-sm font-medium text-zinc-300 truncate max-w-[200px]" title={item.produto?.nome || item.descricao}>
                                          {item.produto?.nome || item.descricao || 'Artigo'}
                                       </p>
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

            <div className="p-5 border-t border-zinc-800 bg-zinc-900/50 flex flex-wrap gap-3 items-center justify-end">
               <button 
                  onClick={() => handleDeleteFatura(selectedFatura)} 
                  type="button" 
                  className="px-4 py-2.5 bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/30 text-sm font-semibold rounded-lg transition-all flex items-center gap-2 cursor-pointer"
                  title="Apagar esta fatura"
               >
                  <Trash2 className="w-4 h-4" />
                  Apagar Fatura
               </button>

               <button 
                  onClick={() => setIsDetailsModalOpen(false)} 
                  type="button" 
                  className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-semibold rounded-lg transition-colors cursor-pointer"
               >
                  Fechar Painel
               </button>

               {Number(selectedFatura.valor_pendente) > 0 && (
                  <button 
                     onClick={() => {
                        let initialMetodo = "transferencia";
                        try {
                           if (selectedFatura.descrição) {
                              const desc = JSON.parse(selectedFatura.descrição);
                              if (["transferencia", "dinheiro", "debito_direto", "mbway"].includes(desc.forma_pagamento)) {
                                 initialMetodo = desc.forma_pagamento;
                              }
                           }
                        } catch {}
                        setPayFormData({ valor: selectedFatura.valor_pendente, data_pagamento: new Date().toISOString().split("T")[0], metodo: initialMetodo });
                        setIsDetailsModalOpen(false);
                        setIsPayModalOpen(true);
                     }}
                     className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold text-sm rounded-lg shadow-sm transition-colors flex items-center gap-2 cursor-pointer"
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
                 fetchDados("faturas_compras");
                 setIsStoreModalOpen(false);
                 setActiveTab("faturas_compras");
                 const nextFilter = { ...DEFAULT_FATURAS_FILTER, centroCusto: `loja:${selectedStore.id}` };
                 setDraftFilterAPagar(nextFilter);
                 setAppliedFilterAPagar(nextFilter);
                 setSelectedStore(null);
             }} />}
          </div>
      </Modal>

      {/* Modal Nova Fatura */}
      <Modal isOpen={isPurchaseModalOpen} onClose={() => setIsPurchaseModalOpen(false)} title="Nova Fatura" maxWidth="page">
          <AdminPurchaseEntries
             compact={true}
             onSuccess={() => {
                setIsPurchaseModalOpen(false);
                setActiveTab("faturas_compras");
                fetchDados("faturas_compras");
             }}
          />
      </Modal>

    </div>
  );
}


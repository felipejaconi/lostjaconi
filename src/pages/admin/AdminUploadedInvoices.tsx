import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Receipt,
  Search,
  Calendar,
  Clock,
  CheckCircle2,
  FileText,
  Trash2,
  Plus,
  ArrowLeft,
  ChevronRight,
  Package,
} from "lucide-react";
import Swal from "sweetalert2";
import Decimal from "decimal.js";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { BrandTitle } from "../../components/BrandTitle";
import { cn } from "../../lib/utils";

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export default function AdminUploadedInvoices() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [faturas, setFaturas] = useState<any[]>([]);
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingPeriod, setIsFetchingPeriod] = useState(false);
  const [search, setSearch] = useState("");
  const loadedPeriodRef = useRef<"none" | "mes" | "ano" | "todos">("none");

  const [filterData, setFilterData] = useState({
    periodo: "mes",
    status: "todos",
    fornecedor: "todos",
  });

  const [selectedFatura, setSelectedFatura] = useState<any>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [displayCount, setDisplayCount] = useState<number>(30);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const loadMoreRef = React.useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) observerRef.current.disconnect();
    if (node) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            setDisplayCount((c) => c + 30);
          }
        },
        { threshold: 0.1 }
      );
      observerRef.current.observe(node);
    }
  }, []);

  const fetchDados = async (targetPeriod: "mes" | "ano" | "todos" = "mes", isInitial = false) => {
    try {
      if (isInitial) setIsLoading(true);
      else setIsFetchingPeriod(true);

      const requests: PromiseLike<any>[] = [api.get(`/admin/faturas?period=${targetPeriod}`)];
      if (isInitial) {
        requests.push(api.get("/admin/fornecedores"));
      }

      const [fatRes, fornRes] = await Promise.all(requests);
      const allFaturas = Array.isArray(fatRes.data) ? fatRes.data : [];
      const uploadedOnly = allFaturas.filter(
        (f: any) =>
          f.tipo === "entrada_stock" ||
          f.tipo === "compra" ||
          f.status_pagamento === "em_conferencia"
      );
      setFaturas(uploadedOnly);
      if (fornRes) {
        setFornecedores(Array.isArray(fornRes.data) ? fornRes.data : []);
      }
      loadedPeriodRef.current = targetPeriod;
    } catch (error) {
      console.error("Erro ao carregar faturas subidas:", error);
    } finally {
      setIsLoading(false);
      setIsFetchingPeriod(false);
    }
  };

  const handleChangePeriodo = (novoPeriodo: "mes" | "ano" | "todos") => {
    setFilterData((prev) => ({ ...prev, periodo: novoPeriodo }));
    setDisplayCount(30);

    const rank: Record<"none" | "mes" | "ano" | "todos", number> = {
      none: 0,
      mes: 1,
      ano: 2,
      todos: 3,
    };

    if (rank[novoPeriodo] > rank[loadedPeriodRef.current]) {
      fetchDados(novoPeriodo, false);
    }
  };

  useEffect(() => {
    fetchDados("mes", true);
  }, []);

  const toggleGroup = (groupId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const filterByPeriod = (dateString: string | null | undefined, period: string) => {
    if (period === "todos" || !dateString) return true;
    const date = new Date(dateString);
    const now = new Date();
    if (period === "mes") {
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }
    if (period === "ano") {
      return date.getFullYear() === now.getFullYear();
    }
    return true;
  };

  const isEmConferencia = (statusPagamento?: string | null) =>
    statusPagamento === "em_conferencia";

  const filteredFaturas = useMemo(() => {
    return faturas.filter((f) => {
      const textMatch =
        (f.numero_fatura || "").toLowerCase().includes(search.toLowerCase()) ||
        (f.fornecedor?.nome || "").toLowerCase().includes(search.toLowerCase());

      const periodMatch = filterByPeriod(f.data_emissao, filterData.periodo);

      let statusMatch = true;
      if (filterData.status === "conferencia") {
        statusMatch = isEmConferencia(f.status_pagamento);
      } else if (filterData.status === "conferido") {
        statusMatch = !isEmConferencia(f.status_pagamento);
      }

      const fornecedorMatch =
        filterData.fornecedor === "todos" || String(f.fornecedor_id) === filterData.fornecedor;

      return textMatch && periodMatch && statusMatch && fornecedorMatch;
    });
  }, [faturas, search, filterData]);

  const counts = useMemo(() => {
    let conferencia = 0;
    let conferido = 0;
    filteredFaturas.forEach((f) => {
      if (isEmConferencia(f.status_pagamento)) conferencia += 1;
      else conferido += 1;
    });
    return { conferencia, conferido };
  }, [filteredFaturas]);

  const groupedFaturas = useMemo(() => {
    const groups = new Map<string, any>();
    const result: any[] = [];

    filteredFaturas.forEach((f) => {
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
            fatura_itens: f.fatura_itens || [],
            installments: [],
            status_pagamento: "pendente",
            totalInstallments: Number(totalP),
          };
          groups.set(groupKey, groupObj);
          result.push(groupObj);
        }

        const group = groups.get(groupKey);
        group.installments.push(f);
      } else {
        result.push(f);
      }
    });

    groups.forEach((group) => {
      group.installments.sort((a: any, b: any) => {
        const aNum = Number(a.numero_fatura.match(/-P(\d+)\/\d+$/)?.[2] || 0);
        const bNum = Number(b.numero_fatura.match(/-P(\d+)\/\d+$/)?.[2] || 0);
        return aNum - bNum;
      });
      const hasPendingConferencia = group.installments.some((inst: any) =>
        isEmConferencia(inst.status_pagamento)
      );
      group.status_pagamento = hasPendingConferencia ? "em_conferencia" : "conferido";

      if (group.installments.length > 0) {
        group.data_emissao = group.installments[0].data_emissao;
        group.fatura_itens = group.installments[0].fatura_itens || [];
      }
    });

    return result;
  }, [filteredFaturas]);

  const handleDeleteFatura = async (fatura: any) => {
    if (user?.role !== "admin") return;
    const emConf = isEmConferencia(fatura.status_pagamento);
    const confirm = await Swal.fire({
      title: "Apagar Fatura?",
      text: emConf
        ? `Tem a certeza que deseja apagar a fatura #${fatura.numero_fatura} que ainda está em conferência?`
        : `Tem a certeza que deseja apagar a fatura #${fatura.numero_fatura}? O stock associado aos itens desta fatura será revertido no armazém.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sim, apagar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#27272a",
      background: "#18181b",
      color: "#f4f4f5",
    });

    if (!confirm.isConfirmed) return;

    try {
      await api.delete(`/admin/faturas/${fatura.id}`);
      setFaturas((prev) => prev.filter((item) => item.id !== fatura.id));
      setIsDetailsModalOpen(false);
      setSelectedFatura(null);
      Swal.fire({
        title: "Eliminada",
        text: emConf
          ? "Fatura em conferência apagada com sucesso."
          : "Fatura apagada e stock revertido com sucesso.",
        icon: "success",
        background: "#18181b",
        color: "#f4f4f5",
        confirmButtonColor: "#10b981",
      });
    } catch (err: any) {
      Swal.fire({
        title: "Erro",
        text: err.response?.data?.error || "Erro ao apagar fatura",
        icon: "error",
        background: "#18181b",
        color: "#f4f4f5",
      });
    }
  };

  return (
    <div className="pt-2 md:pt-4 pb-16">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-[#050505] pt-2 md:pt-4 pb-4 -mt-2 md:-mt-4 mb-4 w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <BrandTitle title="Faturas" titleClassName="-mt-7 pl-0 pt-0 ml-0" hideUnderline />
        <div className="flex items-center gap-3 -mt-6 sm:mt-0">
          <button
            onClick={() => navigate("/admin/armazem/fatura")}
            className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <ArrowLeft size={16} />
            <span>Voltar ao Registro</span>
          </button>
          <button
            onClick={() => navigate("/admin/armazem/fatura")}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <Plus size={16} />
            <span>Nova Fatura</span>
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64 w-full">
          <img
            src={`${
              import.meta.env.VITE_SUPABASE_URL || "https://ybaoaskddcmwoincsnwm.supabase.co"
            }/storage/v1/object/public/uploads/icon.png`}
            alt="Carregando..."
            className="w-8 h-8 animate-spin opacity-80"
          />
        </div>
      ) : (
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl shadow-sm flex flex-col h-full min-h-[500px]">
          {/* Filter Bar */}
          <div className="p-3 sm:p-4 border-b border-zinc-800 flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-end bg-zinc-950 rounded-t-2xl">
            <div className="relative w-full xl:w-auto flex flex-col gap-2.5">
              <div className="flex flex-wrap items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg shrink-0 w-fit shadow-sm">
                <Receipt className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-[11px] font-bold text-blue-300 uppercase tracking-wider">
                  CONFERÊNCIA DE PRODUTOS (STOCK)
                </span>
                <span className="text-[11px] font-semibold text-zinc-400 ml-1.5">
                  Conferência: <strong className="text-indigo-400">{counts.conferencia}</strong>
                </span>
                <span className="text-[11px] font-semibold text-zinc-400 ml-1.5">
                  Conferido: <strong className="text-emerald-400">{counts.conferido}</strong>
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative w-full sm:w-64 shrink-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Pesquisar fatura ou fornecedor..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 focus:border-zinc-600 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition-colors h-[38px]"
                  />
                </div>
                <div className="inline-flex bg-black/40 p-1 rounded-lg border border-white/5 shadow-inner w-full sm:w-auto h-[38px]">
                  <button
                    onClick={() => handleChangePeriodo("mes")}
                    className={`flex-1 sm:flex-none px-4 text-[10px] flex items-center justify-center font-black uppercase tracking-wider rounded-md transition-all cursor-pointer ${
                      filterData.periodo === "mes"
                        ? "bg-blue-600 text-white shadow-md"
                        : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
                    }`}
                  >
                    Mensal
                  </button>
                  <button
                    onClick={() => handleChangePeriodo("ano")}
                    className={`flex-1 sm:flex-none px-4 text-[10px] flex items-center justify-center font-black uppercase tracking-wider rounded-md transition-all cursor-pointer ${
                      filterData.periodo === "ano"
                        ? "bg-blue-600 text-white shadow-md"
                        : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
                    }`}
                  >
                    Anual
                  </button>
                  <button
                    onClick={() => handleChangePeriodo("todos")}
                    className={`flex-1 sm:flex-none px-4 text-[10px] flex items-center justify-center font-black uppercase tracking-wider rounded-md transition-all cursor-pointer ${
                      filterData.periodo === "todos"
                        ? "bg-blue-600 text-white shadow-md"
                        : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
                    }`}
                  >
                    Todas
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-nowrap sm:flex-wrap items-center gap-2 w-full xl:w-auto overflow-x-auto no-scrollbar pb-1 sm:pb-0">
              <div className="flex items-center gap-2 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg shrink-0 h-[38px]">
                <select
                  value={filterData.status}
                  onChange={(e) => setFilterData({ ...filterData, status: e.target.value })}
                  className="bg-transparent text-sm text-zinc-300 outline-none appearance-none"
                >
                  <option value="todos" className="bg-zinc-950">
                    Todos os Estados
                  </option>
                  <option value="conferencia" className="bg-zinc-950">
                    Conferência
                  </option>
                  <option value="conferido" className="bg-zinc-950">
                    Conferido
                  </option>
                </select>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg shrink-0 h-[38px]">
                <select
                  value={filterData.fornecedor}
                  onChange={(e) => setFilterData({ ...filterData, fornecedor: e.target.value })}
                  className="bg-transparent text-sm text-zinc-300 outline-none appearance-none max-w-[180px] truncate"
                >
                  <option value="todos" className="bg-zinc-950">
                    Fornecedores
                  </option>
                  {fornecedores.map((f) => (
                    <option key={f.id} value={f.id} className="bg-zinc-950">
                      {f.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-x-auto no-scrollbar">
            <table className="w-full text-left min-w-[720px]">
              <thead>
                <tr className="bg-zinc-900/50 border-b border-zinc-800">
                  <th className="p-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                    Documento
                  </th>
                  <th className="p-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                    Fornecedor
                  </th>
                  <th className="p-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="p-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider text-center">
                    Produtos
                  </th>
                  <th className="p-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider text-center">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {isFetchingPeriod ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center">
                      <img
                        src={`${
                          import.meta.env.VITE_SUPABASE_URL ||
                          "https://ybaoaskddcmwoincsnwm.supabase.co"
                        }/storage/v1/object/public/uploads/icon.png`}
                        alt="Carregando..."
                        className="w-7 h-7 animate-spin opacity-80 mx-auto mb-2"
                      />
                      <p className="text-zinc-500 text-xs font-medium">
                        A carregar faturas do período...
                      </p>
                    </td>
                  </tr>
                ) : filteredFaturas.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-10 text-center">
                      <FileText className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                      <p className="text-zinc-400 font-medium text-sm">
                        Nenhuma fatura encontrada neste período.
                      </p>
                      <button
                        onClick={() => navigate("/admin/armazem/fatura")}
                        className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-lg text-xs font-semibold transition-colors shadow-sm cursor-pointer"
                      >
                        <Plus size={14} />
                        Registar Nova Fatura
                      </button>
                    </td>
                  </tr>
                ) : (
                  groupedFaturas.slice(0, displayCount).map((f) => {
                    const isExpanded = f.isGroup && expandedGroups[f.id];
                    const itemCount = Array.isArray(f.fatura_itens) ? f.fatura_itens.length : 0;
                    const emConf = isEmConferencia(f.status_pagamento);

                    return (
                      <React.Fragment key={f.id}>
                        <tr
                          className={cn(
                            "transition-colors cursor-pointer",
                            isExpanded
                              ? "bg-zinc-800/30 border-l-2 border-l-transparent"
                              : "hover:bg-zinc-800/30 border-l-2 border-l-transparent"
                          )}
                          onClick={(e) => {
                            if (f.isGroup) toggleGroup(f.id, e);
                            else {
                              setSelectedFatura(f);
                              setIsDetailsModalOpen(true);
                            }
                          }}
                        >
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              {f.isGroup && (
                                <ChevronRight
                                  className={cn(
                                    "w-4 h-4 text-zinc-500 transition-transform",
                                    isExpanded && "rotate-90"
                                  )}
                                />
                              )}
                              <div>
                                <p className="text-sm font-bold text-zinc-100">
                                  {f.numero_fatura}
                                </p>
                                <p className="text-[10px] font-bold uppercase tracking-wider mt-0.5 text-blue-500">
                                  Entrada de Stock
                                  {f.isGroup && (
                                    <span className="text-zinc-500 ml-1">
                                      ({f.totalInstallments} parcelas)
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <p className="text-sm font-semibold text-zinc-300">
                              {f.fornecedor?.nome || "-"}
                            </p>
                            <p className="text-[11px] text-zinc-500 uppercase mt-0.5">
                              NIF: {f.fornecedor?.nif || "-"}
                            </p>
                            {f.observacoes && (
                              <p
                                className="text-[10px] text-zinc-400 italic mt-1.5 border-l border-amber-500/50 pl-2 line-clamp-1"
                                title={f.observacoes}
                              >
                                &quot;{f.observacoes}&quot;
                              </p>
                            )}
                          </td>
                          <td className="p-4 text-sm text-zinc-400">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5" />
                              <span className="text-[11px]">Em: {f.data_emissao}</span>
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 text-xs font-semibold text-zinc-300">
                              <Package className="w-3.5 h-3.5 text-zinc-500" />
                              {itemCount} {itemCount === 1 ? "produto" : "produtos"}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            {emConf ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-bold uppercase tracking-wider">
                                <Clock className="w-3 h-3" /> Conferência
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wider">
                                <CheckCircle2 className="w-3 h-3" /> Conferido
                              </span>
                            )}
                          </td>
                        </tr>

                        {isExpanded &&
                          f.installments.map((inst: any) => {
                            const instCount = Array.isArray(inst.fatura_itens)
                              ? inst.fatura_itens.length
                              : 0;
                            const instConf = isEmConferencia(inst.status_pagamento);
                            return (
                              <tr
                                key={inst.id}
                                className="bg-zinc-900/30 hover:bg-zinc-800/40 transition-colors cursor-pointer border-l-2 border-l-blue-500/50"
                                onClick={() => {
                                  setSelectedFatura(inst);
                                  setIsDetailsModalOpen(true);
                                }}
                              >
                                <td className="p-4 pl-10">
                                  <p className="text-sm font-bold text-zinc-300">
                                    {inst.numero_fatura}
                                  </p>
                                </td>
                                <td className="p-4">
                                  <p className="text-sm font-semibold text-zinc-300">
                                    {inst.fornecedor?.nome || "-"}
                                  </p>
                                  <p className="text-[11px] text-zinc-500 uppercase mt-0.5">
                                    NIF: {inst.fornecedor?.nif || "-"}
                                  </p>
                                </td>
                                <td className="p-4 text-sm text-zinc-400">
                                  <div className="flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5" />
                                    <span className="text-[11px]">Em: {inst.data_emissao}</span>
                                  </div>
                                </td>
                                <td className="p-4 text-center">
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 text-xs font-semibold text-zinc-300">
                                    <Package className="w-3.5 h-3.5 text-zinc-500" />
                                    {instCount} {instCount === 1 ? "produto" : "produtos"}
                                  </span>
                                </td>
                                <td className="p-4 text-center">
                                  {instConf ? (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-bold uppercase tracking-wider">
                                      <Clock className="w-3 h-3" /> Conferência
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wider">
                                      <CheckCircle2 className="w-3 h-3" /> Conferido
                                    </span>
                                  )}
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

            {groupedFaturas.length > displayCount && (
              <div ref={loadMoreRef} className="w-full flex justify-center py-6">
                <span className="px-6 py-3 text-zinc-500 font-medium tracking-tight text-sm">
                  Carregando mais itens...
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Conferência de Produtos da Fatura */}
      {isDetailsModalOpen &&
        selectedFatura &&
        (() => {
          const safeDecimal = (val: any): Decimal => {
            if (val === null || val === undefined || val === "" || isNaN(val))
              return new Decimal(0);
            try {
              return new Decimal(val);
            } catch {
              return new Decimal(0);
            }
          };

          const selectedEmConf = isEmConferencia(selectedFatura.status_pagamento);
          const totalProdutos = Array.isArray(selectedFatura.fatura_itens)
            ? selectedFatura.fatura_itens.length
            : 0;

          return (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
              <div className="bg-zinc-950 rounded-2xl w-full max-w-4xl border border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-zinc-800 flex justify-between items-start bg-zinc-900/30">
                  <div>
                    <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-500" /> Conferência:{" "}
                      {selectedFatura.numero_fatura}
                    </h2>
                    <p className="text-sm font-medium text-zinc-400 mt-1">
                      {selectedFatura.fornecedor?.nome}
                    </p>
                  </div>
                  <div className="text-right">
                    {selectedEmConf ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-md text-xs font-bold uppercase tracking-wide">
                        <Clock size={14} /> Conferência
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-md text-xs font-bold uppercase tracking-wide">
                        <CheckCircle2 size={14} /> Conferido
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-6 flex-1 overflow-y-auto no-scrollbar space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/80">
                      <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest mb-1">
                        Data Emissão
                      </p>
                      <p className="text-sm font-semibold text-zinc-100">
                        {selectedFatura.data_emissao}
                      </p>
                    </div>
                    <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/80">
                      <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest mb-1">
                        Fornecedor
                      </p>
                      <p className="text-sm font-semibold text-zinc-100 truncate">
                        {selectedFatura.fornecedor?.nome || "-"}
                      </p>
                    </div>
                    <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/80">
                      <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest mb-1">
                        Produtos na Fatura
                      </p>
                      <p className="text-sm font-bold text-blue-400">
                        {totalProdutos} {totalProdutos === 1 ? "artigo" : "artigos"}
                      </p>
                    </div>
                  </div>

                  {selectedFatura.observacoes && (
                    <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-1.5 h-4 bg-amber-500 rounded-full"></div>
                        <h3 className="text-xs font-bold text-amber-500 uppercase tracking-widest">
                          Observações da Fatura
                        </h3>
                      </div>
                      <p className="text-sm text-zinc-300 italic whitespace-pre-wrap">
                        &quot;{selectedFatura.observacoes}&quot;
                      </p>
                    </div>
                  )}

                  <div>
                    <h3 className="text-sm font-semibold text-zinc-200 mb-3 border-b border-zinc-800 pb-2">
                      Produtos para Conferência
                    </h3>
                    {selectedFatura.fatura_itens && selectedFatura.fatura_itens.length > 0 ? (
                      <div className="bg-zinc-900/30 border border-zinc-800/80 rounded-xl overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="border-b border-zinc-800">
                              <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest whitespace-nowrap">
                                Artigo
                              </th>
                              <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-right whitespace-nowrap">
                                QTD
                              </th>
                              <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-right whitespace-nowrap">
                                Custo Uni.
                              </th>
                              <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-right whitespace-nowrap">
                                IVA
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-800/50">
                            {selectedFatura.fatura_itens.map((item: any) => {
                              const c = safeDecimal(item.preco_custo || item.preco_unitario);
                              const ivaPerc =
                                item.iva !== null && item.iva !== undefined
                                  ? safeDecimal(item.iva)
                                  : safeDecimal(item.produto?.iva);

                              return (
                                <tr
                                  key={item.id}
                                  className="hover:bg-zinc-800/30 transition-colors"
                                >
                                  <td className="px-4 py-3">
                                    <p
                                      className="text-sm font-medium text-zinc-200"
                                      title={item.produto?.nome || item.descricao}
                                    >
                                      {item.produto?.nome || item.descricao || "Artigo"}
                                    </p>
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <span className="text-sm font-semibold text-zinc-200 bg-zinc-900 px-2.5 py-1 rounded border border-zinc-800">
                                      {item.quantidade}{" "}
                                      <span className="text-[10px] text-zinc-400 uppercase">
                                        {item.produto?.unidade_base ||
                                          item.produto?.unidade_medida ||
                                          "un"}
                                      </span>
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-right text-sm text-zinc-400 font-medium">
                                    €{" "}
                                    {c
                                      .toDecimalPlaces(4, Decimal.ROUND_HALF_UP)
                                      .toNumber()
                                      .toLocaleString("pt-PT", {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 4,
                                      })}
                                  </td>
                                  <td className="px-4 py-3 text-right text-sm text-zinc-500">
                                    {ivaPerc.toNumber()}%
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="bg-zinc-900/30 border border-zinc-800/80 rounded-xl p-8 text-center">
                        <Package className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                        <p className="text-sm text-zinc-500">
                          Nenhum produto registado nesta fatura.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-5 border-t border-zinc-800 bg-zinc-900/50 flex flex-wrap gap-3 items-center justify-end">
                  {user?.role === "admin" && (
                    <button
                      onClick={() => handleDeleteFatura(selectedFatura)}
                      type="button"
                      className="px-4 py-2.5 bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/30 text-sm font-semibold rounded-lg transition-all flex items-center gap-2 cursor-pointer"
                      title="Apagar esta fatura"
                    >
                      <Trash2 className="w-4 h-4" />
                      Apagar Fatura
                    </button>
                  )}

                  <button
                    onClick={() => setIsDetailsModalOpen(false)}
                    type="button"
                    className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    Fechar Painel
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
}

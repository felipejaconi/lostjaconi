import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  AlertCircle,
  CheckCircle2,
  PackageSearch,
  ChevronDown,
  ChevronUp,
  Store,
  Printer,
  Maximize2,
  Minimize2,
  X,
  Package,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import api from "../../lib/api";
import { sortCategories } from "../../lib/categoryUtils";

type OrderDetail = {
  orderId: string;
  status?: string;
  storeName: string;
  requestedQty: number;
  displayQty: number;
  originalUnit: string;
  date: string;
};

type ShortageItem = {
  id: string | number;
  nome: string;
  barcode_ean: string | null;
  imagem_url: string | null;
  categoria_id: string | number | null;
  categoria_nome: string;
  unidade_base: string;
  stock_armazem: number;
  requested: number;
  diff: number;
  needsAttention: boolean;
  aproxSuggestion: string | null;
  orders: OrderDetail[];
};

interface AdminStockCountsProps {
  categories?: any[];
}

function formatQty(value: number): string {
  if (!Number.isFinite(value)) return "0";
  const rounded = Math.round(value * 1000) / 1000;
  if (Number.isInteger(rounded)) return rounded.toLocaleString("pt-PT");
  return rounded.toLocaleString("pt-PT", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  });
}

export default function AdminStockCounts({ categories: initialCategories }: AdminStockCountsProps) {
  const [categories, setCategories] = useState<any[]>(
    Array.isArray(initialCategories) ? initialCategories : []
  );

  // Inputs controlados apenas localmente (só disparam requisição ao clicar em Pesquisar)
  const [inputQuery, setInputQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");

  // Estado da última pesquisa executada
  const [hasSearched, setHasSearched] = useState(false);
  const [lastMode, setLastMode] = useState<"search" | "rupturas">("search");
  const [lastSearchLabel, setLastSearchLabel] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [validationHint, setValidationHint] = useState<string | null>(null);

  const [results, setResults] = useState<ShortageItem[]>([]);
  const [pendingOrdersCount, setPendingOrdersCount] = useState<number>(0);

  // Refinamentos locais rápidos sobre os resultados já pesquisados
  const [statusFilter, setStatusFilter] = useState<"all" | "missing" | "requested" | "sufficient">("all");
  const [sortBy, setSortBy] = useState<"missing_first" | "name" | "stock_desc">("missing_first");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (Array.isArray(initialCategories) && initialCategories.length > 0) {
      setCategories(initialCategories);
      return;
    }
    let active = true;
    api
      .get("/categorias")
      .then((res) => {
        if (active && Array.isArray(res.data)) {
          setCategories(sortCategories(res.data));
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [initialCategories]);

  const executeQuery = async (mode: "search" | "rupturas", queryText: string, catId: string) => {
    const trimmed = queryText.trim();
    if (mode === "search" && !trimmed && (!catId || catId === "all")) {
      setValidationHint("Digite o nome/EAN do artigo ou selecione uma categoria antes de pesquisar.");
      return;
    }

    setValidationHint(null);
    setErrorMsg(null);
    setLoading(true);
    setHasSearched(true);
    setLastMode(mode);
    setExpandedRows(new Set());

    const catObj = categories.find((c) => String(c.id) === String(catId));
    if (mode === "rupturas") {
      setLastSearchLabel("Rupturas em pedidos pendentes");
      setStatusFilter("all");
    } else {
      const parts: string[] = [];
      if (trimmed) parts.push(`"${trimmed}"`);
      if (catObj) parts.push(catObj.nome);
      else if (catId === "null") parts.push("Sem Categoria");
      setLastSearchLabel(parts.join(" · ") || "Pesquisa personalizada");
    }

    try {
      const res = await api.get<{ items?: ShortageItem[]; pendingOrdersCount?: number }>(
        "/admin/stock/faltas",
        {
          params: {
            mode,
            q: trimmed || undefined,
            categoria_id: catId !== "all" ? catId : undefined,
          },
        }
      );
      const items = Array.isArray(res.data?.items) ? res.data.items : [];
      setResults(items);
      setPendingOrdersCount(Number(res.data?.pendingOrdersCount) || 0);
    } catch (err: any) {
      console.error("Erro ao pesquisar faltas:", err);
      setErrorMsg(err?.response?.data?.error || "Não foi possível concluir a pesquisa. Tente novamente.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeQuery("search", inputQuery, selectedCategoryId);
  };

  const handleReset = () => {
    setInputQuery("");
    setSelectedCategoryId("all");
    setHasSearched(false);
    setResults([]);
    setExpandedRows(new Set());
    setStatusFilter("all");
    setErrorMsg(null);
    setValidationHint(null);
  };

  const filteredResults = useMemo(() => {
    const filtered = results.filter((item) => {
      if (statusFilter === "missing") return item.needsAttention;
      if (statusFilter === "requested") return item.requested > 0;
      if (statusFilter === "sufficient") return item.diff >= 0 && item.stock_armazem > 0;
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === "missing_first") {
        if (a.needsAttention && !b.needsAttention) return -1;
        if (!a.needsAttention && b.needsAttention) return 1;
        if (a.requested > 0 && b.requested === 0) return -1;
        if (a.requested === 0 && b.requested > 0) return 1;
        return (a.nome || "").localeCompare(b.nome || "");
      }
      if (sortBy === "stock_desc") {
        return b.stock_armazem - a.stock_armazem;
      }
      return (a.nome || "").localeCompare(b.nome || "");
    });
  }, [results, statusFilter, sortBy]);

  const metrics = useMemo(() => {
    let inStock = 0;
    let requested = 0;
    let missing = 0;
    for (const item of results) {
      if (item.stock_armazem > 0) inStock++;
      if (item.requested > 0) requested++;
      if (item.needsAttention) missing++;
    }
    return {
      total: results.length,
      inStock,
      requested,
      missing,
    };
  }, [results]);

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleExpandAll = () => {
    const expandableIds = filteredResults
      .filter((i) => i.orders.length > 0)
      .map((i) => String(i.id));
    if (expandableIds.length === 0) return;
    if (expandedRows.size >= expandableIds.length) {
      setExpandedRows(new Set());
    } else {
      setExpandedRows(new Set(expandableIds));
    }
  };

  const handlePrint = () => {
    const expandableIds = filteredResults
      .filter((i) => i.orders.length > 0)
      .map((i) => String(i.id));
    setExpandedRows(new Set(expandableIds));
    setTimeout(() => {
      window.print();
    }, 300);
  };

  const expandableCount = filteredResults.filter((i) => i.orders.length > 0).length;

  return (
    <div className="pt-1 pb-24 space-y-6 print:p-0 print:pb-0 print:bg-white print:text-black">
      <style>
        {`
          @media print {
            body { background: white !important; color: black !important; -webkit-print-color-adjust: exact; }
            .print\\:hidden { display: none !important; }
            .print\\:block { display: block !important; }
            nav, header, aside, [role="navigation"], .sidebar { display: none !important; }
            table { font-size: 11px !important; color: black !important; width: 100% !important; page-break-inside: auto; }
            tr { page-break-inside: avoid; page-break-after: auto; }
            thead { display: table-header-group; }
          }
        `}
      </style>

      {/* Barra de Pesquisa Sob Demanda */}
      <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4 print:hidden">
        <form onSubmit={handleSearchSubmit}>
          <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
              <input
                type="text"
                value={inputQuery}
                onChange={(e) => {
                  setInputQuery(e.target.value);
                  if (validationHint) setValidationHint(null);
                }}
                placeholder="Digite o nome do artigo ou código EAN..."
                className="w-full h-11 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 focus:border-blue-500 rounded-xl pl-10 pr-10 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none transition-colors"
              />
              {inputQuery && (
                <button
                  type="button"
                  onClick={() => setInputQuery("")}
                  aria-label="Limpar texto"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-1 rounded-md transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="relative sm:w-56 shrink-0">
              <select
                value={selectedCategoryId}
                onChange={(e) => {
                  setSelectedCategoryId(e.target.value);
                  if (validationHint) setValidationHint(null);
                }}
                className="w-full h-11 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 focus:border-blue-500 rounded-xl pl-3.5 pr-9 text-sm text-zinc-200 outline-none appearance-none cursor-pointer transition-colors"
              >
                <option value="all">Todas as Categorias</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={String(cat.id)}>
                    {cat.nome}
                  </option>
                ))}
                <option value="null">Sem Categoria</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 sm:flex-none h-11 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.99] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-all shadow-sm whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
              >
                <Search className="w-4 h-4" />
                <span>{loading && lastMode === "search" ? "A pesquisar..." : "Pesquisar"}</span>
              </button>

              <button
                type="button"
                onClick={() => executeQuery("rupturas", inputQuery, selectedCategoryId)}
                disabled={loading}
                className="h-11 px-4 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
              >
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>Ver Rupturas Pendentes</span>
              </button>

              {hasSearched && (
                <button
                  type="button"
                  onClick={handleReset}
                  title="Limpar pesquisa"
                  className="h-11 px-4 rounded-xl border border-zinc-800 bg-zinc-950 hover:bg-zinc-800 text-zinc-300 text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span className="hidden sm:inline">Limpar</span>
                </button>
              )}

              {hasSearched && filteredResults.length > 0 && (
                <button
                  type="button"
                  onClick={handlePrint}
                  className="h-11 px-4 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir</span>
                </button>
              )}
            </div>
          </div>

          {validationHint && (
            <p className="mt-2.5 text-xs text-amber-400 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{validationHint}</span>
            </p>
          )}
        </form>
      </div>

      {/* Cabeçalho exclusivo para impressão */}
      <div className="hidden print:block mb-6 pb-4 border-b border-gray-300">
        <h1 className="text-xl font-bold text-black">Relatório de Faltas e Necessidades</h1>
        <p className="text-xs text-gray-700 mt-1">
          Consulta: {lastSearchLabel || "Geral"} · Emitido em {new Date().toLocaleString("pt-PT")}
        </p>
      </div>

      {/* Área Principal de Conteúdo */}
      {!hasSearched ? (
        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl px-6 py-16 text-center flex flex-col items-center justify-center print:hidden">
          <div className="w-12 h-12 rounded-xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-zinc-300 mb-4">
            <PackageSearch className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-zinc-100">
            Pronto para pesquisar
          </h3>
          <p className="text-sm text-zinc-400 max-w-md mt-1.5 leading-relaxed">
            Para manter a página leve e imediata, os artigos só são carregados quando pesquisar pelo nome/EAN, escolher uma categoria ou consultar as rupturas ativas.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => executeQuery("rupturas", "", "all")}
              className="px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800/90 hover:bg-zinc-800 text-zinc-100 text-xs font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer"
            >
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>Consultar Rupturas Pendentes Agora</span>
            </button>
          </div>
        </div>
      ) : loading ? (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden print:hidden">
          <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
            <div className="h-4 w-48 bg-zinc-800 rounded animate-pulse" />
            <div className="h-4 w-32 bg-zinc-800 rounded animate-pulse" />
          </div>
          <div className="divide-y divide-zinc-800/60">
            {[0, 1, 2, 3, 4].map((idx) => (
              <div key={idx} className="px-5 py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 rounded-lg bg-zinc-800 animate-pulse shrink-0" />
                  <div className="space-y-2 flex-1 max-w-xs">
                    <div className="h-3.5 w-3/4 bg-zinc-800 rounded animate-pulse" />
                    <div className="h-2.5 w-1/2 bg-zinc-800/70 rounded animate-pulse" />
                  </div>
                </div>
                <div className="h-4 w-20 bg-zinc-800 rounded animate-pulse" />
                <div className="h-4 w-20 bg-zinc-800 rounded animate-pulse" />
                <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      ) : errorMsg ? (
        <div className="bg-zinc-900/60 border border-rose-500/30 rounded-2xl p-8 text-center flex flex-col items-center print:hidden">
          <AlertCircle className="w-8 h-8 text-rose-400 mb-3" />
          <p className="text-sm font-semibold text-zinc-100">{errorMsg}</p>
          <button
            type="button"
            onClick={() => executeQuery(lastMode, inputQuery, selectedCategoryId)}
            className="mt-4 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 transition-colors cursor-pointer"
          >
            Tentar Novamente
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Barra de Resumo e Refinamento Rápido */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4 print:hidden">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-zinc-400">
              <span>
                Consulta: <strong className="text-zinc-100 font-semibold">{lastSearchLabel}</strong>
              </span>
              <span aria-hidden="true" className="text-zinc-700">·</span>
              <span className="tabular-nums">
                <strong className="text-zinc-100 font-mono">{metrics.total}</strong> {metrics.total === 1 ? "artigo" : "artigos"}
              </span>
              <span aria-hidden="true" className="text-zinc-700">·</span>
              <span className="tabular-nums">
                <strong className="text-zinc-100 font-mono">{pendingOrdersCount}</strong> {pendingOrdersCount === 1 ? "pedido aberto" : "pedidos abertos"}
              </span>
              <span aria-hidden="true" className="text-zinc-700">·</span>
              <span className={`tabular-nums ${metrics.missing > 0 ? "text-rose-400 font-semibold" : "text-emerald-400"}`}>
                <strong className="font-mono">{metrics.missing}</strong> em ruptura
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Filtro segmentado funcional */}
              <div className="flex items-center p-1 bg-zinc-950 border border-zinc-800 rounded-xl overflow-x-auto no-scrollbar">
                {[
                  { id: "all", label: "Todos" },
                  { id: "missing", label: "Em Falta" },
                  { id: "requested", label: "Com Pedido" },
                  { id: "sufficient", label: "Stock OK" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStatusFilter(tab.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      statusFilter === tab.id
                        ? "bg-zinc-800 text-zinc-100 shadow-xs"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Ordenação */}
              <div className="relative shrink-0">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="h-9 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 rounded-xl pl-3 pr-8 text-xs font-medium text-zinc-300 outline-none appearance-none cursor-pointer"
                >
                  <option value="missing_first">Rupturas primeiro</option>
                  <option value="name">Ordem alfabética</option>
                  <option value="stock_desc">Maior stock</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
              </div>

              {expandableCount > 0 && (
                <button
                  type="button"
                  onClick={toggleExpandAll}
                  className="h-9 px-3 rounded-xl border border-zinc-800 bg-zinc-950 hover:bg-zinc-800 text-xs font-medium text-zinc-300 inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {expandedRows.size >= expandableCount ? (
                    <>
                      <Minimize2 className="w-3.5 h-3.5" />
                      <span>Recolher Lojas</span>
                    </>
                  ) : (
                    <>
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span>Expandir Lojas</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Tabela de Resultados */}
          {filteredResults.length === 0 ? (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl px-6 py-14 text-center flex flex-col items-center">
              <CheckCircle2 className="w-9 h-9 text-zinc-600 mb-3" />
              <p className="text-sm font-semibold text-zinc-200">
                {lastMode === "rupturas"
                  ? "Nenhuma ruptura encontrada nos pedidos pendentes"
                  : "Nenhum artigo corresponde a estes critérios"}
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                {lastMode === "rupturas"
                  ? "Todo o stock solicitado pelas lojas nos pedidos abertos está coberto pelo armazém."
                  : "Ajuste o termo pesquisado ou altere o filtro de situação acima."}
              </p>
            </div>
          ) : (
            <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl overflow-hidden print:border-gray-300 print:rounded-none print:bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[720px] print:min-w-0">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-950/60 print:bg-gray-100 print:border-gray-300">
                      <th className="py-3.5 pl-5 pr-3 text-xs font-semibold text-zinc-400 print:text-black">
                        Artigo
                      </th>
                      <th className="py-3.5 px-4 text-xs font-semibold text-zinc-400 text-right print:text-black">
                        Stock Armazém
                      </th>
                      <th className="py-3.5 px-4 text-xs font-semibold text-zinc-400 text-right print:text-black">
                        Pedido pelas Lojas
                      </th>
                      <th className="py-3.5 pl-4 pr-5 text-xs font-semibold text-zinc-400 text-right print:text-black">
                        Saldo / Situação
                      </th>
                      <th className="py-3.5 pr-4 w-10 print:hidden" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 print:divide-gray-200">
                    {filteredResults.map((item) => {
                      const rowId = String(item.id);
                      const isExpanded = expandedRows.has(rowId);
                      const hasOrders = item.orders.length > 0;
                      const isMissing = item.needsAttention;

                      return (
                        <React.Fragment key={rowId}>
                          <tr
                            onClick={() => hasOrders && toggleRow(rowId)}
                            className={`transition-colors ${
                              hasOrders ? "cursor-pointer hover:bg-zinc-800/40" : "hover:bg-zinc-800/20"
                            } ${isMissing ? "bg-rose-500/[0.03] print:bg-red-50" : ""}`}
                          >
                            <td className="py-3.5 pl-5 pr-3">
                              <div className="flex items-center gap-3.5">
                                <div className="w-10 h-10 rounded-lg bg-zinc-950 border border-zinc-800 overflow-hidden flex items-center justify-center shrink-0 print:hidden">
                                  {item.imagem_url ? (
                                    <img
                                      src={item.imagem_url}
                                      alt={item.nome}
                                      referrerPolicy="no-referrer"
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        e.currentTarget.style.display = "none";
                                      }}
                                    />
                                  ) : (
                                    <Package className="w-4 h-4 text-zinc-600" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-zinc-100 truncate max-w-[340px] print:text-black print:max-w-none">
                                    {item.nome}
                                  </p>
                                  <div className="flex items-center gap-1.5 text-xs text-zinc-500 mt-0.5 print:text-gray-600">
                                    <span>{item.categoria_nome}</span>
                                    {item.barcode_ean && (
                                      <>
                                        <span aria-hidden="true">·</span>
                                        <span className="font-mono tabular-nums">EAN {item.barcode_ean}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="py-3.5 px-4 text-right align-middle">
                              <span
                                className={`font-mono tabular-nums text-sm font-semibold ${
                                  item.stock_armazem <= 0
                                    ? "text-rose-400 print:text-black"
                                    : "text-zinc-100 print:text-black"
                                }`}
                              >
                                {formatQty(item.stock_armazem)}
                              </span>{" "}
                              <span className="text-xs text-zinc-500 print:text-gray-600">
                                {item.unidade_base}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 text-right align-middle">
                              {item.requested > 0 ? (
                                <div>
                                  <span className="font-mono tabular-nums text-sm font-semibold text-amber-400 print:text-black">
                                    {formatQty(item.requested)}
                                  </span>{" "}
                                  <span className="text-xs text-zinc-500 print:text-gray-600">
                                    {item.unidade_base}
                                  </span>
                                  <p className="text-[11px] text-zinc-500 mt-0.5 print:text-gray-600">
                                    {item.orders.length} {item.orders.length === 1 ? "pedido" : "pedidos"}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-xs text-zinc-500 print:text-gray-500">
                                  Sem pedidos
                                </span>
                              )}
                            </td>

                            <td className="py-3.5 pl-4 pr-5 text-right align-middle">
                              {isMissing ? (
                                <div className="inline-flex flex-col items-end">
                                  <span className="inline-flex items-center gap-1.5 text-sm font-bold font-mono tabular-nums text-rose-400 print:text-red-700">
                                    <AlertCircle className="w-3.5 h-3.5 shrink-0 print:hidden" />
                                    <span>
                                      Faltam {formatQty(Math.abs(item.diff))} {item.unidade_base}
                                    </span>
                                  </span>
                                  {item.aproxSuggestion && (
                                    <span className="text-[11px] text-rose-300/80 mt-0.5 print:text-red-700">
                                      {item.aproxSuggestion}
                                    </span>
                                  )}
                                </div>
                              ) : item.requested > 0 ? (
                                <div className="inline-flex flex-col items-end">
                                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold font-mono tabular-nums text-emerald-400 print:text-green-700">
                                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 print:hidden" />
                                    <span>
                                      +{formatQty(item.diff)} {item.unidade_base}
                                    </span>
                                  </span>
                                  <span className="text-[11px] text-zinc-500 mt-0.5 print:text-gray-600">
                                    Stock suficiente
                                  </span>
                                </div>
                              ) : (
                                <span className="font-mono tabular-nums text-sm text-zinc-400 print:text-black">
                                  {formatQty(item.diff)} {item.unidade_base}
                                </span>
                              )}
                            </td>

                            <td className="py-3.5 pr-4 text-right align-middle print:hidden">
                              {hasOrders && (
                                <button
                                  type="button"
                                  aria-label={isExpanded ? "Recolher lojas" : "Ver lojas"}
                                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="w-4 h-4" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4" />
                                  )}
                                </button>
                              )}
                            </td>
                          </tr>

                          {isExpanded && hasOrders && (
                            <tr>
                              <td
                                colSpan={5}
                                className="bg-zinc-950/70 px-6 py-4 border-t border-zinc-800/60 print:bg-gray-50 print:px-3"
                              >
                                <div className="flex items-center justify-between mb-3">
                                  <span className="text-xs font-semibold text-zinc-300 inline-flex items-center gap-1.5 print:text-black">
                                    <Store className="w-3.5 h-3.5 text-zinc-400 print:hidden" />
                                    <span>Pedidos abertos por loja</span>
                                  </span>
                                  {isMissing && (
                                    <span className="text-xs text-rose-400 print:text-red-700">
                                      Stock insuficiente para cobrir a totalidade pedida ({formatQty(item.stock_armazem)} {item.unidade_base} disponíveis para {formatQty(item.requested)} {item.unidade_base} pedidos).
                                    </span>
                                  )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 print:grid-cols-2">
                                  {item.orders.map((ord, idx) => (
                                    <div
                                      key={`${ord.orderId}-${idx}`}
                                      className="px-3.5 py-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-between gap-3 print:bg-white print:border-gray-300"
                                    >
                                      <div className="min-w-0">
                                        <p className="text-xs font-semibold text-zinc-100 truncate print:text-black">
                                          {ord.storeName}
                                        </p>
                                        <p className="text-[11px] text-zinc-500 mt-0.5 print:text-gray-600">
                                          {new Date(ord.date).toLocaleDateString("pt-PT")} ·{" "}
                                          {ord.status === "processando" || ord.status === "em_processamento"
                                            ? "Em preparação"
                                            : "Pendente"}
                                        </p>
                                      </div>
                                      <div className="text-right shrink-0">
                                        <p className="text-sm font-bold font-mono tabular-nums text-amber-400 print:text-black">
                                          {formatQty(ord.displayQty)}{" "}
                                          <span className="text-xs font-normal text-zinc-400 print:text-gray-600">
                                            {ord.originalUnit}
                                          </span>
                                        </p>
                                        {ord.originalUnit !== item.unidade_base && (
                                          <p className="text-[11px] font-mono tabular-nums text-zinc-500 print:text-gray-600">
                                            = {formatQty(ord.requestedQty)} {item.unidade_base}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

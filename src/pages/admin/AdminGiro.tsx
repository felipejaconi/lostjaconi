import React, { useState, useEffect, useMemo } from "react";
import { EyeOff, Package, RotateCcw, Search } from "lucide-react";
import api from "../../lib/api";
import { BrandTitle } from "../../components/BrandTitle";
import Swal from "sweetalert2";

type SortOrderType = "alpha" | "highest" | "lowest" | "zero";

interface GiroFilterState {
  searchTerm: string;
  selectedStore: string;
  selectedPeriod: string;
  sortOrder: SortOrderType;
}

function getDefaultPeriod(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function AdminGiro() {
  const defaultFilter = useMemo<GiroFilterState>(
    () => ({
      searchTerm: "",
      selectedStore: "all",
      selectedPeriod: getDefaultPeriod(),
      sortOrder: "alpha",
    }),
    [],
  );

  const [stores, setStores] = useState<{ id: string; name: string }[]>([]);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [draftFilter, setDraftFilter] = useState<GiroFilterState>(defaultFilter);
  const [appliedFilter, setAppliedFilter] = useState<GiroFilterState>(defaultFilter);

  const monthOptions = useMemo(() => {
    const options: { key: string; label: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
      options.push({ key, label: label.charAt(0).toUpperCase() + label.slice(1) });
    }
    return options;
  }, []);

  // Carrega apenas a lista leve de lojas para popular o seletor sem puxar o giro pesado
  useEffect(() => {
    let active = true;
    api
      .get("/admin/users")
      .then((res) => {
        if (!active) return;
        const storeUsers = ((res.data as any[]) || [])
          .filter((u: any) => u.role === "loja")
          .map((u: any) => ({ id: String(u.id), name: String(u.name || "Loja") }))
          .sort((a, b) => a.name.localeCompare(b.name, "pt-PT"));
        setStores(storeUsers);
      })
      .catch((err) => {
        console.error("Erro ao carregar lojas:", err);
      });
    return () => {
      active = false;
    };
  }, []);

  const handlePesquisar = async () => {
    const nextFilter = { ...draftFilter };
    setAppliedFilter(nextFilter);
    setHasSearched(true);

    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (nextFilter.selectedStore !== "all") {
        params.loja_id = nextFilter.selectedStore;
      }
      const res = await api.get("/admin/giro", { params });
      setData(Array.isArray(res.data) ? res.data : []);
    } catch (error: any) {
      console.error("Erro ao buscar giro:", error);
      Swal.fire({
        icon: "error",
        title: "Erro",
        text: "Não foi possível carregar a análise de giro.",
        background: "#1a1a1a",
        color: "#fff",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLimpar = () => {
    const clean = {
      searchTerm: "",
      selectedStore: "all",
      selectedPeriod: getDefaultPeriod(),
      sortOrder: "alpha" as SortOrderType,
    };
    setDraftFilter(clean);
    setAppliedFilter(clean);
    setData([]);
    setHasSearched(false);
  };

  const availableStores = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    for (const s of stores) {
      map.set(String(s.id), { id: String(s.id), name: s.name });
    }
    for (const item of data) {
      if (item?.loja_id && item?.loja_nome && !map.has(String(item.loja_id))) {
        map.set(String(item.loja_id), {
          id: String(item.loja_id),
          name: String(item.loja_nome),
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, "pt-PT"));
  }, [stores, data]);

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      if (
        appliedFilter.selectedStore !== "all" &&
        String(item.loja_id) !== String(appliedFilter.selectedStore)
      ) {
        return false;
      }
      if (appliedFilter.searchTerm.trim()) {
        const q = appliedFilter.searchTerm.trim().toLowerCase();
        const lojaMatch = String(item.loja_nome || "").toLowerCase().includes(q);
        const prodMatch = String(item.produto_nome || "").toLowerCase().includes(q);
        if (!lojaMatch && !prodMatch) {
          return false;
        }
      }
      return true;
    });
  }, [data, appliedFilter]);

  const productsSummary = useMemo(() => {
    const map = new Map<string, any>();
    for (const item of filteredData) {
      if (!map.has(item.produto_id)) {
        map.set(item.produto_id, {
          produto_id: item.produto_id,
          produto_nome: item.produto_nome,
          total_ano: 0,
          total_mes: 0,
          total_semana: 0,
          total_dia: 0,
        });
      }
      const p = map.get(item.produto_id)!;
      if (appliedFilter.selectedPeriod === "ano") {
        p.total_ano += item.total_ano || 0;
      } else {
        p.total_ano += item.totals_by_month?.[appliedFilter.selectedPeriod] || 0;
      }
      p.total_mes += item.total_mes || 0;
      p.total_semana += item.total_semana || 0;
      p.total_dia += item.total_dia || 0;
    }

    let result = Array.from(map.values());

    if (appliedFilter.sortOrder === "alpha") {
      result.sort((a, b) => a.produto_nome.localeCompare(b.produto_nome, "pt-PT"));
    } else if (appliedFilter.sortOrder === "highest") {
      result.sort((a, b) => b.total_ano - a.total_ano);
    } else if (appliedFilter.sortOrder === "lowest") {
      result = result.filter((p) => p.total_ano > 0).sort((a, b) => a.total_ano - b.total_ano);
    } else if (appliedFilter.sortOrder === "zero") {
      result = result
        .filter((p) => p.total_ano === 0)
        .sort((a, b) => a.produto_nome.localeCompare(b.produto_nome, "pt-PT"));
    }

    return result;
  }, [filteredData, appliedFilter.sortOrder, appliedFilter.selectedPeriod]);

  const appliedPeriodLabel =
    appliedFilter.selectedPeriod === "ano"
      ? "Total do Ano"
      : monthOptions.find((o) => o.key === appliedFilter.selectedPeriod)?.label || "Mês";

  const appliedStoreLabel =
    appliedFilter.selectedStore === "all"
      ? "Todas as Lojas"
      : availableStores.find((s) => String(s.id) === String(appliedFilter.selectedStore))?.name ||
        "Loja Selecionada";

  return (
    <div className="flex flex-col min-h-[calc(100vh-80px)] bg-[#050505] px-4 md:px-6 lg:px-8 pt-4 md:pt-6 pb-32 space-y-5">
      <div>
        <BrandTitle
          title="Média de consumo"
          hideUnderline
          titleClassName="!text-2xl sm:!text-3xl !m-0 !p-0 text-left"
        />
      </div>

      {/* Painel de Filtros sob demanda */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* 1. Loja */}
          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">
              Loja
            </label>
            <select
              value={draftFilter.selectedStore}
              onChange={(e) =>
                setDraftFilter({ ...draftFilter, selectedStore: e.target.value })
              }
              className="w-full px-3 h-10 bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 focus:border-blue-500/60 rounded-xl text-sm text-zinc-200 outline-none transition-colors"
            >
              <option value="all">Todas as Lojas</option>
              {availableStores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Período */}
          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">
              Período
            </label>
            <select
              value={draftFilter.selectedPeriod}
              onChange={(e) =>
                setDraftFilter({ ...draftFilter, selectedPeriod: e.target.value })
              }
              className="w-full px-3 h-10 bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 focus:border-blue-500/60 rounded-xl text-sm text-zinc-200 outline-none transition-colors"
            >
              <option value="ano">Total do Ano</option>
              {monthOptions.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Ordenação / Giro */}
          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">
              Ordenação / Giro
            </label>
            <select
              value={draftFilter.sortOrder}
              onChange={(e) =>
                setDraftFilter({
                  ...draftFilter,
                  sortOrder: e.target.value as SortOrderType,
                })
              }
              className="w-full px-3 h-10 bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 focus:border-blue-500/60 rounded-xl text-sm text-zinc-200 outline-none transition-colors"
            >
              <option value="alpha">Ordem Alfabética</option>
              <option value="highest">Mais Saem</option>
              <option value="lowest">Menos Saem</option>
              <option value="zero">Não Saem</option>
            </select>
          </div>

          {/* 4. Pesquisa por produto / loja */}
          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">
              Produto / Pesquisa
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar loja ou produto..."
                value={draftFilter.searchTerm}
                onChange={(e) =>
                  setDraftFilter({ ...draftFilter, searchTerm: e.target.value })
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handlePesquisar();
                  }
                }}
                className="w-full pl-9 pr-3 h-10 bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 focus:border-blue-500/60 rounded-xl text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Botões Limpar + Pesquisar */}
        <div className="mt-4 pt-3.5 border-t border-zinc-800/70 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={handleLimpar}
            className="px-4 h-10 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-zinc-100 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            title="Limpar filtros e ocultar lista"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Limpar
          </button>
          <button
            type="button"
            onClick={handlePesquisar}
            disabled={loading}
            className="px-6 h-10 bg-blue-600 hover:bg-blue-500 active:scale-[0.99] disabled:opacity-50 text-white rounded-xl text-xs font-bold tracking-wide transition-all flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Search className="w-4 h-4" />
            {loading ? "A carregar..." : "Pesquisar"}
          </button>
        </div>
      </div>

      {/* Área de Resultados (Oculta até clicar em Pesquisar) */}
      {!hasSearched ? (
        <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl py-16 px-6 text-center">
          <div className="w-11 h-11 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-3.5 text-zinc-400">
            <Search className="w-5 h-5" />
          </div>
          <p className="text-sm font-semibold text-zinc-200">
            Os dados de consumo estão ocultos até realizar a pesquisa
          </p>
          <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto">
            Selecione a loja, o período, a ordenação ou pesquise um produto acima e clique em Pesquisar.
          </p>
        </div>
      ) : loading ? (
        <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl py-20 px-6 flex flex-col items-center justify-center gap-3">
          <img
            src="/pwa-192x192.png"
            alt="Carregando..."
            className="w-10 h-10 animate-spin opacity-80"
          />
          <p className="text-xs text-zinc-400 font-medium">A carregar análise de consumo...</p>
        </div>
      ) : productsSummary.length === 0 ? (
        <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl py-16 px-6 flex flex-col items-center justify-center text-slate-500">
          <Package size={44} className="mb-3 opacity-25" />
          <p className="text-base font-bold text-white mb-1">Sem Resultados</p>
          <p className="text-xs text-zinc-500">
            Nenhum registo de consumo encontrado para os filtros selecionados.
          </p>
        </div>
      ) : (
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col">
          {/* Barra de Resumo */}
          <div className="px-5 py-3.5 bg-zinc-900/40 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
              <div>
                <span className="text-zinc-500">Produtos: </span>
                <span className="font-mono tabular-nums font-semibold text-zinc-200">
                  {productsSummary.length}
                </span>
              </div>
              <span className="text-zinc-800 hidden sm:inline">·</span>
              <div>
                <span className="text-zinc-500">Loja: </span>
                <span className="font-semibold text-zinc-200">{appliedStoreLabel}</span>
              </div>
              <span className="text-zinc-800 hidden sm:inline">·</span>
              <div>
                <span className="text-zinc-500">Período: </span>
                <span className="font-semibold text-blue-400">{appliedPeriodLabel}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setHasSearched(false)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
            >
              <EyeOff className="w-3.5 h-3.5" />
              Ocultar Lista
            </button>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-sm whitespace-nowrap min-w-[680px]">
              <thead>
                <tr className="bg-zinc-900/50 border-b border-zinc-800 text-zinc-400">
                  <th className="px-4 py-3 font-semibold uppercase text-[10px] tracking-wider w-12">
                    #
                  </th>
                  <th className="px-4 py-3 font-semibold uppercase text-[10px] tracking-wider">
                    Produto
                  </th>
                  <th className="px-4 py-3 font-semibold uppercase text-[10px] tracking-wider text-right">
                    {appliedFilter.selectedPeriod === "ano" ? "Total Ano" : appliedPeriodLabel}
                  </th>
                  <th className="px-4 py-3 font-semibold uppercase text-[10px] tracking-wider text-right">
                    Total Mês
                  </th>
                  <th className="px-4 py-3 font-semibold uppercase text-[10px] tracking-wider text-right">
                    Total Semana
                  </th>
                  <th className="px-4 py-3 font-semibold uppercase text-[10px] tracking-wider text-right">
                    Total Dia
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {productsSummary.map((p, idx) => (
                  <tr
                    key={p.produto_id || p.produto_nome}
                    className="hover:bg-zinc-900/40 transition-colors"
                  >
                    <td className="px-4 py-3 text-zinc-500 font-mono tabular-nums text-xs">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-3 font-bold text-white text-sm">{p.produto_nome}</td>
                    <td className="px-4 py-3 text-zinc-200 text-right font-mono tabular-nums text-base">
                      {Number(p.total_ano).toLocaleString("pt-PT", { maximumFractionDigits: 1 })}
                    </td>
                    <td className="px-4 py-3 text-zinc-300 text-right font-mono tabular-nums text-base">
                      {Number(p.total_mes).toLocaleString("pt-PT", { maximumFractionDigits: 1 })}
                    </td>
                    <td className="px-4 py-3 text-zinc-300 text-right font-mono tabular-nums text-base">
                      {Number(p.total_semana).toLocaleString("pt-PT", {
                        maximumFractionDigits: 1,
                      })}
                    </td>
                    <td className="px-4 py-3 text-zinc-300 text-right font-mono tabular-nums text-base">
                      {Number(p.total_dia).toLocaleString("pt-PT", { maximumFractionDigits: 1 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

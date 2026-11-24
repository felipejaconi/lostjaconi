import React, { useState, useEffect } from "react";
import api from "../../lib/api";
import { Lock, Plus, Save, Trash2 } from "lucide-react";
import Swal from "sweetalert2";

interface StoreDREProps {
  storeId: string;
  month: number;
  year: number;
  totalVendas: number;
  totalCompras: number;
}

interface DespesaFinanceiroItem {
  conta_analise: string;
  valor: number;
  quantidade_faturas: number;
}

interface GastoManualItem {
  id: string;
  descricao: string;
  valor: number;
}

interface DREApiResponse {
  centro_custo?: string;
  despesas_financeiro?: DespesaFinanceiroItem[];
  gastos_manuais?: GastoManualItem[];
}

export function StoreDRE({ storeId, month, year, totalVendas, totalCompras }: StoreDREProps) {
  const [centroCusto, setCentroCusto] = useState<string>("");
  const [despesasFinanceiro, setDespesasFinanceiro] = useState<DespesaFinanceiroItem[]>([]);
  const [gastosManuais, setGastosManuais] = useState<GastoManualItem[]>([]);

  const [novaDescricao, setNovaDescricao] = useState("");
  const [novoValor, setNovoValor] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!storeId) return;
    let active = true;
    setLoading(true);
    setIsDirty(false);

    api
      .get<DREApiResponse>(
        `/loja/dre?store_id=${encodeURIComponent(storeId)}&month=${month + 1}&year=${year}`
      )
      .then((res) => {
        if (!active) return;
        const payload: DREApiResponse = (res.data as DREApiResponse) || {};
        setCentroCusto(String(payload.centro_custo || ""));
        setDespesasFinanceiro(
          Array.isArray(payload.despesas_financeiro) ? payload.despesas_financeiro : []
        );
        setGastosManuais(Array.isArray(payload.gastos_manuais) ? payload.gastos_manuais : []);
        setLoading(false);
      })
      .catch((e) => {
        console.error("Erro ao carregar D.R.E.:", e);
        if (!active) return;
        setDespesasFinanceiro([]);
        setGastosManuais([]);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [storeId, month, year]);

  const persistManualExpenses = async (nextList: GastoManualItem[], showToast = false) => {
    setIsSaving(true);
    try {
      const res = await api.put<DREApiResponse>("/loja/dre", {
        store_id: storeId,
        month: month + 1,
        year,
        gastos_manuais: nextList,
      });
      const data = (res.data as DREApiResponse) || {};
      if (Array.isArray(data.gastos_manuais)) {
        setGastosManuais(data.gastos_manuais);
      }
      setIsDirty(false);
      if (showToast) {
        Swal.fire("Sucesso", "Gastos manuais guardados com sucesso!", "success");
      }
    } catch (e) {
      console.error("Erro ao guardar D.R.E.:", e);
      Swal.fire("Erro", "Não foi possível guardar os gastos manuais.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddManual = async (e: React.FormEvent) => {
    e.preventDefault();
    const desc = novaDescricao.trim();
    const val = Number(novoValor.replace(",", "."));
    if (!desc) return;
    const safeVal = Number.isFinite(val) && val >= 0 ? Math.round(val * 100) / 100 : 0;

    const newItem: GastoManualItem = {
      id:
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      descricao: desc.toUpperCase(),
      valor: safeVal,
    };

    const updated = [...gastosManuais, newItem];
    setGastosManuais(updated);
    setNovaDescricao("");
    setNovoValor("");
    await persistManualExpenses(updated, false);
  };

  const handleRemoveManual = async (id: string) => {
    const updated = gastosManuais.filter((g) => g.id !== id);
    setGastosManuais(updated);
    await persistManualExpenses(updated, false);
  };

  const handleUpdateManual = (id: string, field: "descricao" | "valor", rawValue: string) => {
    setIsDirty(true);
    setGastosManuais((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        if (field === "descricao") {
          return { ...item, descricao: rawValue };
        }
        const parsed = Number(rawValue);
        return { ...item, valor: Number.isFinite(parsed) && parsed >= 0 ? parsed : 0 };
      })
    );
  };

  const totalFinanceiro = despesasFinanceiro.reduce((acc, item) => acc + (Number(item.valor) || 0), 0);
  const totalManuais = gastosManuais.reduce((acc, item) => acc + (Number(item.valor) || 0), 0);
  const totalDespesas = totalCompras + totalFinanceiro + totalManuais;
  const resultadoFinal = totalVendas - totalDespesas;
  const resultadoPct = totalVendas > 0 ? (resultadoFinal / totalVendas) * 100 : 0;

  if (loading) {
    return (
      <div className="animate-pulse h-64 bg-[#0a0a0a] border border-white/10 rounded-3xl mb-8" />
    );
  }

  return (
    <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl shadow-2xl mb-8 overflow-hidden">
      <div className="p-6 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/[0.02]">
        <div>
          <h3 className="text-lg font-black text-white tracking-widest uppercase">
            Demonstração de Resultados (D.R.E.)
          </h3>
          {centroCusto && (
            <p className="text-xs text-slate-400 mt-1">
              Centro de Custo: <span className="text-slate-200 font-semibold">{centroCusto}</span>
            </p>
          )}
        </div>

        {gastosManuais.length > 0 && (
          <button
            type="button"
            onClick={() => persistManualExpenses(gastosManuais, true)}
            disabled={isSaving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-2 self-start sm:self-auto cursor-pointer"
          >
            <Save size={14} />
            {isSaving ? "A GUARDAR..." : isDirty ? "GUARDAR ALTERAÇÕES" : "GUARDAR D.R.E."}
          </button>
        )}
      </div>

      <div className="overflow-x-auto no-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-black/50 border-b border-white/10">
              <th className="p-3 pl-6 text-[10px] font-black text-slate-500 uppercase tracking-widest w-1/2">
                Categoria / Conta de Análise
              </th>
              <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right w-1/4">
                Valor (€)
              </th>
              <th className="p-3 pr-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right w-1/4">
                Impacto (%)
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {/* Vendas Header */}
            <tr className="bg-emerald-500/5">
              <td className="p-3 text-xs font-black text-emerald-400 uppercase pl-6">
                <div className="flex items-center gap-2">
                  <Lock size={12} className="text-emerald-500/70 shrink-0" />
                  <span>TOTAL DE VENDAS</span>
                </div>
              </td>
              <td className="p-3 text-xs font-black text-emerald-400 text-right">
                {totalVendas.toFixed(2)} €
              </td>
              <td className="p-3 pr-6 text-xs font-black text-emerald-400 text-right">100.00%</td>
            </tr>

            {/* Distribuidora (Automático) */}
            <tr className="bg-rose-500/5">
              <td className="p-3 text-xs font-black text-rose-400 uppercase pl-6">
                <div className="flex items-center gap-2">
                  <Lock size={12} className="text-rose-500/70 shrink-0" />
                  <span>TOTAL DE DESP DISTRIBUIDORA</span>
                </div>
              </td>
              <td className="p-3 text-xs font-black text-rose-400 text-right">
                {totalCompras.toFixed(2)} €
              </td>
              <td className="p-3 pr-6 text-xs font-black text-rose-400 text-right">
                {totalVendas > 0 ? ((totalCompras / totalVendas) * 100).toFixed(2) : "0.00"}%
              </td>
            </tr>

            {/* Despesas vindas do Financeiro (Somente Leitura — Centro de Custo + Conta de Análise) */}
            {despesasFinanceiro.map((item) => {
              const pct = totalVendas > 0 ? (item.valor / totalVendas) * 100 : 0;
              return (
                <tr key={`fin-${item.conta_analise}`} className="hover:bg-white/[0.03] transition-colors">
                  <td className="p-3 pl-6 text-xs font-bold text-white uppercase">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Lock size={12} className="text-slate-500 shrink-0" />
                      <span>{item.conta_analise}</span>
                      <span className="text-[11px] font-normal text-slate-500 normal-case">
                        · Financeiro
                      </span>
                    </div>
                  </td>
                  <td className="p-3 text-xs font-bold text-rose-400 text-right">
                    {item.valor.toFixed(2)} €
                  </td>
                  <td className="p-3 pr-6 text-xs font-bold text-slate-400 text-right">
                    {pct.toFixed(2)}%
                  </td>
                </tr>
              );
            })}

            {/* Outros Gastos Adicionados Manualmente pela Loja */}
            {gastosManuais.map((gasto) => {
              const val = Number(gasto.valor) || 0;
              const pct = totalVendas > 0 ? (val / totalVendas) * 100 : 0;
              return (
                <tr key={gasto.id} className="hover:bg-white/[0.03] transition-colors group">
                  <td className="p-2 pl-6">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={gasto.descricao}
                        onChange={(e) => handleUpdateManual(gasto.id, "descricao", e.target.value)}
                        onBlur={() => {
                          if (isDirty) persistManualExpenses(gastosManuais, false);
                        }}
                        placeholder="Descrição do gasto"
                        className="w-full max-w-[280px] bg-black/50 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white uppercase outline-none focus:border-blue-500/50"
                      />
                      <span className="text-[11px] font-normal text-slate-500 hidden sm:inline">
                        · Manual
                      </span>
                    </div>
                  </td>
                  <td className="p-2 text-right">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={gasto.valor === 0 ? "" : gasto.valor}
                      onChange={(e) => handleUpdateManual(gasto.id, "valor", e.target.value)}
                      onBlur={() => {
                        if (isDirty) persistManualExpenses(gastosManuais, false);
                      }}
                      placeholder="0.00"
                      className="w-full max-w-[120px] bg-black/50 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-bold text-rose-400 outline-none text-right focus:border-blue-500/50"
                    />
                  </td>
                  <td className="p-2 pr-6 text-right">
                    <div className="inline-flex items-center justify-end gap-3">
                      <span className="text-xs font-bold text-slate-400">{pct.toFixed(2)}%</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveManual(gasto.id)}
                        title="Remover gasto manual"
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {/* Total de Despesas */}
            <tr className="bg-rose-500/5 border-t border-rose-500/20">
              <td className="p-4 pl-6 text-sm font-black text-rose-400 uppercase">
                TOTAL DE DESPESAS
              </td>
              <td className="p-4 text-sm font-black text-rose-400 text-right">
                {totalDespesas.toFixed(2)} €
              </td>
              <td className="p-4 pr-6 text-sm font-black text-rose-400 text-right">
                {(totalVendas > 0 ? (totalDespesas / totalVendas) * 100 : 0).toFixed(2)}%
              </td>
            </tr>

            {/* Resultado Final */}
            <tr className="bg-blue-500/10 border-t-2 border-blue-500/30">
              <td className="p-4 pl-6 text-sm font-black text-blue-400 uppercase">
                RESULTADO FINAL
              </td>
              <td
                className={`p-4 text-sm font-black text-right ${
                  resultadoFinal >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {resultadoFinal.toFixed(2)} €
              </td>
              <td
                className={`p-4 pr-6 text-sm font-black text-right ${
                  resultadoFinal >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {resultadoPct.toFixed(2)}%
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Formulário para a loja adicionar outros gastos manualmente */}
      <form
        onSubmit={handleAddManual}
        className="p-4 sm:p-6 border-t border-white/10 bg-white/[0.01] flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
      >
        <input
          type="text"
          value={novaDescricao}
          onChange={(e) => setNovaDescricao(e.target.value)}
          placeholder="Adicionar outro gasto manual (ex: Despesa extra de loja)"
          maxLength={120}
          className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-semibold text-white placeholder:text-slate-500 outline-none focus:border-blue-500/50"
        />
        <input
          type="number"
          step="0.01"
          min="0"
          value={novoValor}
          onChange={(e) => setNovoValor(e.target.value)}
          placeholder="Valor (€)"
          className="w-full sm:w-36 bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold text-white placeholder:text-slate-500 outline-none text-right focus:border-blue-500/50"
        />
        <button
          type="submit"
          disabled={isSaving || !novaDescricao.trim()}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 shrink-0 cursor-pointer"
        >
          <Plus size={15} />
          Adicionar Gasto
        </button>
      </form>
    </div>
  );
}

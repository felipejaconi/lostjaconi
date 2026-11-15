import React, { useState, useEffect, useMemo } from "react";
import { Save } from "lucide-react";
import Swal from "sweetalert2";
import api from "../../lib/api";
import { SearchableCombobox } from "../../components/ui/SearchableCombobox";
import Decimal from "decimal.js";

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

const DEFAULT_CONTAS_ANALISE = [
  "Compras de Mercadorias",
  "Matérias-Primas e Subsidiárias",
  "Bebidas e Cafetaria",
  "Embalagens e Consumíveis",
  "FSE - Fornecimentos e Serviços Externos",
  "Equipamentos e Utensílios",
  "Outras Compras",
];

export default function AdminPurchaseEntries({
  onSuccess,
  lojaId,
  compact = false,
}: {
  onSuccess?: () => void;
  lojaId?: string;
  compact?: boolean;
}) {
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [existingFaturas, setExistingFaturas] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Classificação acima de Entidade (Fornecedor): Centro de Custo vs Conta Análise
  const [classificacaoTipo, setClassificacaoTipo] = useState<"centro_custo" | "conta_analise">(
    "centro_custo"
  );
  const [useNovaClassificacao, setUseNovaClassificacao] = useState(false);
  const [centroCustoSelecionado, setCentroCustoSelecionado] = useState<string>(
    lojaId ? `loja:${lojaId}` : "armazem_central"
  );
  const [contaAnaliseSelecionada, setContaAnaliseSelecionada] = useState<string>("");
  const [classificacaoNova, setClassificacaoNova] = useState<string>("");

  const [useNovaEntidade, setUseNovaEntidade] = useState(false);
  const [fornecedorExistente, setFornecedorExistente] = useState("");
  const [fornecedorNovo, setFornecedorNovo] = useState("");

  const [numeroFatura, setNumeroFatura] = useState("");
  const [formaPagamento, setFormaPagamento] = useState<
    "transferencia" | "dinheiro" | "debito_direto" | "pago"
  >("transferencia");
  const [dataFatura, setDataFatura] = useState(new Date().toISOString().split("T")[0]);
  const [dataVencimento, setDataVencimento] = useState("");
  const [valorLiquido, setValorLiquido] = useState("");
  const [valorIva, setValorIva] = useState("");
  const [parcelas, setParcelas] = useState(1);
  const [observacoes, setObservacoes] = useState("");

  const { parsedLiquidoCalc, parsedIvaCalc, parsedTotalCalc } = useMemo(() => {
    const liq =
      valorLiquido !== "" && !isNaN(Number(valorLiquido)) && Number(valorLiquido) >= 0
        ? new Decimal(valorLiquido)
        : new Decimal(0);
    const iva =
      valorIva !== "" && !isNaN(Number(valorIva)) && Number(valorIva) >= 0
        ? new Decimal(valorIva)
        : new Decimal(0);
    const tot = liq.plus(iva);
    return {
      parsedLiquidoCalc: liq,
      parsedIvaCalc: iva,
      parsedTotalCalc: tot,
    };
  }, [valorLiquido, valorIva]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [resForn, resUsers, resFaturas] = await Promise.all([
        api.get("/admin/fornecedores").catch(() => ({ data: [] })),
        api.get("/admin/users").catch(() => ({ data: [] })),
        api.get("/admin/faturas").catch(() => ({ data: [] })),
      ]);
      setFornecedores(resForn.data || []);
      setStores(
        (resUsers.data || [])
          .filter((u: any) => u.role === "loja")
          .sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""))
      );
      setExistingFaturas(Array.isArray(resFaturas.data) ? resFaturas.data : []);
    } catch (err) {
      console.error(err);
    }
  };

  // Extrai Centros de Custo e Contas de Análise personalizados já usados anteriormente
  const customHistory = useMemo(() => {
    const centros = new Set<string>();
    const contas = new Set<string>();
    const storeNames = new Set(stores.map((s) => (s.name || "").toLowerCase()));
    const builtInCentros = new Set([
      "armazém central",
      "administração / sede",
      "logística / frota",
    ]);
    const builtInContas = new Set(DEFAULT_CONTAS_ANALISE.map((c) => c.toLowerCase()));

    existingFaturas.forEach((f) => {
      if (!f?.descrição) return;
      try {
        const parsed = typeof f.descrição === "string" ? JSON.parse(f.descrição) : f.descrição;
        const nome = String(parsed?.classificacao_nome || "").trim();
        if (!nome) return;
        if (parsed.classificacao_tipo === "conta_analise") {
          if (!builtInContas.has(nome.toLowerCase())) contas.add(nome);
        } else if (parsed.classificacao_tipo === "centro_custo") {
          if (!builtInCentros.has(nome.toLowerCase()) && !storeNames.has(nome.toLowerCase())) {
            centros.add(nome);
          }
        }
      } catch {}
    });

    return {
      centros: Array.from(centros).sort((a, b) => a.localeCompare(b)),
      contas: Array.from(contas).sort((a, b) => a.localeCompare(b)),
    };
  }, [existingFaturas, stores]);

  const resolveClassificacao = () => {
    if (useNovaClassificacao) {
      const clean = classificacaoNova.trim();
      if (!clean) {
        throw new Error(
          classificacaoTipo === "centro_custo"
            ? "Informe o nome do Centro de Custo"
            : "Informe o nome da Conta Análise"
        );
      }
      return {
        classificacao_tipo: classificacaoTipo,
        classificacao_nome: clean,
        loja_id: lojaId || null,
      };
    }

    if (classificacaoTipo === "centro_custo") {
      if (!centroCustoSelecionado) {
        throw new Error("Selecione um Centro de Custo");
      }
      if (centroCustoSelecionado === "armazem_central") {
        return {
          classificacao_tipo: "centro_custo" as const,
          classificacao_nome: "Armazém Central",
          loja_id: null,
        };
      }
      if (centroCustoSelecionado === "administracao") {
        return {
          classificacao_tipo: "centro_custo" as const,
          classificacao_nome: "Administração / Sede",
          loja_id: null,
        };
      }
      if (centroCustoSelecionado === "logistica_frota") {
        return {
          classificacao_tipo: "centro_custo" as const,
          classificacao_nome: "Logística / Frota",
          loja_id: null,
        };
      }
      if (centroCustoSelecionado.startsWith("loja:")) {
        const sId = centroCustoSelecionado.replace("loja:", "");
        const st = stores.find((s) => String(s.id) === String(sId));
        return {
          classificacao_tipo: "centro_custo" as const,
          classificacao_nome: st?.name || "Loja",
          loja_id: sId,
        };
      }
      return {
        classificacao_tipo: "centro_custo" as const,
        classificacao_nome: centroCustoSelecionado,
        loja_id: lojaId || null,
      };
    } else {
      if (!contaAnaliseSelecionada) {
        throw new Error("Selecione uma Conta Análise");
      }
      return {
        classificacao_tipo: "conta_analise" as const,
        classificacao_nome: contaAnaliseSelecionada,
        loja_id: lojaId || null,
      };
    }
  };

  const handleSave = async () => {
    try {
      const classif = resolveClassificacao();

      if (!numeroFatura.trim()) throw new Error("Número da fatura é obrigatório");
      if (!useNovaEntidade && !fornecedorExistente)
        throw new Error("Selecione um fornecedor ou crie um novo");
      if (useNovaEntidade && !fornecedorNovo.trim())
        throw new Error("Nome do novo fornecedor é obrigatório");
      if (!dataFatura) throw new Error("Data de emissão é obrigatória");
      if (valorLiquido === "" || isNaN(Number(valorLiquido)) || Number(valorLiquido) < 0)
        throw new Error("Informe um Valor Líquido válido");
      if (valorIva !== "" && (isNaN(Number(valorIva)) || Number(valorIva) < 0))
        throw new Error("Informe um valor de IVA (Crédito) válido");

      const parsedLiquido = parsedLiquidoCalc;
      const parsedIva = parsedIvaCalc;
      const parsedTotal = parsedTotalCalc;

      if (parsedTotal.lessThanOrEqualTo(0)) {
        throw new Error("O Valor Total (Valor Líquido + IVA) deve ser maior que zero");
      }

      setIsProcessing(true);

      const numParcelas = Number(parcelas) || 1;
      let payloadToSubmit: any = [];

      if (numParcelas > 1) {
        const [year, month, day] = dataFatura.split("-");
        const currentEmissao = new Date(Number(year), Number(month) - 1, Number(day));

        let currentVencimento: Date;
        if (dataVencimento) {
          const [vYear, vMonth, vDay] = dataVencimento.split("-");
          currentVencimento = new Date(Number(vYear), Number(vMonth) - 1, Number(vDay));
        } else {
          currentVencimento = new Date(currentEmissao.getTime());
        }

        const pad = (n: number) => String(n).padStart(2, "0");
        const formatD = (d: Date) =>
          `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

        for (let i = 0; i < numParcelas; i++) {
          const suffix = `-P${i + 1}/${numParcelas}`;
          payloadToSubmit.push({
            fornecedor_id: useNovaEntidade ? null : fornecedorExistente,
            novo_fornecedor_nome: useNovaEntidade ? fornecedorNovo.trim() : null,
            numero_fatura: `${numeroFatura.trim()}${suffix}`,
            forma_pagamento: formaPagamento,
            data_fatura: formatD(currentEmissao),
            data_vencimento: formatD(currentVencimento),
            valor_liquido: parsedLiquido.toDecimalPlaces(2).toNumber(),
            valor_iva: parsedIva.toDecimalPlaces(2).toNumber(),
            valor_total: parsedTotal.toDecimalPlaces(2).toNumber(),
            observacoes: observacoes.trim() || null,
            loja_id: classif.loja_id,
            classificacao_tipo: classif.classificacao_tipo,
            classificacao_nome: classif.classificacao_nome,
          });

          currentEmissao.setMonth(currentEmissao.getMonth() + 1);
          currentVencimento.setMonth(currentVencimento.getMonth() + 1);
        }
      } else {
        payloadToSubmit = {
          fornecedor_id: useNovaEntidade ? null : fornecedorExistente,
          novo_fornecedor_nome: useNovaEntidade ? fornecedorNovo.trim() : null,
          numero_fatura: numeroFatura.trim(),
          forma_pagamento: formaPagamento,
          data_fatura: dataFatura,
          data_vencimento: dataVencimento || dataFatura,
          valor_liquido: parsedLiquido.toDecimalPlaces(2).toNumber(),
          valor_iva: parsedIva.toDecimalPlaces(2).toNumber(),
          valor_total: parsedTotal.toDecimalPlaces(2).toNumber(),
          observacoes: observacoes.trim() || null,
          loja_id: classif.loja_id,
          classificacao_tipo: classif.classificacao_tipo,
          classificacao_nome: classif.classificacao_nome,
        };
      }

      await api.post("/admin/faturas/compras", payloadToSubmit);

      Swal.fire({
        icon: "success",
        title: "Fatura de Compra Registrada",
        text:
          numParcelas > 1
            ? `A fatura de compra foi lançada em ${numParcelas} parcelas com sucesso.`
            : formaPagamento === "pago"
            ? "A fatura de compra foi lançada já marcada como paga."
            : "A fatura de compra foi incluída em Faturas a Pagar (Compras) com sucesso.",
        confirmButtonColor: "#2563eb",
        background: "#18181b",
        color: "#fff",
      });

      setNumeroFatura("");
      setFormaPagamento("transferencia");
      setValorLiquido("");
      setValorIva("");
      setObservacoes("");
      setClassificacaoNova("");
      setUseNovaClassificacao(false);
      setParcelas(1);
      if (onSuccess) onSuccess();
    } catch (error: any) {
      Swal.fire({
        icon: "error",
        title: "Erro ao salvar",
        text: error.response?.data?.error || error.message,
        confirmButtonColor: "#ef4444",
        background: "#18181b",
        color: "#fff",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={compact ? "" : "p-4 sm:p-8 max-w-3xl mx-auto space-y-6"}>
      <div
        className={
          compact ? "" : "bg-zinc-900 border border-zinc-800 rounded-2xl shadow-sm overflow-hidden"
        }
      >
        <div className={compact ? "p-1 pb-6" : "p-6"}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Seleção entre Centro de Custo ou Conta Análise (acima de Entidade / Fornecedor) */}
            <div className="sm:col-span-2 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="inline-flex p-1 bg-zinc-950 border border-zinc-800 rounded-xl gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setClassificacaoTipo("centro_custo");
                      setUseNovaClassificacao(false);
                      setClassificacaoNova("");
                    }}
                    className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      classificacaoTipo === "centro_custo"
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    Centro de Custo
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setClassificacaoTipo("conta_analise");
                      setUseNovaClassificacao(false);
                      setClassificacaoNova("");
                    }}
                    className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      classificacaoTipo === "conta_analise"
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    Conta Análise
                  </button>
                </div>

                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={useNovaClassificacao}
                    onChange={(e) => {
                      setUseNovaClassificacao(e.target.checked);
                      setClassificacaoNova("");
                    }}
                    className="w-3.5 h-3.5 rounded border-zinc-700 bg-zinc-900 text-blue-500 focus:ring-blue-500/50"
                  />
                  <span className="text-xs text-zinc-400 group-hover:text-zinc-300 transition-colors">
                    {classificacaoTipo === "centro_custo" ? "Novo Centro de Custo" : "Nova Conta Análise"}
                  </span>
                </label>
              </div>

              {useNovaClassificacao ? (
                <input
                  type="text"
                  value={classificacaoNova}
                  onChange={(e) => setClassificacaoNova(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:border-blue-500/50 outline-none transition-all"
                  placeholder={
                    classificacaoTipo === "centro_custo"
                      ? "Nome do centro de custo (Ex: Cozinha Central, Eventos...)"
                      : "Nome ou código da conta análise (Ex: 311 - Mercadorias...)"
                  }
                />
              ) : classificacaoTipo === "centro_custo" ? (
                <select
                  value={centroCustoSelecionado}
                  onChange={(e) => setCentroCustoSelecionado(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:border-blue-500/50 outline-none transition-all"
                >
                  <option value="armazem_central">Armazém Central</option>
                  <option value="administracao">Administração / Sede</option>
                  <option value="logistica_frota">Logística / Frota</option>
                  {stores.length > 0 && (
                    <optgroup label="Lojas">
                      {stores.map((s) => (
                        <option key={s.id} value={`loja:${s.id}`}>
                          {s.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {customHistory.centros.length > 0 && (
                    <optgroup label="Outros Centros de Custo">
                      {customHistory.centros.map((cc) => (
                        <option key={cc} value={cc}>
                          {cc}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              ) : (
                <select
                  value={contaAnaliseSelecionada}
                  onChange={(e) => setContaAnaliseSelecionada(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:border-blue-500/50 outline-none transition-all"
                >
                  <option value="">Selecione uma conta análise...</option>
                  {DEFAULT_CONTAS_ANALISE.map((conta) => (
                    <option key={conta} value={conta}>
                      {conta}
                    </option>
                  ))}
                  {customHistory.contas.length > 0 && (
                    <optgroup label="Contas Personalizadas">
                      {customHistory.contas.map((ca) => (
                        <option key={ca} value={ca}>
                          {ca}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              )}
            </div>

            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                  Entidade (Fornecedor) *
                </span>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={useNovaEntidade}
                    onChange={(e) => {
                      setUseNovaEntidade(e.target.checked);
                      setFornecedorExistente("");
                      setFornecedorNovo("");
                    }}
                    className="w-3.5 h-3.5 rounded border-zinc-700 bg-zinc-900 text-blue-500 focus:ring-blue-500/50"
                  />
                  <span className="text-xs text-zinc-400 group-hover:text-zinc-300 transition-colors">
                    Nova Entidade
                  </span>
                </label>
              </div>

              {useNovaEntidade ? (
                <input
                  type="text"
                  value={fornecedorNovo}
                  onChange={(e) => setFornecedorNovo(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:border-blue-500/50 outline-none transition-all"
                  placeholder="Nome do novo fornecedor (Ex: Makro, Recheio)"
                />
              ) : (
                <SearchableCombobox
                  options={fornecedores}
                  value={fornecedorExistente}
                  onChange={setFornecedorExistente}
                  placeholder="Selecione um fornecedor..."
                />
              )}
            </div>

            <div>
              <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
                Nº Fatura / Recibo *
              </label>
              <input
                type="text"
                value={numeroFatura}
                onChange={(e) => setNumeroFatura(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:border-blue-500/50 outline-none transition-all uppercase"
                placeholder="Ex: FT 2026/001"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
                Forma de Pagamento *
              </label>
              <select
                value={formaPagamento}
                onChange={(e) =>
                  setFormaPagamento(
                    e.target.value as "transferencia" | "dinheiro" | "debito_direto" | "pago"
                  )
                }
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:border-blue-500/50 outline-none transition-all"
              >
                <option value="transferencia">Transferência</option>
                <option value="dinheiro">Dinheiro</option>
                <option value="debito_direto">Débito Direto</option>
                <option value="pago">Pago</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
                Data da Emissão *
              </label>
              <input
                type="date"
                value={dataFatura}
                onChange={(e) => setDataFatura(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:border-blue-500/50 outline-none transition-all [color-scheme:dark]"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
                Data Vencimento
              </label>
              <input
                type="date"
                value={dataVencimento}
                onChange={(e) => setDataVencimento(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:border-blue-500/50 outline-none transition-all [color-scheme:dark]"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
                Nº de Parcelas
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={parcelas}
                onChange={(e) => setParcelas(parseInt(e.target.value, 10) || 1)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm font-mono tabular-nums text-zinc-100 focus:border-blue-500/50 outline-none transition-all"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
                Observações (Opcional)
              </label>
              <input
                type="text"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Ex: Compra direta fornecedor..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:border-blue-500/50 outline-none transition-all"
              />
            </div>
          </div>
        </div>

        <div
          className={
            compact
              ? "pt-6 border-t border-zinc-800 space-y-5"
              : "p-6 bg-zinc-900/50 border-t border-zinc-800 space-y-5"
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* 1. Valor Líquido */}
            <div>
              <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
                Valor Líquido *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="text-zinc-500 font-medium">€</span>
                </div>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={valorLiquido}
                  onChange={(e) => setValorLiquido(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-4 py-3 text-base font-mono tabular-nums text-zinc-100 focus:border-blue-500/50 outline-none transition-all"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* 2. IVA (Crédito) */}
            <div>
              <label className="text-[11px] font-semibold text-emerald-500/80 uppercase tracking-wider block mb-2">
                IVA (Crédito)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="text-emerald-500/70 font-medium">€</span>
                </div>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={valorIva}
                  onChange={(e) => setValorIva(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-4 py-3 text-base font-mono tabular-nums text-emerald-400 focus:border-emerald-500/50 outline-none transition-all"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* 3. Valor Total = Valor Líquido + IVA */}
            <div>
              <label className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider block mb-2">
                Valor Total
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="text-blue-400 font-semibold">€</span>
                </div>
                <input
                  type="text"
                  readOnly
                  tabIndex={-1}
                  value={parsedTotalCalc.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2)}
                  className="w-full bg-blue-500/5 border border-blue-500/30 rounded-xl pl-8 pr-4 py-3 text-lg font-bold font-mono tabular-nums text-zinc-100 outline-none cursor-default"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={isProcessing}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-3.5 rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap shrink-0 cursor-pointer"
            >
              {isProcessing ? (
                <img
                  src={`${import.meta.env.VITE_SUPABASE_URL || "https://ybaoaskddcmwoincsnwm.supabase.co"}/storage/v1/object/public/uploads/icon.png`}
                  alt="Carregando..."
                  className="w-5 h-5 animate-spin opacity-80"
                />
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Registrar Compra
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

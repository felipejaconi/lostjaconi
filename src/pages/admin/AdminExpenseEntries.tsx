import React, { useState, useEffect } from "react";
import { Plus, Trash2, Save, FileText, Calendar, Receipt, DollarSign, ListPlus } from "lucide-react";
import Swal from "sweetalert2";
import api from "../../lib/api";
import { SearchableCombobox } from "../../components/ui/SearchableCombobox";
import { motion, AnimatePresence } from "motion/react";
import Decimal from "decimal.js";
import { BrandTitle } from "../../components/BrandTitle";

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export default function AdminExpenseEntries({ onSuccess, lojaId, compact = false }: { onSuccess?: () => void, lojaId?: string, compact?: boolean }) {
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [selectedLoja, setSelectedLoja] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [useNovaEntidade, setUseNovaEntidade] = useState(false);
  const [fornecedorExistente, setFornecedorExistente] = useState("");
  const [fornecedorNovo, setFornecedorNovo] = useState("");
  
  const [numeroFatura, setNumeroFatura] = useState("");
  const [dataFatura, setDataFatura] = useState(new Date().toISOString().split("T")[0]);
  const [dataVencimento, setDataVencimento] = useState("");
  
  const [categoriaDespesa, setCategoriaDespesa] = useState("");
  const [valorTotal, setValorTotal] = useState("");
  const [novaCategoria, setNovaCategoria] = useState("");

  const CATEGORIAS_DESPESA = [
    { id: "luz", nome: "Luz / Eletricidade" },
    { id: "agua", nome: "Água" },
    { id: "aluguel", nome: "Aluguel / Renda" },
    { id: "salarios", nome: "Salários" },
    { id: "impostos", nome: "Impostos" },
    { id: "comunicacoes", nome: "Comunicações (Internet/Telefone)" },
    { id: "manutencao", nome: "Manutenção" },
    { id: "outro", nome: "Outro" }
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [resForn, resUsers] = await Promise.all([
        api.get("/admin/fornecedores").catch(() => ({ data: [] })),
        api.get("/admin/users").catch(() => ({ data: [] }))
      ]);
      setFornecedores(resForn.data || []);
      setStores((resUsers.data || []).filter((u: any) => u.role === 'loja').sort((a: any, b: any) => (a.name || "").localeCompare(b.name || "")));
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async () => {
    try {
      if (!numeroFatura) throw new Error("Número da fatura é obrigatório");
      if (!useNovaEntidade && !fornecedorExistente) throw new Error("Selecione um fornecedor ou crie um novo");
      if (useNovaEntidade && !fornecedorNovo) throw new Error("Nome do novo fornecedor é obrigatório");
      if (!categoriaDespesa) throw new Error("Categoria de despesa é obrigatória");
      if (categoriaDespesa === "novo_tipo" && !novaCategoria.trim()) throw new Error("Nome da nova categoria é obrigatório");
      if (!valorTotal || isNaN(Number(valorTotal)) || Number(valorTotal) <= 0) throw new Error("Valor total inválido");

      setIsProcessing(true);

      const finalCategoria = categoriaDespesa === "novo_tipo" ? novaCategoria.trim() : categoriaDespesa;

      const payload = {
        fornecedor_id: useNovaEntidade ? null : fornecedorExistente,
        novo_fornecedor_nome: useNovaEntidade ? fornecedorNovo : null,
        numero_fatura: numeroFatura,
        data_fatura: dataFatura,
        data_vencimento: dataVencimento || dataFatura,
        categoria_despesa: finalCategoria,
        valor_total: Number(valorTotal),
        loja_id: lojaId || (selectedLoja ? selectedLoja : null)
      };

      await api.post("/admin/faturas/despesas", payload);

      Swal.fire({
        icon: "success",
        title: "Despesa Registrada",
        text: "A despesa foi lançada com sucesso.",
        confirmButtonColor: "#10b981",
        background: "#18181b",
        color: "#fff"
      });

      // Reset
      setNumeroFatura("");
      setValorTotal("");
      setNovaCategoria("");
      setCategoriaDespesa("");
      if (onSuccess) onSuccess();

    } catch (error: any) {
      Swal.fire({
        icon: "error",
        title: "Erro ao salvar",
        text: error.response?.data?.error || error.message,
        confirmButtonColor: "#ef4444",
        background: "#18181b",
        color: "#fff"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={compact ? "" : "p-4 sm:p-8 max-w-3xl mx-auto space-y-6"}>
      <div className={compact ? "" : "bg-zinc-900 border border-zinc-800 rounded-2xl shadow-sm overflow-hidden"}>
        <div className={compact ? "p-1 pb-6" : "p-6"}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h2 className="text-[13px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-zinc-500" />
              Detalhes da Despesa
            </h2>
            {!lojaId && (
              <div className="flex items-center gap-2">
                 <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Destino:</label>
                 <select value={selectedLoja} onChange={e => setSelectedLoja(e.target.value)} className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-sm text-zinc-300 outline-none">
                    <option value="">Armazém Central</option>
                    {stores.map(s => (
                       <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                 </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="sm:col-span-2">
              <label className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Entidade (Fornecedor) *</span>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={useNovaEntidade}
                    onChange={(e) => {
                      setUseNovaEntidade(e.target.checked);
                      setFornecedorExistente("");
                      setFornecedorNovo("");
                    }}
                    className="w-3.5 h-3.5 rounded border-zinc-700 bg-zinc-900 text-rose-500 focus:ring-rose-500/50"
                  />
                  <span className="text-xs text-zinc-400 group-hover:text-zinc-300 transition-colors">Nova Entidade</span>
                </label>
              </label>
              
              {useNovaEntidade ? (
                <input
                  type="text"
                  value={fornecedorNovo}
                  onChange={(e) => setFornecedorNovo(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:border-rose-500/50 outline-none transition-all"
                  placeholder="Nome da nova entidade (Ex: EDP, Vodafone)"
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
              <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Nº Fatura / Recibo *</label>
              <input
                type="text"
                value={numeroFatura}
                onChange={(e) => setNumeroFatura(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:border-rose-500/50 outline-none transition-all uppercase"
                placeholder="Ex: FT 2024/001"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Categoria da Despesa *</label>
              <select
                value={categoriaDespesa}
                onChange={(e) => setCategoriaDespesa(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:border-rose-500/50 outline-none transition-all"
              >
                <option value="">Selecionar categoria...</option>
                {CATEGORIAS_DESPESA.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.nome}</option>
                ))}
                <option value="novo_tipo" className="text-rose-400 font-bold">+ Criar Novo Tipo...</option>
              </select>
            </div>
            
            {categoriaDespesa === "novo_tipo" && (
              <div>
                <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Nome do Novo Tipo *</label>
                <input
                  type="text"
                  value={novaCategoria}
                  onChange={(e) => setNovaCategoria(e.target.value)}
                  placeholder="Ex: Combustível, Materiais..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:border-rose-500/50 outline-none transition-all"
                />
              </div>
            )}

            <div>
              <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Data da Emissão *</label>
              <input
                type="date"
                value={dataFatura}
                onChange={(e) => setDataFatura(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:border-rose-500/50 outline-none transition-all"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Data Vencimento</label>
              <input
                type="date"
                value={dataVencimento}
                onChange={(e) => setDataVencimento(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:border-rose-500/50 outline-none transition-all"
              />
            </div>
          </div>
        </div>

        <div className={compact ? "pt-6 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-6" : "p-6 bg-zinc-900/50 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-6"}>
          <div className="w-full sm:w-1/3">
            <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Valor Total (Com IVA) *</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <span className="text-zinc-500 font-medium">€</span>
              </div>
              <input
                type="number"
                min="0"
                step="0.01"
                value={valorTotal}
                onChange={(e) => setValorTotal(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-4 py-3 text-lg font-mono text-zinc-100 focus:border-rose-500/50 outline-none transition-all"
                placeholder="0.00"
              />
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={isProcessing}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-500 text-white font-medium px-8 py-3.5 rounded-xl transition-all shadow-lg shadow-rose-600/20 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none mt-auto"
          >
            {isProcessing ? (
              <img src={`${import.meta.env.VITE_SUPABASE_URL || "https://ybaoaskddcmwoincsnwm.supabase.co"}/storage/v1/object/public/uploads/icon.png`} alt="Carregando..." className="w-5 h-5 animate-spin opacity-80" />
            ) : (
              <>
                <Save className="w-5 h-5" />
                Registrar Despesa
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

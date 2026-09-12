import React, { useState, useEffect } from "react";
import api from "../../lib/api";
import { Save } from "lucide-react";
import Swal from "sweetalert2";

interface StoreDREProps {
  storeId: string;
  month: number;
  year: number;
  totalVendas: number;
  totalCompras: number;
}

const CATEGORIES = [
  "FOLHA PAGAMENTO",
  "DESPESAS DIVERSAS",
  "CREDITO APARTAMENTO",
  "ADVOGADAS",
  "CONTADOR",
  "IVA (PREVISAO)",
  "SEG. SOCIAL",
  "IRS (PREVISAO)",
  "ALUGUEL",
  "AGUA (PREVISAO)",
  "LUZ (PREVISAO)",
  "NOS (PREVISAO)",
  "CARRINHA",
  "CASHY LOGI PROSSEGUR",
  "VIA VERDI",
  "COMBUSTIVEL",
  "SEG ACIDENTE TRABALHO",
  "SEG MULT RISCOS",
  "PARCELA CREDITO PESSOAL",
  "PARCELA PEUGEOT",
  "PARCELA COMPRA LOJA",
];

export function StoreDRE({ storeId, month, year, totalVendas, totalCompras }: StoreDREProps) {
  const [values, setValues] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!storeId) return;
    setLoading(true);
    api.get(`/loja/dre?store_id=${storeId}&month=${month + 1}&year=${year}`)
      .then(res => {
         setValues(res.data || {});
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [storeId, month, year]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
       await api.put('/loja/dre', {
          store_id: storeId,
          month: month + 1,
          year,
          values
       });
       Swal.fire("Sucesso", "DRE salvo com sucesso!", "success");
    } catch (e) {
       console.error("Failed to save DRE", e);
    } finally {
       setIsSaving(false);
    }
  };

  const handleChange = (cat: string, val: string) => {
     setValues(prev => ({ ...prev, [cat]: Number(val) }));
  };

  const totalDespesas = totalCompras + CATEGORIES.reduce((acc, cat) => acc + (values[cat] || 0), 0);
  const resultadoFinal = totalVendas - totalDespesas;
  const resultadoPct = totalVendas > 0 ? (resultadoFinal / totalVendas) * 100 : 0;

  if (loading) return <div className="animate-pulse h-64 bg-white/5 rounded-2xl mt-8"></div>;

  return (
    <div className="mt-8 bg-black/40 border border-white/5 rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
         <h3 className="text-lg font-black text-white tracking-widest uppercase">Demonstração de Resultados (D.R.E.)</h3>
         <button 
           onClick={handleSave} 
           disabled={isSaving}
           className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-2"
         >
            <Save size={14} />
            {isSaving ? "A GUARDAR..." : "GUARDAR D.R.E."}
         </button>
      </div>
      
      <div className="overflow-x-auto no-scrollbar">
         <table className="w-full text-left border-collapse">
            <thead>
               <tr className="bg-black/50 border-b border-white/10">
                  <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-widest w-1/2">Categoria</th>
                  <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right w-1/4">Valor (€)</th>
                  <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right w-1/4">Impacto (%)</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
               {/* Vendas Header */}
               <tr className="bg-emerald-500/5">
                  <td className="p-3 text-xs font-black text-emerald-400 uppercase pl-6">TOTAL DE VENDAS</td>
                  <td className="p-3 text-xs font-black text-emerald-400 text-right">{totalVendas.toFixed(2)} €</td>
                  <td className="p-3 text-xs font-black text-emerald-400 text-right">100.00%</td>
               </tr>
               
               {/* Distribuidora (Automático) */}
               <tr className="bg-rose-500/5">
                  <td className="p-3 text-xs font-black text-rose-400 uppercase pl-6">TOTAL DE DESP DISTRIBUIDORA</td>
                  <td className="p-3 text-xs font-black text-rose-400 text-right">{totalCompras.toFixed(2)} €</td>
                  <td className="p-3 text-xs font-black text-rose-400 text-right">{totalVendas > 0 ? ((totalCompras / totalVendas) * 100).toFixed(2) : "0.00"}%</td>
               </tr>
               
               {/* Editables */}
               {CATEGORIES.map(cat => {
                  const val = values[cat] || 0;
                  const pct = totalVendas > 0 ? (val / totalVendas) * 100 : 0;
                  return (
                     <tr key={cat} className="hover:bg-white/5 transition-colors group">
                        <td className="p-3 pl-6 text-xs font-bold text-white uppercase">{cat}</td>
                        <td className="p-2 text-right">
                           <input 
                              type="number"
                              step="0.01"
                              value={values[cat] === undefined ? '' : values[cat]}
                              onChange={(e) => handleChange(cat, e.target.value)}
                              placeholder="0.00"
                              className="w-full max-w-[120px] bg-black/50 border border-white/10 rounded px-2 py-1 text-xs font-bold text-rose-400 outline-none text-right focus:border-blue-500/50"
                           />
                        </td>
                        <td className="p-3 text-xs font-bold text-slate-400 text-right">{pct.toFixed(2)}%</td>
                     </tr>
                  );
               })}
               
               {/* Total de Despesas */}
               <tr className="bg-rose-500/5 border-t border-rose-500/20">
                  <td className="p-4 pl-6 text-sm font-black text-rose-400 uppercase">TOTAL DE DESPESAS</td>
                  <td className="p-4 text-sm font-black text-rose-400 text-right">{totalDespesas.toFixed(2)} €</td>
                  <td className="p-4 text-sm font-black text-rose-400 text-right">{(totalVendas > 0 ? (totalDespesas / totalVendas) * 100 : 0).toFixed(2)}%</td>
               </tr>
               
               {/* Resultado Final */}
               <tr className="bg-blue-500/10 border-t-2 border-blue-500/30">
                  <td className="p-4 pl-6 text-sm font-black text-blue-400 uppercase">RESULTADO FINAL</td>
                  <td className="p-4 text-sm font-black text-blue-400 text-right">{resultadoFinal.toFixed(2)} €</td>
                  <td className="p-4 text-sm font-black text-blue-400 text-right">{resultadoPct.toFixed(2)}%</td>
               </tr>
            </tbody>
         </table>
      </div>
    </div>
  );
}

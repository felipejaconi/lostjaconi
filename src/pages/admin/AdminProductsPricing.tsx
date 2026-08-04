import React, { useState, useEffect } from "react";
import { ArrowDownLeft, Save, Search, TrendingUp, Tags, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import api from "../../lib/api";

export default function AdminProductsPricing() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [savingId, setSavingId] = useState<number | null>(null);
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const [pRes, cRes] = await Promise.all([
        api.get("/produtos"),
        api.get("/categorias"),
      ]);
      setProducts((pRes.data as any[]).sort((a: any, b: any) => a.nome.localeCompare(b.nome)));
      setCategories(cRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePriceUpdate = (id: number, field: string, value: string) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          if (field === "margem") {
            const margemVal = Number(value);
            const custo = Number(p.preco_custo) || 0;
            if (custo > 0) {
              const pvp = custo * (1 + (margemVal / 100));
              return { ...p, preco: pvp.toFixed(2), _margemInput: value };
            }
            return { ...p, _margemInput: value };
          }

          if (field === "preco_custo") {
            const newCusto = Number(value);
            const oldCusto = Number(p.preco_custo) || 0;
            const pvp = Number(p.preco) || 0;
            
            let currentMargemPct = 0;
            let displayMargem = p._margemInput;
            
            if (displayMargem !== undefined) {
               currentMargemPct = Number(displayMargem) / 100;
            } else if (oldCusto > 0) {
               currentMargemPct = (pvp - oldCusto) / oldCusto;
               displayMargem = (currentMargemPct * 100).toFixed(0);
            }

            if (newCusto > 0) {
               const newPvp = newCusto * (1 + currentMargemPct);
               return { ...p, preco_custo: value, preco: newPvp.toFixed(2), _margemInput: displayMargem };
            }
            return { ...p, preco_custo: value, _margemInput: displayMargem };
          }
          
          const updated = { ...p, [field]: value };
          if (field === "preco") {
             updated._margemInput = undefined;
          }
          return updated;
        }
        return p;
      })
    );
  };

  const saveProductPrice = async (p: any) => {
    setSavingId(p.id);
    try {
      // Create a FormData just to update preco, preco_custo, iva
      const formData = new FormData();
      formData.append("nome", p.nome); // required by endpoint in general though some might be omitted
      formData.append("preco", p.preco || "0");
      if (p.preco_custo !== undefined && p.preco_custo !== null) formData.append("preco_custo", p.preco_custo);
      formData.append("iva", p.iva || "23");
      if (p.categoria_id) formData.append("categoria_id", p.categoria_id);

      await api.post(`/produtos/${p.id}/update`, formData);
      
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Preço atualizado',
        showConfirmButton: false,
        timer: 1500,
        background: '#1e293b',
        color: '#fff',
      });
    } catch (err) {
      Swal.fire("Erro", "Falha ao gravar", "error");
    } finally {
      setSavingId(null);
    }
  };

  const filteredProducts = products.filter(
    (p) => {
      const matchSearch = p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.barcode_ean?.includes(searchTerm);
      const matchCategory = selectedCategory === "all" ? true : String(p.categoria_id) === String(selectedCategory);
      return matchSearch && matchCategory;
    }
  );

  return (
    <div className="pt-2 px-4 md:pt-4 md:px-6 lg:px-8 ">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-5 mb-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-black text-yellow-500 tracking-tighter flex items-center gap-2 uppercase">
               <Tags size={24} /> GESTÃO DE PREÇOS E MARGENS
            </h1>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <div className="flex bg-black/40 p-2 rounded-xl border border-white/10 w-full sm:w-[350px]">
            <Search size={18} className="text-slate-500 ml-2 mt-2 absolute" />
            <input
               type="text"
               placeholder="Pesquisar por nome ou EAN..."
               value={searchTerm}
               onChange={e => setSearchTerm(e.target.value)}
               className="w-full bg-transparent border-none text-sm text-white pl-10 py-2 outline-none focus:ring-0 placeholder:text-slate-600"
            />
          </div>
        </div>
      </div>

      <div className="flex overflow-x-auto no-scrollbar gap-2 w-full mb-6">
        <button
          onClick={() => setSelectedCategory("all")}
          className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border rounded-xl flex items-center justify-center shrink-0 ${
            selectedCategory === "all"
              ? "bg-emerald-500 text-black border-emerald-500 shadow-lg shadow-emerald-500/20"
              : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-white hover:bg-zinc-800"
          }`}
        >
          Todas
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedCategory(c.id.toString())}
            className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border rounded-xl flex items-center gap-2 shrink-0 ${
              selectedCategory === c.id.toString()
                ? "bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/20"
                : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-white hover:bg-zinc-800"
            }`}
          >
            {c.nome}
          </button>
        ))}
      </div>

      <div className="bg-[#0A0A0A] border border-white/5 shadow-2xl rounded-[2rem] overflow-hidden">
         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
               <thead>
                 <tr className="border-b border-white/10 bg-white/[0.02]">
                    <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest">Produto</th>
                    <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest">IVA (%)</th>
                    <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest">Custo Base (€)</th>
                    <th className="p-4 text-xs font-black text-emerald-500 uppercase tracking-widest">PVP (€)</th>
                    <th className="p-4 text-xs font-black text-yellow-500 uppercase tracking-widest text-center">Margem Bruta</th>
                    <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest text-right">Ação</th>
                 </tr>
               </thead>
               <tbody>
                  {filteredProducts.map(p => {
                     const custo = Number(p.preco_custo) || 0;
                     const pvp = Number(p.preco) || 0;
                     
                     const calcMargem = (pvp > 0 && custo > 0) ? (((pvp - custo) / custo) * 100).toFixed(0) : 'N/A';
                     const displayMargem = p._margemInput !== undefined ? p._margemInput : calcMargem;

                     return (
                        <tr key={p.id} className="border-b border-white/5 hover:bg-white/[0.01]">
                           <td className="p-4">
                              <p className="text-sm font-bold text-white leading-tight uppercase">{p.nome}</p>
                              {p.barcode_ean && <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold">EAN: {p.barcode_ean}</p>}
                           </td>
                           <td className="p-4">
                              <select
                                 value={p.iva || "23"}
                                 onChange={(e) => handlePriceUpdate(p.id, "iva", e.target.value)}
                                 className="w-[80px] bg-black/40 border border-blue-500/30 focus:border-blue-500 rounded-lg px-2 py-2 text-sm text-blue-400 font-bold outline-none"
                              >
                                 <option value="23">23%</option>
                                 <option value="13">13%</option>
                                 <option value="6">6%</option>
                                 <option value="0">0%</option>
                              </select>
                           </td>
                           <td className="p-4">
                              <input 
                                 type="number" 
                                 step="0.01" 
                                 value={p.preco_custo || ""}
                                 onChange={(e) => handlePriceUpdate(p.id, "preco_custo", e.target.value)}
                                 className="w-[100px] bg-black/40 border border-white/10 focus:border-yellow-500/50 rounded-lg px-3 py-2 text-sm text-white outline-none"
                              />
                           </td>
                           
                           <td className="p-4">
                              <input 
                                 type="number" 
                                 step="0.01" 
                                 value={p.preco || ""}
                                 onChange={(e) => handlePriceUpdate(p.id, "preco", e.target.value)}
                                 className="w-[100px] bg-black/40 border border-emerald-500/30 focus:border-emerald-500 rounded-lg px-3 py-2 text-sm text-emerald-400 font-bold outline-none font-mono"
                              />
                           </td>
                           <td className="p-4 text-center relative">
                              <div className="flex items-center justify-center gap-1">
                                <input 
                                  type="number" 
                                  step="1" 
                                  value={displayMargem === 'N/A' ? "" : displayMargem}
                                  onChange={(e) => handlePriceUpdate(p.id, "margem", e.target.value)}
                                  placeholder="N/A"
                                  className={`w-[70px] bg-black/40 border rounded-lg px-2 py-1 text-center text-xs font-black outline-none ${Number(displayMargem) < 15 ? 'border-red-500/30 text-red-500 focus:border-red-500' : 'border-yellow-500/30 text-yellow-500 focus:border-yellow-500'}`}
                                />
                                <span className="text-xs text-slate-500">%</span>
                              </div>
                           </td>
                           <td className="p-4 text-right">
                              <button 
                                 onClick={() => saveProductPrice(p)}
                                 disabled={savingId === p.id}
                                 className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-xs font-black uppercase tracking-widest border border-white/10 hover:border-yellow-500/50 transition-all flex items-center justify-end gap-2 ml-auto"
                              >
                                 {savingId === p.id ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                 Guardar
                              </button>
                           </td>
                        </tr>
                     );
                  })}
                  {filteredProducts.length === 0 && (
                     <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-500 text-sm">
                           Nenhum produto encontrado.
                        </td>
                     </tr>
                  )}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { Package, Search, Store } from "lucide-react";
import api from "../../lib/api";
import { BrandTitle } from "../../components/BrandTitle";
import Swal from "sweetalert2";

export default function AdminGiro() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStore, setSelectedStore] = useState<string | "all">("all");
  const [sortOrder, setSortOrder] = useState<"alpha" | "highest" | "lowest" | "zero">("alpha");
  const [selectedPeriod, setSelectedPeriod] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const monthOptions = React.useMemo(() => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      options.push({ key, label: label.charAt(0).toUpperCase() + label.slice(1) });
    }
    return options;
  }, []);

  useEffect(() => {
    fetchGiroData();
  }, []);

  const fetchGiroData = async () => {
    try {
      setLoading(true);
      const res = await api.get("/admin/giro");
      setData(res.data);
    } catch (error: any) {
      console.error("Erro ao buscar giro:", error);
      Swal.fire({
        icon: "error",
        title: "Erro",
        text: "Não foi possível carregar a análise de giro.",
        background: "#1a1a1a",
        color: "#fff"
      });
    } finally {
      setLoading(false);
    }
  };

  const uniqueStores = Array.from(new Map(data.map((item: any) => [item.loja_id, { id: item.loja_id, name: item.loja_nome }])).values()).sort((a: any, b: any) => a.name.localeCompare(b.name)) as {id: string, name: string}[];

  const filteredData = data.filter((item) => {
    if (selectedStore !== "all" && item.loja_id !== selectedStore) {
      return false;
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      if (!item.loja_nome.toLowerCase().includes(q) && !item.produto_nome.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  const productsSummary = React.useMemo(() => {
    const map = new Map<string, any>();
    for (const item of filteredData) {
      if (!map.has(item.produto_id)) {
        map.set(item.produto_id, {
          produto_nome: item.produto_nome,
          total_ano: 0,
          total_mes: 0,
          total_semana: 0,
          total_dia: 0
        });
      }
      const p = map.get(item.produto_id)!;
      if (selectedPeriod === "ano") {
        p.total_ano += (item.total_ano || 0);
      } else {
        p.total_ano += (item.totals_by_month?.[selectedPeriod] || 0);
      }
      p.total_mes += (item.total_mes || 0);
      p.total_semana += (item.total_semana || 0);
      p.total_dia += (item.total_dia || 0);
    }
    
    let result = Array.from(map.values());
    
    if (sortOrder === "alpha") {
      result.sort((a, b) => a.produto_nome.localeCompare(b.produto_nome));
    } else if (sortOrder === "highest") {
      result.sort((a, b) => b.total_ano - a.total_ano);
    } else if (sortOrder === "lowest") {
      result = result.filter(p => p.total_ano > 0).sort((a, b) => a.total_ano - b.total_ano);
    } else if (sortOrder === "zero") {
      result = result.filter(p => p.total_ano === 0).sort((a, b) => a.produto_nome.localeCompare(b.produto_nome));
    }

    return result;
  }, [filteredData, sortOrder, selectedPeriod]);

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] bg-[#050505]">
      <div className="flex-none pt-4 md:pt-6 px-4 md:px-6 lg:px-8 w-full border-b border-white/5 bg-[#0a0a0a]">
        <div className="flex flex-col gap-4 mb-4">
          <div className="flex flex-col lg:flex-row lg:items-center flex-wrap gap-4 w-full">
            <BrandTitle title="Média de consumo" hideUnderline titleClassName="!text-2xl sm:!text-3xl !m-0 !p-0 shrink-0 text-left" />
            
            <div className="flex flex-col sm:flex-row gap-2 lg:items-center flex-1 lg:justify-end">
              <div className="flex flex-col sm:flex-row bg-black/40 border border-white/10 rounded-lg overflow-hidden shrink-0">
                {/* Store Select */}
                <div className="relative flex-1 sm:flex-none border-b sm:border-b-0 sm:border-r border-white/5">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-yellow-500">
                    <Store size={12} />
                  </div>
                  <select
                    value={selectedStore}
                    onChange={(e) => setSelectedStore(e.target.value)}
                    className="appearance-none bg-transparent border-none pl-8 pr-8 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-300 focus:outline-none focus:bg-white/5 transition-colors cursor-pointer w-full h-full"
                  >
                    <option value="all">Todas as Lojas</option>
                    {uniqueStores.map(store => (
                      <option key={store.id} value={store.id}>{store.name}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-slate-500">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>

                {/* Period Select */}
                <div className="relative flex-1 sm:flex-none border-b sm:border-b-0 sm:border-r border-white/5">
                  <select 
                    value={selectedPeriod} 
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                    className="appearance-none bg-transparent border-none pl-3 pr-8 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-300 focus:outline-none focus:bg-white/5 transition-colors cursor-pointer w-full h-full"
                  >
                    <option value="ano">Total do Ano</option>
                    {monthOptions.map(opt => (
                      <option key={opt.key} value={opt.key}>{opt.label}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-slate-500">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>

                {/* Sort Order Select */}
                <div className="relative flex-1 sm:flex-none">
                  <select 
                    value={sortOrder} 
                    onChange={(e) => setSortOrder(e.target.value as any)}
                    className="appearance-none bg-transparent border-none pl-3 pr-8 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-300 focus:outline-none focus:bg-white/5 transition-colors cursor-pointer w-full h-full"
                  >
                    <option value="alpha">Ordem Alfabética</option>
                    <option value="highest">Mais Saem</option>
                    <option value="lowest">Menos Saem</option>
                    <option value="zero">Não Saem</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-slate-500">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>

              {/* Search */}
              <div className="flex items-center w-full sm:w-64 bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/50 transition-all shrink-0">
                <Search className="w-3.5 h-3.5 text-slate-500 mr-2 shrink-0" />
                <input
                  type="text"
                  placeholder="Buscar loja ou produto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-transparent border-none outline-none text-white text-xs w-full font-medium placeholder:text-slate-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>



      <div className="flex-1 overflow-auto w-full px-4 md:px-6 lg:px-8 pb-32 custom-scrollbar relative">
        {loading ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center">
             <img src={`${import.meta.env.VITE_SUPABASE_URL || "https://ybaoaskddcmwoincsnwm.supabase.co"}/storage/v1/object/public/uploads/icon.png`} alt="Carregando..." className="w-10 h-10 animate-spin opacity-80" />
          </div>
        ) : filteredData.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-500 h-[50vh]">
            <Package size={48} className="mb-4 opacity-20" />
            <p className="text-lg font-bold text-white mb-2">Sem Resultados</p>
            <p className="text-sm font-medium">Nenhum registo de consumo encontrado para sua pesquisa.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6 pt-4">
            <div className="bg-zinc-950/40 border border-white/5 rounded-3xl p-6">
              <div className="custom-scrollbar -mx-6 px-6">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="sticky top-0 z-10 bg-[#080808] shadow-[0_1px_0_rgba(255,255,255,0.1)]">
                    <tr className="text-slate-400">
                      <th className="py-3 font-medium uppercase text-[10px] tracking-wider w-8">#</th>
                      <th className="py-3 font-medium uppercase text-[10px] tracking-wider">Produto</th>
                      <th className="py-3 font-medium uppercase text-[10px] tracking-wider text-right">
                        {selectedPeriod === "ano" ? "Total Ano" : monthOptions.find(o => o.key === selectedPeriod)?.label || "Mês"}
                      </th>
                      <th className="py-3 font-medium uppercase text-[10px] tracking-wider text-right">Total Mês</th>
                      <th className="py-3 font-medium uppercase text-[10px] tracking-wider text-right">Total Semana</th>
                      <th className="py-3 font-medium uppercase text-[10px] tracking-wider text-right">Total Dia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {productsSummary.map((p, idx) => (
                      <tr key={p.produto_nome} className="hover:bg-white/5 transition-colors">
                        <td className="py-3 text-slate-500 font-mono text-xs pr-2">{idx + 1}</td>
                        <td className="py-3 font-bold text-white text-sm">{p.produto_nome}</td>
                        <td className="py-3 text-slate-300 text-right font-mono text-base">{Number(p.total_ano).toLocaleString('pt-PT', { maximumFractionDigits: 1 })}</td>
                        <td className="py-3 text-slate-300 text-right font-mono text-base">{Number(p.total_mes).toLocaleString('pt-PT', { maximumFractionDigits: 1 })}</td>
                        <td className="py-3 text-slate-300 text-right font-mono text-base">{Number(p.total_semana).toLocaleString('pt-PT', { maximumFractionDigits: 1 })}</td>
                        <td className="py-3 text-slate-300 text-right font-mono text-base">{Number(p.total_dia).toLocaleString('pt-PT', { maximumFractionDigits: 1 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect, useMemo } from "react";
import { Plus, Users, Search, BarChart as BarChartIcon, Edit2, Trash2, Building, Phone, Mail, Building2, Tag, MapPin, CreditCard, Landmark, FileText, Globe, Package, Calendar, X, FileBarChart } from "lucide-react";
import Swal from "sweetalert2";
import api from "../../lib/api";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BrandTitle } from "../../components/BrandTitle";
import { monthNames } from "../../lib/utils";
import { SearchableCombobox } from "../../components/ui/SearchableCombobox";

export default function AdminSuppliers() {
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [faturas, setFaturas] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const monthOptions = useMemo(() => {
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
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [isReportsModalOpen, setIsReportsModalOpen] = useState(false);
  const [reportsTab, setReportsTab] = useState<"produtos" | "fornecedores">("produtos");
  const [selectedReportProductId, setSelectedReportProductId] = useState<string>("");
  const [selectedReportSupplierId, setSelectedReportSupplierId] = useState<string>("");
  const [productSuppliersReport, setProductSuppliersReport] = useState<any[]>([]);
  const [isReportLoading, setIsReportLoading] = useState(false);

  const [reportPeriod, setReportPeriod] = useState<"mes" | "todos">("todos");
  const [reportMonth, setReportMonth] = useState<number>(new Date().getMonth());
  const [reportYear, setReportYear] = useState<number>(new Date().getFullYear());

  const [selectedSupplierForProducts, setSelectedSupplierForProducts] = useState<any>(null);
  const [supplierProducts, setSupplierProducts] = useState<any[]>([]);
  const [isSupplierProductsLoading, setIsSupplierProductsLoading] = useState(false);

  const [formData, setFormData] = useState({
    nome: "",
    contribuinte: "",
    contato: "",
    email: "",
    tipo: "mercadoria", // 'mercadoria' or 'operacional'
    morada: "",
    codigo_postal: "",
    localidade: "",
    iban: "",
    banco: "",
    swift_bic: "",
    condicoes_pagamento: ""
  });

  const [activeTab, setActiveTab] = useState<"geral" | "morada" | "pagamento">("geral");

  useEffect(() => {
    fetchFornecedores();
  }, []);

  const fetchFornecedores = async () => {
    try {
       const [resForn, resProd, resFat] = await Promise.all([
          api.get("/admin/fornecedores"),
          api.get("/produtos"),
          api.get("/admin/faturas").catch(() => ({ data: [] }))
       ]);
       setFornecedores(resForn.data);
       setProducts(resProd.data);
       setFaturas(resFat.data);
    } catch (err: any) {
       console.error(err);
       if(err.response?.data?.error?.code === '42P01') {
          Swal.fire('Atenção', 'A tabela de Fornecedores ainda não foi criada na base de dados. Por favor execute o database-setup.sql.', 'warning');
       }
    } finally {
       setIsLoading(false);
    }
  };

  const openModal = (fornecedor = null) => {
    setActiveTab("geral");
    if (fornecedor) {
      setEditingId(fornecedor.id);
      setFormData({
        nome: fornecedor.nome || "",
        contribuinte: fornecedor.contribuinte || "",
        contato: fornecedor.contato || "",
        email: fornecedor.email || "",
        tipo: fornecedor.tipo || "mercadoria",
        morada: fornecedor.morada || "",
        codigo_postal: fornecedor.codigo_postal || "",
        localidade: fornecedor.localidade || "",
        iban: fornecedor.iban || "",
        banco: fornecedor.banco || "",
        swift_bic: fornecedor.swift_bic || "",
        condicoes_pagamento: fornecedor.condicoes_pagamento || ""
      });
    } else {
      setEditingId(null);
      setFormData({ 
        nome: "", contribuinte: "", contato: "", email: "", tipo: "mercadoria",
        morada: "", codigo_postal: "", localidade: "", iban: "", banco: "", swift_bic: "", condicoes_pagamento: "" 
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/admin/fornecedores/${editingId}`, formData);
        Swal.fire("Sucesso!", "Fornecedor atualizado com sucesso.", "success");
      } else {
        await api.post("/admin/fornecedores", formData);
        Swal.fire("Sucesso!", "Fornecedor criado com sucesso.", "success");
      }
      setIsModalOpen(false);
      fetchFornecedores();
    } catch (err: any) {
      Swal.fire("Erro", err.response?.data?.error || "Erro ao guardar fornecedor.", "error");
    }
  };

  const fetchSupplierProductsList = async (fornecedorId: string, p = reportPeriod, m = reportMonth, y = reportYear) => {
    setIsSupplierProductsLoading(true);
    setSupplierProducts([]);
    try {
      const res = await api.get(`/admin/fornecedores/${fornecedorId}/produtos?period=${p}&month=${m}&year=${y}`);
      setSupplierProducts(res.data || []);
    } catch (err: any) {
      console.error("Erro ao carregar produtos:", err);
      Swal.fire("Erro", "Falha ao carregar os produtos deste fornecedor.", "error");
    } finally {
      setIsSupplierProductsLoading(false);
    }
  };

  const openSupplierProducts = async (fornecedor: any) => {
    setSelectedSupplierForProducts(fornecedor);
    await fetchSupplierProductsList(fornecedor.id);
  };

  const fetchProductReport = async (productId: string, p = reportPeriod, m = reportMonth, y = reportYear) => {
    if (!productId) {
       setProductSuppliersReport([]);
       return;
    }
    setIsReportLoading(true);
    try {
      const res = await api.get(`/admin/produtos/${productId}/fornecedores?period=${p}&month=${m}&year=${y}`);
      setProductSuppliersReport(res.data);
    } catch (err: any) {
      console.error(err);
      Swal.fire("Erro", "Erro ao carregar relatório de fornecedores para o produto.", "error");
    } finally {
      setIsReportLoading(false);
    }
  };

  useEffect(() => {
    if (selectedReportProductId) {
       fetchProductReport(selectedReportProductId, reportPeriod, reportMonth, reportYear);
    } else {
       setProductSuppliersReport([]);
    }
  }, [selectedReportProductId, reportPeriod, reportMonth, reportYear]);

  const exportToCSV = (data: any[], filename: string) => {
    if(!data || data.length === 0) {
      Swal.fire("Aviso", "Não há dados para exportar.", "info");
      return;
    }
    const headers = Object.keys(data[0]).join(",");
    const rows = data.map(obj => Object.values(obj).map(v => `"${v}"`).join(",")).join("\n");
    const csvContext = `${headers}\n${rows}`;
    const blob = new Blob([csvContext], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  const chartData = useMemo(() => {
    const stats: Record<string, { nome: string; total: number }> = {};
    faturas.forEach(f => {
       // Filter by selectedMonth
       if (f.data_emissao) {
           const d = new Date(f.data_emissao);
           const fMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
           if (fMonth !== selectedMonth && selectedMonth !== 'all') return;
       } else if (f.created_at) {
           const d = new Date(f.created_at);
           const fMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
           if (fMonth !== selectedMonth && selectedMonth !== 'all') return;
       } else {
           if (selectedMonth !== 'all') return; // no date means skip if a specific month is selected
       }

       const val = Number(f.valor_total || 0);
       const fornId = f.fornecedor_id;
       if (fornId && f.fornecedor) {
          if (!stats[fornId]) {
             stats[fornId] = { nome: f.fornecedor.nome || "Desconhecido", total: 0 };
          }
          stats[fornId].total += val;
       }
    });
    return Object.values(stats)
       .sort((a, b) => b.total - a.total)
       .slice(0, 10); // top 10
  }, [faturas, selectedMonth]);

  const filtered = fornecedores.filter(f => f.nome.toLowerCase().includes(search.toLowerCase()) || f.contribuinte?.includes(search));

  return (
    <div className="pt-2 px-4 md:pt-4 md:px-6 lg:px-8 max-w-7xl mx-auto space-y-6 sm:space-y-8 pb-32">
      <div className="flex flex-col gap-4 border-b border-white/5 pb-5 mb-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center flex-wrap gap-4 pt-2">
             <BrandTitle title="Fornecedores" titleClassName="p-0 m-0 -mt-[18px]" hideUnderline />
          </div>
          
          <div className="flex gap-2 sm:gap-3 flex-wrap sm:flex-nowrap w-full lg:w-auto shrink-0 lg:justify-end mt-2 lg:mt-0">
             <button
               onClick={() => setIsReportsModalOpen(true)}
               className="flex-1 sm:flex-none px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 whitespace-nowrap bg-zinc-800 text-zinc-300 shadow-xl hover:bg-zinc-700 active:scale-95 opacity-90 hover:opacity-100 border border-white/5"
             >
               <FileBarChart size={16} strokeWidth={2.5} /> 
               <span>Relatórios</span>
             </button>
             <button
               onClick={() => openModal()}
               className="flex-1 sm:flex-none px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 whitespace-nowrap bg-blue-600 text-white shadow-xl shadow-blue-500/20 hover:bg-blue-500 active:scale-95 opacity-90 hover:opacity-100"
             >
               <Plus size={16} strokeWidth={3} /> 
               <span>Novo Fornecedor</span>
             </button>
          </div>
        </div>

        <div className="flex items-center w-full lg:max-w-md bg-black/40 border border-white/10 rounded-xl px-4 py-2 mt-2 focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/50 transition-all">
          <Search className="w-4 h-4 text-slate-500 mr-2" />
          <input
             type="text"
             placeholder="Pesquisar por nome ou NIF..."
             value={search}
             onChange={(e) => setSearch(e.target.value)}
             className="bg-transparent border-none outline-none text-white text-sm w-full font-medium placeholder:text-slate-500"
          />
        </div>
      </div>

      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent opacity-50 pointer-events-none rounded-3xl" />
        
        {isLoading ? (
           <div className="flex flex-col items-center justify-center py-20">
              <img src={`${import.meta.env.VITE_SUPABASE_URL || "https://ybaoaskddcmwoincsnwm.supabase.co"}/storage/v1/object/public/uploads/icon.png`} alt="Carregando..." className="w-8 h-8 animate-spin opacity-80" />
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">A carregar fornecedores...</p>
           </div>
        ) : (
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10 w-full">
             {filtered.map(f => (
               <div key={f.id} className="bg-[#111]  border border-white/10 shadow-lg p-6 rounded-3xl hover:bg-[#1a1a1a] hover:border-white/20 hover:shadow-blue-500/10 hover:-translate-y-1 transition-all duration-300 relative group flex flex-col h-full overflow-hidden">
                  <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                      <button onClick={() => openSupplierProducts(f)} title="Ver Produtos Comprados" className="text-blue-400 hover:text-white p-2.5 rounded-xl bg-black/40 border border-white/10 hover:bg-blue-500 hover:border-blue-500 transition-colors shadow-xl">
                         <Package size={14} />
                      </button>
                      <button onClick={() => openModal(f)} className="text-slate-400 hover:text-white p-2.5 rounded-xl bg-black/40 border border-white/10 hover:bg-black/60 transition-colors  shadow-xl">
                         <Edit2 size={14} />
                      </button>
                  </div>
                  
                  <div className="flex items-start gap-4 mb-6">
                     <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-500/20 to-blue-400/5 border border-blue-500/20 flex items-center justify-center shrink-0">
                        <Building2 className="w-6 h-6 text-blue-400" />
                     </div>
                     <div className="pr-8">
                        <h3 className="text-lg font-bold text-white mb-1 tracking-tight break-words pr-2">{f.nome}</h3>
                        <p className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 w-fit px-2 py-0.5 rounded-full ${f.tipo === 'mercadoria' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'}`}>
                          <Tag size={10} /> {f.tipo === 'mercadoria' ? 'Mercadoria' : 'Operacional'}
                        </p>
                     </div>
                  </div>
                  
                  <div className="space-y-3.5 flex-1">
                     {f.contribuinte && (
                        <div className="flex items-center gap-3 text-sm text-slate-300">
                           <div className="w-6 h-6 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center text-slate-500 shrink-0">
                               <FileText size={12} />
                           </div>
                           <span className="font-mono text-xs">{f.contribuinte}</span>
                        </div>
                     )}
                     {f.contato && (
                        <div className="flex items-center gap-3 text-sm text-slate-300">
                           <div className="w-6 h-6 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center text-slate-500 shrink-0">
                               <Phone size={12} />
                           </div>
                           <span className="truncate">{f.contato}</span>
                        </div>
                     )}

                     {f.email && (
                        <div className="flex items-center gap-3 text-sm text-slate-300">
                           <div className="w-6 h-6 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center text-slate-500 shrink-0">
                               <Mail size={12} />
                           </div>
                           <span className="truncate">{f.email}</span>
                        </div>
                     )}
                     
                     {f.localidade && (
                        <div className="flex items-center gap-3 text-sm text-slate-300 mt-2 border-t border-white/5 pt-3">
                           <div className="w-6 h-6 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center text-slate-500 shrink-0">
                               <MapPin size={12} />
                           </div>
                           <span className="truncate">{f.localidade}</span>
                        </div>
                     )}

                     {f.iban && (
                        <div className="flex items-center gap-3 text-sm text-slate-300">
                           <div className="w-6 h-6 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center text-slate-500 shrink-0">
                               <CreditCard size={12} />
                           </div>
                           <span className="font-mono text-xs">{f.iban.substring(0, 8)} ••••</span>
                        </div>
                     )}
                  </div>
               </div>
             ))}

             {filtered.length === 0 && (
               <div className="col-span-full flex flex-col items-center justify-center py-20 px-4">
                  <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mb-6">
                     <Globe className="text-slate-600" size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Sem Resultados</h3>
                  <p className="text-slate-500 text-center max-w-sm">
                     Não encontrámos nenhum fornecedor correspondente à sua pesquisa.
                  </p>
               </div>
             )}
           </div>

        )}
      </div>

      {/* Gráfico de Principais Fornecedores */}
      <div className="mt-8 bg-[#111] border border-white/10 rounded-3xl shadow-sm p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-32 bg-blue-500/5 blur-[100px] rounded-full pointer-events-none" />
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <BarChartIcon className="w-5 h-5 text-blue-500" /> Principais Fornecedores (Gastos)
          </h3>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="appearance-none bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500/50 cursor-pointer shadow-inner"
          >
            <option value="all">Todo o Histórico</option>
            {monthOptions.map(opt => (
              <option key={opt.key} value={opt.key}>{opt.label}</option>
            ))}
          </select>
        </div>
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-slate-500 text-sm font-semibold uppercase tracking-wider">
            Sem dados de gastos.
          </div>
        ) : (
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" strokeOpacity={0.05} vertical={false} />
                <XAxis dataKey="nome" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickMargin={10} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `€${value}`} />
                <Tooltip
                  cursor={{ fill: '#ffffff', opacity: 0.05 }}
                  contentStyle={{ backgroundColor: '#0a0a0a', borderColor: '#ffffff20', borderRadius: '16px', color: '#f8fafc', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5)' }}
                  itemStyle={{ color: '#3b82f6', fontWeight: 'bold' }}
                  formatter={(value: number) => [`€ ${value.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}`, 'Total']}
                />
                <Bar dataKey="total" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center sm:p-4 z-[60] lg:pl-72">
          <div className="bg-[#0a0a0a] rounded-t-3xl sm:rounded-3xl w-full max-w-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col h-[80vh] sm:h-auto sm:max-h-[90vh]">
            <div className="p-4 sm:p-6 border-b border-white/10 shrink-0">
               <h2 className="text-lg sm:text-xl font-black text-white uppercase tracking-wider">{editingId ? 'Editar' : 'Novo'} Fornecedor</h2>
            </div>
            
            <div className="flex border-b border-white/10 shrink-0 overflow-x-auto custom-scrollbar">
              <button 
                type="button"
                onClick={() => setActiveTab("geral")}
                className={`py-3 px-6 text-xs font-bold uppercase tracking-wider flex items-center gap-2 whitespace-nowrap transition-colors ${activeTab === "geral" ? "text-blue-500 border-b-2 border-blue-500 bg-blue-500/5" : "text-slate-400 hover:text-slate-300 hover:bg-white/5"}`}
              >
                <Building size={16} /> Dados Gerais
              </button>
              <button 
                type="button"
                onClick={() => setActiveTab("morada")}
                className={`py-3 px-6 text-xs font-bold uppercase tracking-wider flex items-center gap-2 whitespace-nowrap transition-colors ${activeTab === "morada" ? "text-blue-500 border-b-2 border-blue-500 bg-blue-500/5" : "text-slate-400 hover:text-slate-300 hover:bg-white/5"}`}
              >
                <MapPin size={16} /> Morada
              </button>
              <button 
                type="button"
                onClick={() => setActiveTab("pagamento")}
                className={`py-3 px-6 text-xs font-bold uppercase tracking-wider flex items-center gap-2 whitespace-nowrap transition-colors ${activeTab === "pagamento" ? "text-blue-500 border-b-2 border-blue-500 bg-blue-500/5" : "text-slate-400 hover:text-slate-300 hover:bg-white/5"}`}
              >
                <Landmark size={16} /> Pagamento
              </button>
            </div>

            <form id="supplierForm" onSubmit={handleSubmit} className="p-6 flex-1 overflow-y-auto space-y-4 custom-scrollbar">
               {activeTab === "geral" && (
                 <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div className="sm:col-span-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nome</label>
                        <input required type="text" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white outline-none focus:border-blue-500/50 text-sm" />
                     </div>
                     <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Contribuinte (NIF)</label>
                        <input type="text" value={formData.contribuinte} onChange={e => setFormData({...formData, contribuinte: e.target.value})} className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white outline-none focus:border-blue-500/50 text-sm" />
                     </div>
                     <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tipo de Fornecedor</label>
                        <select value={formData.tipo} onChange={e => setFormData({...formData, tipo: e.target.value})} className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white outline-none focus:border-blue-500/50 text-sm appearance-none">
                           <option value="mercadoria">Mercadoria (Armazém / Stock)</option>
                           <option value="operacional">Operacional (Despesas / Renda / Água)</option>
                        </select>
                     </div>
                     <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Telefone / Contato</label>
                        <input type="text" value={formData.contato} onChange={e => setFormData({...formData, contato: e.target.value})} className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white outline-none focus:border-blue-500/50 text-sm" />
                     </div>
                     <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">E-mail</label>
                        <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white outline-none focus:border-blue-500/50 text-sm" />
                     </div>
                   </div>
                 </div>
               )}

               {activeTab === "morada" && (
                 <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                   <div className="sm:col-span-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Morada Completa</label>
                        <input type="text" value={formData.morada} onChange={e => setFormData({...formData, morada: e.target.value})} className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white outline-none focus:border-blue-500/50 text-sm" placeholder="Rua, Número, Andar..." />
                   </div>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Código Postal</label>
                        <input type="text" value={formData.codigo_postal} onChange={e => setFormData({...formData, codigo_postal: e.target.value})} className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white outline-none focus:border-blue-500/50 text-sm" placeholder="Ex: 1000-100" />
                     </div>
                     <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Localidade / Cidade</label>
                        <input type="text" value={formData.localidade} onChange={e => setFormData({...formData, localidade: e.target.value})} className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white outline-none focus:border-blue-500/50 text-sm" placeholder="Ex: Lisboa" />
                     </div>
                   </div>
                 </div>
               )}

               {activeTab === "pagamento" && (
                 <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div className="sm:col-span-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">IBAN</label>
                        <input type="text" value={formData.iban} onChange={e => setFormData({...formData, iban: e.target.value})} className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white outline-none focus:border-blue-500/50 text-sm uppercase font-mono" placeholder="PT50..." />
                     </div>
                     <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Banco</label>
                        <input type="text" value={formData.banco} onChange={e => setFormData({...formData, banco: e.target.value})} className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white outline-none focus:border-blue-500/50 text-sm" placeholder="Nome do Banco" />
                     </div>
                     <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">SWIFT / BIC</label>
                        <input type="text" value={formData.swift_bic} onChange={e => setFormData({...formData, swift_bic: e.target.value})} className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white outline-none focus:border-blue-500/50 text-sm uppercase font-mono" placeholder="Ex: CGDPTPL" />
                     </div>
                     <div className="sm:col-span-2 mt-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Condições de Pagamento</label>
                        <select value={formData.condicoes_pagamento} onChange={e => setFormData({...formData, condicoes_pagamento: e.target.value})} className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white outline-none focus:border-blue-500/50 text-sm appearance-none">
                           <option value="">Selecione...</option>
                           <option value="pronto">Pronto Pagamento</option>
                           <option value="15_dias">15 Dias</option>
                           <option value="30_dias">30 Dias</option>
                           <option value="60_dias">60 Dias</option>
                           <option value="90_dias">90 Dias</option>
                           <option value="transferencia">Transferência Bancária</option>
                           <option value="debito_direto">Débito Direto</option>
                        </select>
                     </div>
                   </div>
                 </div>
               )}
            </form>

            <div className="p-6 border-t border-white/10 bg-black/20 flex gap-4 shrink-0">
               <button onClick={() => setIsModalOpen(false)} type="button" className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-all">Cancelar</button>
               <button form="supplierForm" type="submit" className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)]">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {selectedSupplierForProducts && (
        <div className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center sm:p-4 z-[60] lg:pl-72">
          <div className="bg-[#0a0a0a] rounded-t-3xl sm:rounded-3xl w-full max-w-3xl border border-white/10 shadow-2xl flex flex-col h-[80vh] sm:h-auto sm:max-h-[90vh] overflow-hidden">
             <div className="p-4 sm:p-6 border-b border-white/10 shrink-0 flex items-center justify-between">
                <div>
                   <h2 className="text-lg sm:text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
                     <Package className="text-blue-500" />
                     Produtos
                   </h2>
                   <p className="text-slate-400 text-xs sm:text-sm mt-1">
                      Comprados a <strong className="text-white">{selectedSupplierForProducts.nome}</strong>
                   </p>
                </div>
                <button onClick={() => setSelectedSupplierForProducts(null)} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all">
                   <X size={20} />
                </button>
             </div>

             <div className="p-4 sm:p-6 overflow-y-auto flex-1 custom-scrollbar">
                {isSupplierProductsLoading ? (
                   <div className="flex flex-col items-center justify-center py-20">
                      <img src={`${import.meta.env.VITE_SUPABASE_URL || "https://ybaoaskddcmwoincsnwm.supabase.co"}/storage/v1/object/public/uploads/icon.png`} alt="Carregando..." className="w-8 h-8 animate-spin opacity-80" />
                      <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">A carregar produtos...</p>
                   </div>
                ) : supplierProducts.length === 0 ? (
                   <div className="text-center py-10">
                      <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                         <Package className="text-slate-600" size={24} />
                      </div>
                      <p className="text-slate-400">Ainda não comprou produtos a este fornecedor.</p>
                   </div>
                ) : (
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {supplierProducts.map((p, idx) => (
                         <div key={idx} className="bg-black/20 border border-white/5 rounded-2xl p-4 hover:bg-white/5 hover:border-white/10 transition-all flex items-start gap-4">
                            <div className="flex-1 min-w-0">
                               <h4 className="text-sm font-bold text-white mb-2 truncate">{p.nome}</h4>
                               <div className="flex flex-wrap gap-2 mt-2">
                                  <div className="px-2.5 py-1 bg-white/5 rounded-lg border border-white/5 flex items-center gap-1.5 shrink-0">
                                     <Tag size={12} className="text-blue-400" />
                                     <span className="text-xs font-medium text-slate-300">
                                        € {Number(p.ultimo_preco).toFixed(2)}
                                     </span>
                                  </div>
                                  <div className="px-2.5 py-1 bg-white/5 rounded-lg border border-white/5 flex items-center gap-1.5 shrink-0">
                                     <Calendar size={12} className="text-emerald-400" />
                                     <span className="text-xs font-medium text-slate-300">
                                        {p.ultima_compra ? new Date(p.ultima_compra).toLocaleDateString('pt-PT') : 'N/A'}
                                     </span>
                                  </div>
                               </div>
                            </div>
                            <div className="text-right shrink-0">
                                <div className="text-[10px] uppercase font-black tracking-widest text-slate-500 mb-1">Qtd Total</div>
                                <div className="text-lg font-bold text-white tabular-nums">{p.quantidade_total}</div>
                            </div>
                         </div>
                      ))}
                   </div>
                )}
             </div>
          </div>
        </div>
      )}

      {/* Relatórios Modal */}
      {isReportsModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center sm:p-4 z-[60] lg:pl-72">
          <div className="bg-[#0a0a0a] rounded-t-3xl sm:rounded-3xl w-full max-w-6xl border border-white/10 shadow-2xl flex flex-col h-[80vh] sm:h-[85vh] sm:max-h-[90vh] overflow-hidden">
             <div className="p-4 sm:p-6 border-b border-white/10 shrink-0 flex items-center justify-between">
                <div>
                   <h2 className="text-lg sm:text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
                     <FileBarChart className="text-blue-500 shrink-0" />
                     Relatórios & Análise
                   </h2>
                </div>
                <button onClick={() => setIsReportsModalOpen(false)} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all shrink-0">
                   <X size={20} />
                </button>
             </div>
             
             <div className="p-4 sm:px-6 sm:py-4 border-b border-white/10 bg-black/40 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 bg-white/5 rounded-xl p-1 border border-white/10">
                   <button
                     onClick={() => { setReportPeriod("mes"); if (reportsTab === "fornecedores" && selectedReportSupplierId) fetchSupplierProductsList(selectedReportSupplierId, 'mes', reportMonth, reportYear); if (reportsTab === "produtos" && selectedReportProductId) fetchProductReport(selectedReportProductId, 'mes', reportMonth, reportYear); }}
                     className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${reportPeriod === 'mes' ? 'bg-blue-500 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                   >
                     Mês Específico
                   </button>
                   <button
                     onClick={() => { setReportPeriod("todos"); if (reportsTab === "fornecedores" && selectedReportSupplierId) fetchSupplierProductsList(selectedReportSupplierId, 'todos', reportMonth, reportYear); if (reportsTab === "produtos" && selectedReportProductId) fetchProductReport(selectedReportProductId, 'todos', reportMonth, reportYear); }}
                     className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${reportPeriod === 'todos' ? 'bg-blue-500 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                   >
                     Todo o Período
                   </button>
                </div>
                {reportPeriod === "mes" && (
                   <div className="flex items-center gap-2">
                      <select
                         value={reportMonth}
                         onChange={(e) => { const val = Number(e.target.value); setReportMonth(val); if (reportsTab === "fornecedores" && selectedReportSupplierId) fetchSupplierProductsList(selectedReportSupplierId, 'mes', val, reportYear); if (reportsTab === "produtos" && selectedReportProductId) fetchProductReport(selectedReportProductId, 'mes', val, reportYear); }}
                         className="bg-[#111] border border-white/10 rounded-xl px-3 py-1.5 text-xs font-bold text-white uppercase tracking-wider outline-none focus:border-blue-500 transition-colors"
                      >
                         {monthNames.map((m, i) => (
                            <option key={i} value={i}>{m}</option>
                         ))}
                      </select>
                      <select
                         value={reportYear}
                         onChange={(e) => { const val = Number(e.target.value); setReportYear(val); if (reportsTab === "fornecedores" && selectedReportSupplierId) fetchSupplierProductsList(selectedReportSupplierId, 'mes', reportMonth, val); if (reportsTab === "produtos" && selectedReportProductId) fetchProductReport(selectedReportProductId, 'mes', reportMonth, val); }}
                         className="bg-[#111] border border-white/10 rounded-xl px-3 py-1.5 text-xs font-bold text-white uppercase tracking-wider outline-none focus:border-blue-500 transition-colors"
                      >
                         {[2024, 2025, 2026, 2027].map(y => (
                            <option key={y} value={y}>{y}</option>
                         ))}
                      </select>
                   </div>
                )}
             </div>

             <div className="flex border-b border-white/10 shrink-0 overflow-x-auto custom-scrollbar">
               <button 
                  onClick={() => setReportsTab('produtos')}
                  className={`flex-1 min-w-max px-4 py-3 sm:py-4 text-xs sm:text-sm font-bold uppercase tracking-wider border-b-2 transition-all ${reportsTab === 'produtos' ? 'border-blue-500 text-blue-500 bg-blue-500/5' : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'}`}
               >
                 Produtos
               </button>
               <button 
                  onClick={() => setReportsTab('fornecedores')}
                  className={`flex-1 min-w-max px-4 py-3 sm:py-4 text-xs sm:text-sm font-bold uppercase tracking-wider border-b-2 transition-all ${reportsTab === 'fornecedores' ? 'border-blue-500 text-blue-500 bg-blue-500/5' : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'}`}
               >
                 Fornecedores
               </button>
             </div>

             <div className="p-4 sm:p-6 overflow-y-auto flex-1 custom-scrollbar">
                {reportsTab === 'produtos' && (
                   <div className="space-y-6">
                      <div>
                         <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2 block">Selecione o Produto</label>
                         <SearchableCombobox 
                            options={products}
                            value={selectedReportProductId}
                            onChange={setSelectedReportProductId}
                            placeholder="Procurar produto..."
                            labelKey="nome"
                            valueKey="id"
                         />
                      </div>
                      
                      {selectedReportProductId && (
                         <div className="pt-4 border-t border-white/10">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-sm font-bold text-slate-300">Fornecedores</h3>
                                {productSuppliersReport.length > 0 && (
                                   <button 
                                     onClick={() => exportToCSV(productSuppliersReport, `relatorio_produto`)}
                                     className="text-[10px] uppercase tracking-wider font-bold bg-white/5 border border-white/10 hover:bg-white/10 text-white py-1.5 px-3 rounded-lg transition-all flex items-center gap-2"
                                   >
                                     <FileText size={12} /> Exportar CSV
                                   </button>
                                )}
                            </div>
                            {isReportLoading ? (
                               <div className="flex justify-center py-10"><img src={`${import.meta.env.VITE_SUPABASE_URL || "https://ybaoaskddcmwoincsnwm.supabase.co"}/storage/v1/object/public/uploads/icon.png`} alt="Carregando..." className="w-8 h-8 animate-spin opacity-80" /></div>
                            ) : productSuppliersReport.length === 0 ? (
                               <p className="text-slate-400 text-center py-10">Nenhum histórico de compras encontrado para este produto.</p>
                            ) : (
                               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  {productSuppliersReport.sort((a,b) => a.ultimo_preco - b.ultimo_preco).map((r, idx) => (
                                     <div key={idx} className="bg-black/20 border border-white/5 rounded-2xl p-4 hover:bg-white/5 transition-all">
                                        <h4 className="text-sm font-bold text-white mb-2">{r.nome}</h4>
                                        <div className="flex justify-between items-center bg-black/40 p-3 rounded-xl border border-white/5">
                                           <div>
                                             <div className="text-[10px] font-bold text-slate-500 uppercase">Último Preço</div>
                                             <div className="text-lg font-black text-emerald-400">€ {Number(r.ultimo_preco).toFixed(2)}</div>
                                           </div>
                                           <div className="text-right">
                                              <div className="text-[10px] font-bold text-slate-500 uppercase">Última Compra</div>
                                              <div className="text-sm text-slate-300 font-medium">{r.ultima_compra ? new Date(r.ultima_compra).toLocaleDateString('pt-PT') : '-'}</div>
                                           </div>
                                        </div>
                                     </div>
                                  ))}
                               </div>
                            )}
                         </div>
                      )}
                   </div>
                )}
                
                {reportsTab === 'fornecedores' && (
                   <div className="space-y-6">
                      <div>
                         <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2 block">Selecione o Fornecedor</label>
                         <SearchableCombobox 
                            options={fornecedores}
                            value={selectedReportSupplierId}
                            onChange={(val) => {
                               setSelectedReportSupplierId(val);
                               if(val) {
                                  fetchSupplierProductsList(val);
                               } else {
                                  setSupplierProducts([]);
                               }
                            }}
                            placeholder="Procurar fornecedor..."
                            labelKey="nome"
                            valueKey="id"
                         />
                      </div>
                      
                      {selectedReportSupplierId && (
                         <div className="pt-4 border-t border-white/10">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-sm font-bold text-slate-300">Produtos Comprados</h3>
                                {supplierProducts.length > 0 && (
                                   <button 
                                     onClick={() => exportToCSV(supplierProducts, `relatorio_fornecedor`)}
                                     className="text-[10px] uppercase tracking-wider font-bold bg-white/5 border border-white/10 hover:bg-white/10 text-white py-1.5 px-3 rounded-lg transition-all flex items-center gap-2"
                                   >
                                     <FileText size={12} /> Exportar CSV
                                   </button>
                                )}
                            </div>
                            {isSupplierProductsLoading ? (
                               <div className="flex justify-center py-10"><img src={`${import.meta.env.VITE_SUPABASE_URL || "https://ybaoaskddcmwoincsnwm.supabase.co"}/storage/v1/object/public/uploads/icon.png`} alt="Carregando..." className="w-8 h-8 animate-spin opacity-80" /></div>
                            ) : supplierProducts.length === 0 ? (
                               <p className="text-slate-400 text-center py-10">Nenhum produto comprado a este fornecedor.</p>
                            ) : (
                               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  {supplierProducts.map((p, idx) => (
                                     <div key={idx} className="bg-black/20 border border-white/5 rounded-2xl p-4 flex flex-col gap-2">
                                        <h4 className="text-sm font-bold text-white truncate">{p.nome}</h4>
                                        <div className="flex justify-between items-end">
                                           <div className="px-2.5 py-1 bg-white/5 rounded-lg border border-white/5 flex items-center gap-1.5 shrink-0">
                                              <Tag size={12} className="text-blue-400" />
                                              <span className="text-xs font-medium text-slate-300">€ {Number(p.ultimo_preco).toFixed(2)}</span>
                                           </div>
                                           <div className="text-right">
                                              <div className="text-[10px] font-bold text-slate-500 uppercase">Qtd Total</div>
                                              <div className="text-sm font-bold text-white">{p.quantidade_total}</div>
                                           </div>
                                        </div>
                                     </div>
                                  ))}
                               </div>
                            )}
                         </div>
                      )}
                   </div>
                )}
             </div>
          </div>
        </div>
      )}

    </div>
  );
}

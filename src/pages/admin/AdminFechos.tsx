import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Calendar, Plus, Trash2, Search, Save, History, DollarSign, Calculator, Store, ChevronDown, ArrowLeft } from "lucide-react";
import Swal from "sweetalert2";
import api from "../../lib/api";
import { ContentViewport } from "../../components/layout/ContentViewport";
import { BarChart2 } from "lucide-react";
import { BrandTitle } from "../../components/BrandTitle";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, CartesianGrid, YAxis, Legend } from "recharts";

export default function AdminFechos() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [lojas, setLojas] = useState<any[]>([]);
  const [fechos, setFechos] = useState<any[]>([]);
  const [prevFechos, setPrevFechos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLojaId, setSelectedLojaId] = useState<string>('all');

  const formatVal = (v: number, hasData: boolean = true) => { if (!hasData) return "-"; return v < 0 ? `-€${Math.abs(v).toFixed(2)}` : `€${v.toFixed(2)}`; };
  const lojasToDisplay = selectedLojaId === 'all' ? lojas : lojas.filter(l => l.id === selectedLojaId);

  // Load lojas
  useEffect(() => {
    const fetchLojas = async () => {
      try {
        const res = await api.get("/admin/users");
        // Filter users by role 'loja'
        const lojasData = Array.isArray(res.data) ? res.data.filter((u: any) => u.role === 'loja') : [];
        setLojas(lojasData);
      } catch (err) {
        console.error("Erro ao carregar lojas:", err);
        setLojas([]);
      }
    };
    fetchLojas();
  }, []);

  // Load fechos for the selected month
  useEffect(() => {
    const fetchFechos = async () => {
      setIsLoading(true);
      try {
        const month = selectedDate.getMonth() + 1;
        const year = selectedDate.getFullYear();
        const pMonth = selectedDate.getMonth() === 0 ? 12 : selectedDate.getMonth();
        const pYear = selectedDate.getMonth() === 0 ? year - 1 : year;
        
        const [res, resPrev] = await Promise.all([
           api.get(`/admin/fechos?month=${month}&year=${year}`),
           api.get(`/admin/fechos?month=${pMonth}&year=${pYear}`)
        ]);
        
        setFechos(res.data || []);
        setPrevFechos(resPrev.data || []);
      } catch (err) {
        console.error("Erro ao carregar fechos:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchFechos();
  }, [selectedDate]);

  const changeMonth = (delta: number) => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + delta);
    setSelectedDate(newDate);
  };

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];
  const displayMonth = `${monthNames[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;

  // Get days in month
  const daysInMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Group fechos by data and loja
  // we need an easy way to look up a fecho by day and loja
  const getFecho = (day: number, lojaId: string) => {
     const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
     return fechos.find(f => f.data === dateStr && f.loja_id === lojaId);
  };

  const handleEdit = (day: number, loja: any) => {

     const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
     const existing = getFecho(day, loja.id);
     
     const formulasKey = `fechos_formulas_${loja.id}_${dateStr}`;
     let savedFormulas: any = {};
     try {
         savedFormulas = JSON.parse(localStorage.getItem(formulasKey) || '{}');
     } catch(e) {}

     const getVal = (val: number | string, field: string) => {
         const formula = savedFormulas[field];
         if (formula) {
             try {
                 const expr = formula.split('=')[0];
                 const sanitized = expr.replace(/,/g, '.').replace(/[^0-9.+\-*/()]/g, '');
                 const evaluated = parseFloat(new Function('return ' + sanitized)()) || 0;
                 const numericVal = typeof val === 'number' ? val : 0;
                 if (Math.abs(evaluated - numericVal) < 0.01) {
                     return formula;
                 }
             } catch (e) {}
         }
         return val;
     };

     // default values - use ?? "" to make it empty by default instead of 0
     let sysMb = getVal(existing?.sys_mb ?? "", 'sys_mb');
     let sysDinheiro = getVal(existing?.sys_dinheiro ?? "", 'sys_dinheiro');
     let sysMesa = getVal(existing?.sys_mesa ?? "", 'sys_mesa');
     let sysUber = getVal(existing?.sys_uber ?? "", 'sys_uber');
     let realMb = getVal(existing?.real_mb ?? "", 'real_mb');
     let realDinheiro = getVal(existing?.real_dinheiro ?? "", 'real_dinheiro');
     let realMesa = getVal(existing?.real_mesa ?? "", 'real_mesa');
     let realUber = getVal(existing?.real_uber ?? "", 'real_uber');

     let despesas = existing?.despesas ?? "";

     Swal.fire({
        title: `Fecho de Caixa - ${day}/${String(selectedDate.getMonth()+1).padStart(2,'0')} - ${loja.name}`,
        html: `
          <div class="grid grid-cols-2 gap-4 text-left">
             <div class="space-y-4">
                <h4 class="font-bold text-blue-500 uppercase text-xs tracking-wider border-b border-blue-500/20 pb-2">SISTEMA</h4>
                <div>
                   <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">MB (€)</label>
                   <input type="text" id="swal-sys-mb" class="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white" value="${sysMb}">
                </div>
                <div>
                   <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Dinheiro (€)</label>
                   <input type="text" id="swal-sys-dinheiro" class="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white" value="${sysDinheiro}">
                </div>
                <div>
                   <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Mesa (€)</label>
                   <input type="text" id="swal-sys-mesa" class="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white" value="${sysMesa}">
                </div>
                <div>
                   <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Uber (€)</label>
                   <input type="text" id="swal-sys-uber" class="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white" value="${sysUber}">
                </div>
             </div>
             <div class="space-y-4">
                <h4 class="font-bold text-emerald-500 uppercase text-xs tracking-wider border-b border-emerald-500/20 pb-2">APRESENTADO</h4>
                <div>
                   <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">MB (€)</label>
                   <input type="text" id="swal-real-mb" class="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white" value="${realMb}">
                </div>
                <div>
                   <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Dinheiro (€)</label>
                   <input type="text" id="swal-real-dinheiro" class="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white" value="${realDinheiro}">
                </div>
                <div>
                   <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Mesa (€)</label>
                   <input type="text" id="swal-real-mesa" class="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white" value="${realMesa}">
                </div>
                <div>
                   <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Uber (€)</label>
                   <input type="text" id="swal-real-uber" class="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white" value="${realUber}">
                </div>
             </div>
          </div>
        `,
        width: 600,
        background: '#111',
        color: '#fff',
        showCancelButton: true,
        confirmButtonColor: '#3b82f6',
        cancelButtonColor: '#3f3f46',
        confirmButtonText: 'Guardar',
        cancelButtonText: 'Cancelar',
        preConfirm: () => {
           const formulasToSave: any = {};
           const val = (id: string, field: string) => {
              const str = (document.getElementById(id) as HTMLInputElement).value;
              if (!str) return 0;
              formulasToSave[field] = str;
              try {
                 const expr = str.split('=')[0];
                 const sanitized = expr.replace(/,/g, '.').replace(/[^0-9.+\-*/()]/g, '');
                 if (!sanitized) return 0;
                 return parseFloat(new Function('return ' + sanitized)()) || 0;
              } catch (e) {
                 return 0;
              }
           };
           const payload = {
              data: dateStr,
              loja_id: loja.id,
              sys_mb: val('swal-sys-mb', 'sys_mb'),
              sys_dinheiro: val('swal-sys-dinheiro', 'sys_dinheiro'),
              sys_mesa: val('swal-sys-mesa', 'sys_mesa'),
              sys_uber: val('swal-sys-uber', 'sys_uber'),
              real_mb: val('swal-real-mb', 'real_mb'),
              real_dinheiro: val('swal-real-dinheiro', 'real_dinheiro'),
              real_mesa: val('swal-real-mesa', 'real_mesa'),
              real_uber: val('swal-real-uber', 'real_uber'),
              despesas: 0
           };
           try {
              localStorage.setItem(formulasKey, JSON.stringify(formulasToSave));
           } catch(e) {}
           return payload;
        }
     }).then(async (result) => {
        if (result.isConfirmed) {
           try {
              const res = await api.post('/admin/fechos', result.value);
              setFechos(prev => {
                 const newFechos = prev.filter(f => !(f.data === (res.data as any).data && f.loja_id === (res.data as any).loja_id));
                 return [...newFechos, res.data];
              });
              Swal.fire({
                 title: 'Guardado',
                 icon: 'success',
                 toast: true,
                 position: 'top-end',
                 timer: 2000,
                 showConfirmButton: false
              });
           } catch (err: any) {
              Swal.fire('Erro', err.response?.data?.error || 'Erro ao guardar', 'error');
           }
        }
     });
  };

  const chartData = lojas.map(loja => {
      const cFechos = fechos.filter(f => f.loja_id === loja.id);
      const pFechos = prevFechos.filter(f => f.loja_id === loja.id);
      
      const calcTotal = (arr: any[]) => arr.reduce((acc, f) => {
         return acc + Number(f.sys_mb || 0) + Number(f.sys_dinheiro || 0) + Number(f.sys_mesa || 0) + Number(f.sys_uber || 0);
      }, 0);
      
      return {
         id: loja.id,
         name: loja.name.split(' ')[0],
         atual: calcTotal(cFechos),
         anterior: calcTotal(pFechos)
      };
  });

  return (
    <ContentViewport>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors border border-white/5"
            title="Voltar"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <BrandTitle title="Fechos de Caixa" hideUnderline titleClassName="max-md:mt-0 md:-mt-4 max-md:pl-0 max-md:pt-0 max-md:ml-0 !mb-1" />
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-zinc-400">
               <Store size={16} />
            </div>
            <select
              value={selectedLojaId}
              onChange={(e) => setSelectedLojaId(e.target.value)}
              className="bg-zinc-900 border border-white/10 text-zinc-300 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block pl-10 pr-10 py-2.5 outline-none appearance-none hover:bg-zinc-800 transition-colors shadow-sm cursor-pointer min-w-[200px]"
            >
              <option value="all">Todas as Lojas</option>
              {lojas.map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-zinc-400">
               <ChevronDown size={16} />
            </div>
          </div>

          <div className="flex items-center bg-zinc-900 border border-white/10 rounded-lg p-1">
            <button 
              onClick={() => changeMonth(-1)}
              className="p-1.5 hover:bg-white/5 rounded-md text-zinc-400 transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="flex items-center gap-2 px-3 py-1 font-medium text-emerald-400 min-w-[140px] justify-center">
              <Calendar size={16} />
              {displayMonth}
            </div>
            <button 
              onClick={() => changeMonth(1)}
              className="p-1.5 hover:bg-white/5 rounded-md text-zinc-400 transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-[#111] border border-white/10 rounded-3xl shadow-lg overflow-hidden flex flex-col min-h-[600px] mb-8 relative p-6">
        {selectedLojaId === 'all' ? (
           <div className="flex flex-col w-full h-[500px]">
              <div className="mb-6">
                 <h3 
                    className="text-2xl md:text-3xl text-[#facc15] tracking-wider leading-tight flex items-center gap-2"
                    style={{
                       fontFamily: "'Yellowtail', cursive",
                       textShadow: "1px 1px 3px rgba(0,0,0,0.5)"
                    }}
                 >
                    <BarChart2 className="text-blue-500" size={24} />
                    Faturação
                 </h3>
              </div>
              <div className="flex-1 min-h-0">
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ left: -20, right: 0, top: 20, bottom: 80 }}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                       <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11, angle: -45, textAnchor: 'end', dy: 15, dx: -5 }} height={80} interval={0} />
                       <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} tickFormatter={(val) => `€${val}`} />
                       <Tooltip 
                          cursor={{ fill: '#ffffff05' }}
                          contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#fff', borderRadius: '8px' }}
                          itemStyle={{ color: '#e4e4e7' }}
                          formatter={(value) => [`€${Number(value).toFixed(2)}`, '']}
                       />
                       <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '20px' }} />
                       <Bar dataKey="atual" name="Mês Atual" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={60} onClick={(data: any) => data?.id && setSelectedLojaId(data.id)} cursor="pointer" />
                       <Bar dataKey="anterior" name="Mês Anterior" fill="#64748b" radius={[4, 4, 0, 0]} maxBarSize={60} opacity={0.5} onClick={(data: any) => data?.id && setSelectedLojaId(data.id)} cursor="pointer" />
                    </BarChart>
                 </ResponsiveContainer>
              </div>
           </div>
        ) : (
           <div className="overflow-x-auto -mx-6 -my-6">
              
        <div className="overflow-x-auto">
           {lojasToDisplay.map(loja => (
             <div key={loja.id} className="mb-12">
                <div className="p-4 bg-zinc-900/50 border-b border-t border-white/5 sticky left-0 font-bold text-blue-400 uppercase tracking-wider text-sm flex items-center gap-2">
                   <Calculator size={16} /> {loja.name}
                </div>
                <table className="w-full text-left border-collapse min-w-[1200px]">
                   <thead>
                      <tr className="border-b border-white/10 bg-black/40">
                         <th className="p-3 sticky left-0 bg-[#111] z-10 border-b border-white/10"></th>
                         <th colSpan={5} className="p-3 text-[11px] font-black text-blue-500 uppercase tracking-widest text-center border-l border-b border-white/10 bg-blue-500/5">Sistema</th>
                         <th colSpan={5} className="p-3 text-[11px] font-black text-emerald-500 uppercase tracking-widest text-center border-l border-b border-white/10 bg-emerald-500/5">Apresentado</th>
                         <th colSpan={2} className="p-3 border-l border-b border-white/10 bg-white/5"></th>
                      </tr>
                      <tr className="border-b border-white/10 bg-black/20">
                         <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap sticky left-0 bg-[#111] z-10 shadow-[4px_0_12px_rgba(0,0,0,0.5)]">Data</th>
                         {/* SISTEMA */}
                         <th className="p-3 text-[10px] font-black text-blue-500 uppercase tracking-widest whitespace-nowrap border-l border-white/10 bg-blue-500/5 text-right">MB</th>
                         <th className="p-3 text-[10px] font-black text-blue-500 uppercase tracking-widest whitespace-nowrap bg-blue-500/5 text-right">Dinheiro</th>
                         <th className="p-3 text-[10px] font-black text-blue-500 uppercase tracking-widest whitespace-nowrap bg-blue-500/5 text-right">Mesa</th>
                         <th className="p-3 text-[10px] font-black text-blue-500 uppercase tracking-widest whitespace-nowrap bg-blue-500/5 text-right">Uber</th>
                         <th className="p-3 text-[10px] font-black text-blue-400 uppercase tracking-widest whitespace-nowrap bg-blue-500/10 text-right">Total</th>
                         {/* APRESENTADO */}
                         <th className="p-3 text-[10px] font-black text-emerald-500 uppercase tracking-widest whitespace-nowrap border-l border-white/10 bg-emerald-500/5 text-right">MB</th>
                         <th className="p-3 text-[10px] font-black text-emerald-500 uppercase tracking-widest whitespace-nowrap bg-emerald-500/5 text-right">Dinheiro</th>
                         <th className="p-3 text-[10px] font-black text-emerald-500 uppercase tracking-widest whitespace-nowrap bg-emerald-500/5 text-right">Mesa</th>
                         <th className="p-3 text-[10px] font-black text-emerald-500 uppercase tracking-widest whitespace-nowrap bg-emerald-500/5 text-right">Uber</th>
                         <th className="p-3 text-[10px] font-black text-emerald-400 uppercase tracking-widest whitespace-nowrap bg-emerald-500/10 text-right">Total</th>
                         {/* TOTALS */}
                         <th className="p-3 text-[10px] font-black text-white uppercase tracking-widest whitespace-nowrap border-l border-white/10 bg-white/5 text-right">Dif Sis/Apre</th>
                         <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap w-16 text-center">Ações</th>
                      </tr>
                   </thead>
                   <tbody className="text-sm">
                      {days.map(day => {
                         const fecho = getFecho(day, loja.id);
                         const hasData = !!fecho;
                         
                         const sysMb = fecho?.sys_mb || 0;
                         const sysDin = fecho?.sys_dinheiro || 0;
                         const sysMesa = fecho?.sys_mesa || 0;
                         const sysUber = fecho?.sys_uber || 0;
                         const tVenda = sysMb + sysDin + sysMesa + sysUber;
                         
                         const realMb = fecho?.real_mb || 0;
                         const realDin = fecho?.real_dinheiro || 0;
                         const realMesa = fecho?.real_mesa || 0;
                         const realUber = fecho?.real_uber || 0;
                         const tVendasApre = realMb + realDin + realMesa + realUber;
                         
                         const dif = tVendasApre - tVenda;
                         
                         const difColor = dif > 0 ? "text-emerald-400" : dif < 0 ? "text-rose-400" : "text-zinc-500";
                         
                         return (
                            <tr key={day} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                               <td className="p-3 whitespace-nowrap text-zinc-300 font-medium sticky left-0 bg-[#111] group-hover:bg-[#1a1a1a] transition-colors z-10 shadow-[4px_0_12px_rgba(0,0,0,0.5)]">
                                  {String(day).padStart(2, '0')}/{String(selectedDate.getMonth()+1).padStart(2, '0')}
                               </td>
                               
                               {/* SISTEMA */}
                               <td className="p-3 text-right text-zinc-400 border-l border-white/10 bg-blue-500/[0.02]">
                                  {formatVal(sysMb, hasData)}
                               </td>
                               <td className="p-3 text-right text-zinc-400 bg-blue-500/[0.02]">
                                  {formatVal(sysDin, hasData)}
                               </td>
                               <td className="p-3 text-right text-zinc-400 bg-blue-500/[0.02]">
                                  {formatVal(sysMesa, hasData)}
                               </td>
                               <td className="p-3 text-right text-zinc-400 bg-blue-500/[0.02]">
                                  {formatVal(sysUber, hasData)}
                               </td>
                               <td className="p-3 text-right font-bold text-blue-400 bg-blue-500/[0.05]">
                                  {formatVal(tVenda, hasData)}
                               </td>

                               {/* APRESENTADO */}
                               <td className="p-3 text-right text-zinc-400 border-l border-white/10 bg-emerald-500/[0.02]">
                                  {formatVal(realMb, hasData)}
                               </td>
                               <td className="p-3 text-right text-zinc-400 bg-emerald-500/[0.02]">
                                  {formatVal(realDin, hasData)}
                               </td>
                               <td className="p-3 text-right text-zinc-400 bg-emerald-500/[0.02]">
                                  {formatVal(realMesa, hasData)}
                               </td>
                               <td className="p-3 text-right text-zinc-400 bg-emerald-500/[0.02]">
                                  {formatVal(realUber, hasData)}
                               </td>
                               <td className="p-3 text-right font-bold text-emerald-400 bg-emerald-500/[0.05]">
                                  {formatVal(tVendasApre, hasData)}
                               </td>
                               
                               {/* TOTALS */}
                               <td className={`p-3 text-right font-bold border-l border-white/10 bg-white/[0.02] ${difColor}`}>
                                  {hasData ? (dif > 0 ? `+€${dif.toFixed(2)}` : dif < 0 ? `-€${Math.abs(dif).toFixed(2)}` : '€0.00') : '-'}
                               </td>
                               
                               <td className="p-3 text-center">
                                  <button 
                                     onClick={() => handleEdit(day, loja)}
                                     className="p-1.5 bg-white/5 hover:bg-blue-500 hover:text-white rounded-lg text-zinc-400 transition-colors"
                                  >
                                     <Save size={14} />
                                  </button>
                               </td>
                            </tr>
                         );
                      })}
                      {(() => {
                         const totais = days.reduce((acc, day) => {
                             const fecho = getFecho(day, loja.id);
                             if (!fecho) return acc;
                             
                             const sysMb = Number(fecho.sys_mb || 0);
                             const sysDin = Number(fecho.sys_dinheiro || 0);
                             const sysMesa = Number(fecho.sys_mesa || 0);
                             const sysUber = Number(fecho.sys_uber || 0);
                             const tVenda = sysMb + sysDin + sysMesa + sysUber;
                             
                             const realMb = Number(fecho.real_mb || 0);
                             const realDin = Number(fecho.real_dinheiro || 0);
                             const realMesa = Number(fecho.real_mesa || 0);
                             const realUber = Number(fecho.real_uber || 0);
                             const tVendasApre = realMb + realDin + realMesa + realUber;
                             
                             return {
                                sysMb: acc.sysMb + sysMb,
                                sysDin: acc.sysDin + sysDin,
                                sysMesa: acc.sysMesa + sysMesa,
                                sysUber: acc.sysUber + sysUber,
                                tVenda: acc.tVenda + tVenda,
                                realMb: acc.realMb + realMb,
                                realDin: acc.realDin + realDin,
                                realMesa: acc.realMesa + realMesa,
                                realUber: acc.realUber + realUber,
                                tVendasApre: acc.tVendasApre + tVendasApre,
                                dif: acc.dif + (tVendasApre - tVenda)
                             };
                         }, {
                             sysMb: 0, sysDin: 0, sysMesa: 0, sysUber: 0, tVenda: 0,
                             realMb: 0, realDin: 0, realMesa: 0, realUber: 0, tVendasApre: 0, dif: 0
                         });

                         const difColor = totais.dif > 0 ? "text-emerald-400" : totais.dif < 0 ? "text-rose-400" : "text-zinc-500";
                         
                         return (
                            <tr className="border-t-2 border-white/20 bg-black/60 group">
                               <td className="p-3 text-right text-zinc-300 font-bold uppercase tracking-widest sticky left-0 bg-[#111] z-10 shadow-[4px_0_12px_rgba(0,0,0,0.5)] border-t-2 border-white/10">
                                  TOTAL
                               </td>
                               
                               {/* SISTEMA */}
                               <td className="p-3 text-right font-bold text-blue-400 border-l border-white/10 bg-blue-500/[0.05]">
                                  {formatVal(totais.sysMb)}
                               </td>
                               <td className="p-3 text-right font-bold text-blue-400 bg-blue-500/[0.05]">
                                  {formatVal(totais.sysDin)}
                               </td>
                               <td className="p-3 text-right font-bold text-blue-400 bg-blue-500/[0.05]">
                                  {formatVal(totais.sysMesa)}
                               </td>
                               <td className="p-3 text-right font-bold text-blue-400 bg-blue-500/[0.05]">
                                  {formatVal(totais.sysUber)}
                               </td>
                               <td className="p-3 text-right font-black text-blue-500 bg-blue-500/[0.1]">
                                  {formatVal(totais.tVenda)}
                               </td>

                               {/* APRESENTADO */}
                               <td className="p-3 text-right font-bold text-emerald-400 border-l border-white/10 bg-emerald-500/[0.05]">
                                  {formatVal(totais.realMb)}
                               </td>
                               <td className="p-3 text-right font-bold text-emerald-400 bg-emerald-500/[0.05]">
                                  {formatVal(totais.realDin)}
                               </td>
                               <td className="p-3 text-right font-bold text-emerald-400 bg-emerald-500/[0.05]">
                                  {formatVal(totais.realMesa)}
                               </td>
                               <td className="p-3 text-right font-bold text-emerald-400 bg-emerald-500/[0.05]">
                                  {formatVal(totais.realUber)}
                               </td>
                               <td className="p-3 text-right font-black text-emerald-500 bg-emerald-500/[0.1]">
                                  {formatVal(totais.tVendasApre)}
                               </td>
                               
                               {/* TOTALS */}
                               <td className={`p-3 text-right font-black border-l border-white/10 bg-white/[0.05] ${difColor}`}>
                                  {totais.dif > 0 ? `+€${totais.dif.toFixed(2)}` : totais.dif < 0 ? `-€${Math.abs(totais.dif).toFixed(2)}` : '€0.00'}
                               </td>
                               
                               <td className="p-3 text-center bg-white/[0.02]">
                               </td>
                            </tr>
                         );
                      })()}
                   </tbody>
                </table>
             </div>
           ))}
           {lojasToDisplay.length === 0 && !isLoading && (
              <div className="p-12 text-center text-zinc-500">
                 Nenhuma loja encontrada.
              </div>
           )}
        </div>
           </div>
        )}
      </div>
    </ContentViewport>
  );
}

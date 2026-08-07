import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Calendar, Plus, Trash2, Search, Save, History, DollarSign, Calculator, Store, ChevronDown } from "lucide-react";
import Swal from "sweetalert2";
import api from "../../lib/api";
import { ContentViewport } from "../../components/layout/ContentViewport";
import { BrandTitle } from "../../components/BrandTitle";

export default function AdminFechos() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [lojas, setLojas] = useState<any[]>([]);
  const [fechos, setFechos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLojaId, setSelectedLojaId] = useState<string>('all');

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
        const res = await api.get(`/admin/fechos?month=${month}&year=${year}`);
        setFechos(res.data || []);
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
     
     // default values
     let sysMb = existing?.sys_mb || 0;
     let sysDinheiro = existing?.sys_dinheiro || 0;
     let sysMesa = existing?.sys_mesa || 0;
     let sysUber = existing?.sys_uber || 0;
     let realMb = existing?.real_mb || 0;
     let realDinheiro = existing?.real_dinheiro || 0;
     let realMesa = existing?.real_mesa || 0;
     let realUber = existing?.real_uber || 0;
     let despesas = existing?.despesas || 0;

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
           const val = (id: string) => {
              const str = (document.getElementById(id) as HTMLInputElement).value;
              if (!str) return 0;
              try {
                 const sanitized = str.replace(/,/g, '.').replace(/[^0-9.+\-*/()]/g, '');
                 if (!sanitized) return 0;
                 return parseFloat(new Function('return ' + sanitized)()) || 0;
              } catch (e) {
                 return 0;
              }
           };
           return {
              data: dateStr,
              loja_id: loja.id,
              sys_mb: val('swal-sys-mb'),
              sys_dinheiro: val('swal-sys-dinheiro'),
              sys_mesa: val('swal-sys-mesa'),
              sys_uber: val('swal-sys-uber'),
              real_mb: val('swal-real-mb'),
              real_dinheiro: val('swal-real-dinheiro'),
              real_mesa: val('swal-real-mesa'),
              real_uber: val('swal-real-uber'),
              despesas: 0
           };
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

  return (
    <ContentViewport>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <div>
          <BrandTitle title="Fechos de Caixa" hideUnderline titleClassName="max-md:mt-0 md:-mt-4 max-md:pl-0 max-md:pt-0 max-md:ml-0 !mb-1" />
          <p className="text-zinc-400 text-sm">Controle as diferenças entre o faturado no sistema e o valor real em caixa/banco.</p>
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

      <div className="bg-[#111] border border-white/10 rounded-3xl shadow-lg overflow-hidden flex flex-col min-h-[600px] mb-8 relative">
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
                                  {sysMb > 0 ? `€${sysMb.toFixed(2)}` : '-'}
                               </td>
                               <td className="p-3 text-right text-zinc-400 bg-blue-500/[0.02]">
                                  {sysDin > 0 ? `€${sysDin.toFixed(2)}` : '-'}
                               </td>
                               <td className="p-3 text-right text-zinc-400 bg-blue-500/[0.02]">
                                  {sysMesa > 0 ? `€${sysMesa.toFixed(2)}` : '-'}
                               </td>
                               <td className="p-3 text-right text-zinc-400 bg-blue-500/[0.02]">
                                  {sysUber > 0 ? `€${sysUber.toFixed(2)}` : '-'}
                               </td>
                               <td className="p-3 text-right font-bold text-blue-400 bg-blue-500/[0.05]">
                                  {tVenda > 0 ? `€${tVenda.toFixed(2)}` : '-'}
                               </td>

                               {/* APRESENTADO */}
                               <td className="p-3 text-right text-zinc-400 border-l border-white/10 bg-emerald-500/[0.02]">
                                  {realMb > 0 ? `€${realMb.toFixed(2)}` : '-'}
                               </td>
                               <td className="p-3 text-right text-zinc-400 bg-emerald-500/[0.02]">
                                  {realDin > 0 ? `€${realDin.toFixed(2)}` : '-'}
                               </td>
                               <td className="p-3 text-right text-zinc-400 bg-emerald-500/[0.02]">
                                  {realMesa > 0 ? `€${realMesa.toFixed(2)}` : '-'}
                               </td>
                               <td className="p-3 text-right text-zinc-400 bg-emerald-500/[0.02]">
                                  {realUber > 0 ? `€${realUber.toFixed(2)}` : '-'}
                               </td>
                               <td className="p-3 text-right font-bold text-emerald-400 bg-emerald-500/[0.05]">
                                  {tVendasApre > 0 ? `€${tVendasApre.toFixed(2)}` : '-'}
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
    </ContentViewport>
  );
}

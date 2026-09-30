import re

with open('src/pages/store/StoreManagement.tsx', 'r') as f:
    content = f.read()

# Match the old Benavente block
pattern = re.compile(r'(\s*{isBenavente && \(\s*<div className="bg-\[#111\].*?\s*</div\>\s*\)\})', re.DOTALL)

new_block = """
      {isBenavente && (
        <div className="bg-[#111]/80 backdrop-blur-xl border border-blue-500/20 rounded-3xl p-6 sm:p-8 shadow-2xl mb-8 mt-12 relative overflow-hidden">
           {/* Abstract Background Elements */}
           <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none" />
           <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none" />
           
           <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8 border-b border-white/5 pb-6">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(59,130,246,0.15)]">
                    <Star className="text-blue-400" size={24} />
                 </div>
                 <div>
                    <h2 className="text-2xl font-black text-white tracking-widest uppercase">BENAVENTE</h2>
                 </div>
              </div>
              
              <div className="flex items-center gap-3">
                 <div className="relative group">
                    <select 
                      value={benaventeMonth} 
                      onChange={(e) => setBenaventeMonth(Number(e.target.value))}
                      className="bg-black/50 border border-white/10 group-hover:border-blue-500/50 text-white text-xs font-bold uppercase tracking-wider rounded-xl px-4 py-3 outline-none appearance-none cursor-pointer transition-colors pr-10"
                    >
                      {['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'].map((m, i) => (
                        <option key={i} value={i} className="bg-zinc-900">{m}</option>
                      ))}
                    </select>
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-blue-400 pointer-events-none transition-colors" size={14} />
                 </div>
                 
                 <div className="relative group">
                    <select 
                      value={benaventeYear} 
                      onChange={(e) => setBenaventeYear(Number(e.target.value))}
                      className="bg-black/50 border border-white/10 group-hover:border-blue-500/50 text-white text-xs font-bold tracking-wider rounded-xl px-4 py-3 outline-none appearance-none cursor-pointer transition-colors pr-10"
                    >
                      {[new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1].map(y => (
                        <option key={y} value={y} className="bg-zinc-900">{y}</option>
                      ))}
                    </select>
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-blue-400 pointer-events-none transition-colors" size={14} />
                 </div>
              </div>
           </div>
           
           {(() => {
              const map = new Map();
              
              // Add Fechos (Vendas)
              fechos.forEach(f => {
                 const data = f.data;
                 if (!data) return;
                 const d = new Date(data);
                 if (d.getMonth() === benaventeMonth && d.getFullYear() === benaventeYear) {
                     if (!map.has(data)) map.set(data, { vendas: 0, compras: 0 });
                     map.get(data).vendas += Number(f.real_total || 0);
                 }
              });
              
              // Add Pedidos (Compras)
              const benaventeOrders = completedOrders.filter(o => {
                 const d = new Date(o.created_at);
                 return d.getMonth() === benaventeMonth && d.getFullYear() === benaventeYear;
              });
              
              benaventeOrders.forEach(o => {
                 const data = new Date(o.created_at).toISOString().split('T')[0];
                 if (!map.has(data)) map.set(data, { vendas: 0, compras: 0 });
                 map.get(data).compras += getPedidoTotalComIva(o) || 0;
              });
              
              const sortedKeys = Array.from(map.keys()).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
              
              let totalVendas = 0;
              let totalCompras = 0;
              sortedKeys.forEach(k => {
                 totalVendas += map.get(k).vendas;
                 totalCompras += map.get(k).compras;
              });
              
              const totalPct = totalVendas > 0 ? ((totalCompras / totalVendas) * 100) : 0;
              
              return (
                 <div className="relative z-10">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-8">
                       {/* KPI: Vendas */}
                       <div className="bg-black/40 border border-white/5 rounded-2xl p-5 flex flex-col justify-center items-start relative overflow-hidden group">
                          <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors" />
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Vendas (Fechos)</p>
                          <p className="text-2xl font-black text-emerald-400">{totalVendas.toFixed(2)} €</p>
                       </div>
                       {/* KPI: Compras */}
                       <div className="bg-black/40 border border-white/5 rounded-2xl p-5 flex flex-col justify-center items-start relative overflow-hidden group">
                          <div className="absolute top-0 right-0 w-16 h-16 bg-rose-500/5 rounded-full blur-2xl group-hover:bg-rose-500/10 transition-colors" />
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Compras (Consumo)</p>
                          <p className="text-2xl font-black text-rose-400">{totalCompras.toFixed(2)} €</p>
                       </div>
                       {/* KPI: Rácio */}
                       <div className="bg-black/40 border border-white/5 rounded-2xl p-5 flex flex-col justify-center items-start relative overflow-hidden group">
                          <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-colors" />
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Rácio Mensal (Food Cost)</p>
                          <div className="flex items-end gap-3">
                             <p className="text-2xl font-black text-blue-400">{totalPct.toFixed(1)}%</p>
                             <div className={`text-xs font-bold mb-1 ${totalPct < 35 ? 'text-emerald-500' : totalPct < 45 ? 'text-amber-500' : 'text-rose-500'}`}>
                                {totalPct < 35 ? '(Excelente)' : totalPct < 45 ? '(Aceitável)' : '(Atenção)'}
                             </div>
                          </div>
                       </div>
                    </div>
                    
                    {sortedKeys.length > 0 ? (
                       <div className="overflow-x-auto no-scrollbar bg-black/30 border border-white/5 rounded-2xl">
                          <table className="w-full text-left border-collapse">
                             <thead>
                                <tr className="border-b border-white/10 bg-white/5">
                                   <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Data</th>
                                   <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Vendas</th>
                                   <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Compras</th>
                                   <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Rácio (%)</th>
                                </tr>
                             </thead>
                             <tbody className="divide-y divide-white/5">
                                {sortedKeys.map(k => {
                                   const m = map.get(k);
                                   const pct = m.vendas > 0 ? (m.compras / m.vendas) * 100 : 0;
                                   return (
                                      <tr key={k} className="hover:bg-white/5 transition-colors">
                                         <td className="p-4">
                                            <div className="flex items-center gap-2">
                                               <Calendar className="text-slate-500" size={14} />
                                               <span className="text-xs font-bold text-white">{new Date(k).toLocaleDateString('pt-PT')}</span>
                                            </div>
                                         </td>
                                         <td className="p-4 text-xs font-bold text-emerald-400 text-right">{m.vendas.toFixed(2)} €</td>
                                         <td className="p-4 text-xs font-bold text-rose-400 text-right">{m.compras.toFixed(2)} €</td>
                                         <td className="p-4 text-right">
                                            <span className={`inline-flex items-center justify-center px-2 py-1 rounded bg-black/50 border border-white/5 text-[10px] font-black ${pct < 35 ? 'text-emerald-400' : pct < 45 ? 'text-amber-400' : 'text-rose-400'}`}>
                                               {pct.toFixed(1)}%
                                            </span>
                                         </td>
                                      </tr>
                                   )
                                })}
                             </tbody>
                          </table>
                       </div>
                    ) : (
                       <div className="flex flex-col items-center justify-center py-16 bg-black/20 border border-white/5 rounded-2xl">
                          <FileText className="text-slate-600 mb-3" size={32} />
                          <p className="text-sm font-bold text-white">Sem Dados</p>
                          <p className="text-xs text-slate-500">Não há registos para o período selecionado.</p>
                       </div>
                    )}
                 </div>
              );
           })()}
        </div>
      )}
"""

content = re.sub(pattern, new_block, content)

with open('src/pages/store/StoreManagement.tsx', 'w') as f:
    f.write(content)
    
print("Reformed successfully")

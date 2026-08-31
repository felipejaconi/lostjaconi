import re

with open('src/pages/store/StoreManagement.tsx', 'r') as f:
    content = f.read()

benavente_ui = """
      {isBenavente && (
        <div className="bg-[#111] border border-blue-500/30 rounded-3xl p-6 shadow-2xl mb-8">
           <div className="flex items-center gap-3 mb-6">
              <Star className="text-blue-500" size={24} />
              <div>
                 <h2 className="text-xl font-black text-white tracking-widest uppercase">Área Exclusiva: Benavente</h2>
                 <p className="text-xs text-slate-400">Análise detalhada de Vendas, Compras Diárias e Margens</p>
              </div>
           </div>
           
           <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left border-collapse">
                 <thead>
                    <tr className="border-b border-white/10">
                       <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Data</th>
                       <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Vendas (Fechos)</th>
                       <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Compras (Consumo)</th>
                       <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Rácio (%)</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-white/5">
                    {(() => {
                       const map = new Map();
                       
                       // Add Fechos (Vendas)
                       fechos.forEach(f => {
                          const data = f.data;
                          if (!data) return;
                          
                          // Check if it matches selected month/year
                          const d = new Date(data);
                          if (d.getMonth() === selectedMonth && d.getFullYear() === selectedYear) {
                              if (!map.has(data)) map.set(data, { vendas: 0, compras: 0 });
                              map.get(data).vendas += Number(f.real_total || 0);
                          }
                       });
                       
                       // Add Pedidos (Compras)
                       filteredCompletedOrders.forEach(o => {
                          const data = new Date(o.created_at).toISOString().split('T')[0];
                          if (!map.has(data)) map.set(data, { vendas: 0, compras: 0 });
                          map.get(data).compras += getPedidoTotalComIva(o) || 0;
                       });
                       
                       const sortedKeys = Array.from(map.keys()).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
                       
                       let totalVendas = 0;
                       let totalCompras = 0;
                       
                       return (
                          <>
                             {sortedKeys.map(k => {
                                const m = map.get(k);
                                totalVendas += m.vendas;
                                totalCompras += m.compras;
                                const pct = m.vendas > 0 ? (m.compras / m.vendas) * 100 : 0;
                                return (
                                   <tr key={k} className="hover:bg-white/5 transition-colors">
                                      <td className="p-3 text-xs font-bold text-white">{new Date(k).toLocaleDateString('pt-PT')}</td>
                                      <td className="p-3 text-xs font-bold text-emerald-400 text-right">{m.vendas.toFixed(2)} €</td>
                                      <td className="p-3 text-xs font-bold text-rose-400 text-right">{m.compras.toFixed(2)} €</td>
                                      <td className="p-3 text-xs font-bold text-blue-400 text-right">{pct.toFixed(1)}%</td>
                                   </tr>
                                )
                             })}
                             <tr className="bg-white/5">
                                <td className="p-3 text-xs font-black text-white uppercase tracking-widest">TOTAIS</td>
                                <td className="p-3 text-xs font-black text-emerald-400 text-right">{totalVendas.toFixed(2)} €</td>
                                <td className="p-3 text-xs font-black text-rose-400 text-right">{totalCompras.toFixed(2)} €</td>
                                <td className="p-3 text-xs font-black text-blue-400 text-right">{totalVendas > 0 ? ((totalCompras / totalVendas) * 100).toFixed(1) : "0.0"}%</td>
                             </tr>
                          </>
                       );
                    })()}
                 </tbody>
              </table>
           </div>
        </div>
      )}
"""

content = content.replace('{/* Header */}', benavente_ui + '\n      {/* Header */}')

with open('src/pages/store/StoreManagement.tsx', 'w') as f:
    f.write(content)


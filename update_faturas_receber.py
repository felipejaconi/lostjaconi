import sys

with open('src/pages/admin/AdminFinancial.tsx', 'r') as f:
    code = f.read()

start_marker = '<div className="flex-1 overflow-x-auto no-scrollbar p-6">'
end_marker = '                     {faturasReceber.length > displayCountReceber && ('

start_idx = code.find(start_marker)
end_idx = code.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print("Markers not found")
    sys.exit(1)

new_code = '''<div className="flex-1 overflow-x-auto no-scrollbar">
                  <table className="w-full text-left min-w-[900px]">
                     <thead>
                        <tr className="bg-zinc-900/50 border-b border-zinc-800">
                           <th className="p-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Documento</th>
                           <th className="p-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Loja</th>
                           <th className="p-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Data</th>
                           <th className="p-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider text-right">Valor Total</th>
                           <th className="p-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider text-center">Estado</th>
                           <th className="p-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider text-right">Ação</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-zinc-800/50">
                        {faturasReceber.length === 0 ? (
                           <tr>
                              <td colSpan={6} className="p-10 text-center">
                                 <Banknote className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                                 <p className="text-zinc-400 font-medium text-sm">Nenhum valor pendente de recebimento.</p>
                              </td>
                           </tr>
                        ) : (
                           faturasReceber.slice(0, displayCountReceber).map((p: any) => (
                              <tr key={p.id} className="hover:bg-zinc-800/30 transition-colors">
                                 <td className="p-4">
                                    <p className="text-sm font-bold text-zinc-100">Pedido #{p.id.split('-')[0].toUpperCase()}</p>
                                 </td>
                                 <td className="p-4">
                                    <p className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                                       <Store className="w-4 h-4 text-amber-500" /> {p.loja_nome || 'Loja Desconhecida'}
                                    </p>
                                 </td>
                                 <td className="p-4">
                                    <p className="text-[11px] text-zinc-400 flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(p.created_at).toLocaleDateString('pt-PT')}</p>
                                 </td>
                                 <td className="p-4 text-right">
                                    <p className="text-sm font-black text-zinc-100">€{Number(p.total).toFixed(2)}</p>
                                 </td>
                                 <td className="p-4 text-center">
                                    <span className={cn("inline-flex px-2 py-1 border text-[10px] font-bold uppercase tracking-wider rounded", p.status?.toLowerCase() === 'concluido' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20')}>
                                       {p.status?.toLowerCase() === 'concluido' ? 'Recebido' : 'A Receber'}
                                    </span>
                                 </td>
                                 <td className="p-4 text-right">
                                    {p.status?.toLowerCase() !== 'concluido' ? (
                                       <button 
                                          onClick={() => handleMarcarRecebido(p)}
                                          className="inline-flex py-1.5 px-3 bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold text-[10px] uppercase tracking-wider rounded-md transition-colors items-center justify-center gap-1.5"
                                       >
                                          <CheckCircle2 className="w-3.5 h-3.5" /> Marcar Recebido
                                       </button>
                                    ) : (
                                       <span className="text-[10px] font-bold text-emerald-500/80 uppercase tracking-wider flex items-center justify-end gap-1">
                                          <CheckCircle2 className="w-3.5 h-3.5" /> Pago
                                       </span>
                                    )}
                                 </td>
                              </tr>
                           ))
                        )}
                     </tbody>
                  </table>
               </div>
'''

final_code = code[:start_idx] + new_code + code[end_idx:]

with open('src/pages/admin/AdminFinancial.tsx', 'w') as f:
    f.write(final_code)

print("Receber updated to table list")

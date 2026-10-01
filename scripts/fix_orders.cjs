const fs = require('fs');
let c = fs.readFileSync('src/pages/admin/AdminOrders.tsx', 'utf8');

c = c.replace(/<table className="w-full text-left border-collapse min-w-\[700px\]">([\s\S]*?)<\/table>/,
`<table className="w-full text-left border-collapse min-w-[600px]">
  <thead className="bg-zinc-900/40 border-b border-zinc-800">
     <tr>
        <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider pl-6">Artigo</th>
        <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider text-center w-40 border-l border-zinc-800/50">Solicitado</th>
        <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider text-center w-64 border-l border-zinc-800/50">Picking Real</th>
     </tr>
  </thead>
  <tbody className="divide-y divide-zinc-800/50">
      {order.pedido_itens?.map((item: any) => {
         const conf = conferidos[item.produto_id] || { quantidade: '', mode: 'unidade', unidade_saida: item.unidade };
         const objProd = products.find(p => p.id === item.produto_id);
         const maxStock = objProd ? Number(objProd.stock_armazem) || 0 : 0;
         const maxFill = Number(item.quantidade);
         
         return (
           <tr key={item.id} className="hover:bg-zinc-800/30 transition-colors">
              <td className="px-5 py-5 pl-6">
                 <p className="text-[14px] font-semibold text-zinc-100 mb-1.5">{item.produto?.nome}</p>
                 <div className="flex flex-wrap items-center gap-2">
                    {maxStock > 0 ? (
                       <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20 shadow-sm">Em Stock: {maxStock} {objProd?.unidade_base}</span>
                    ) : (
                       <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded border border-rose-500/20 shadow-sm">Sem Stock ({maxStock})</span>
                    )}
                    {item.produto?.is_peso_variavel && (
                       <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2.5 py-1 rounded shadow-sm">Balança</span>
                    )}
                 </div>
              </td>
              <td className="px-5 py-5 text-center border-l border-zinc-800/50 bg-zinc-900/10">
                 <div className="inline-flex flex-col items-center">
                    <span className="text-xl font-black text-zinc-100 tabular-nums">{item.quantidade}</span>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1.5 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">{objProd?.unidade_base || 'un'}</span>
                 </div>
              </td>
              <td className="px-5 py-5 text-center border-l border-zinc-800/50 bg-zinc-900/25">
                 <div className="flex items-center justify-center gap-3 max-w-[250px] mx-auto">
                    {objProd?.unidade_base === 'kg' && (
                       <button onClick={() => getWeightFromScale(item.produto_id, Number(item.quantidade))} className="h-12 w-12 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-xl flex items-center justify-center hover:bg-amber-500/20 transition-all shadow-inner shrink-0 group" title="Ler da Balança">
                          <Scale className="w-5 h-5 group-hover:scale-110 transition-transform" />
                       </button>
                    )}
                    <div className="relative flex-1">
                       <input 
                          type="number" min="0" step="0.001"
                          value={conf.quantidade}
                          onChange={e => updateConferido(item.produto_id, 'quantidade', e.target.value)}
                          className="w-full h-12 bg-zinc-950 border border-zinc-700 hover:border-zinc-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 rounded-xl px-4 text-xl font-black text-zinc-100 outline-none transition-all text-center tabular-nums shadow-inner placeholder:text-zinc-700"
                          placeholder="0"
                       />
                    </div>
                    <button onClick={() => updateConferido(item.produto_id, 'quantidade', maxFill)} className="h-12 w-12 bg-zinc-900 text-zinc-400 border border-zinc-800 hover:bg-emerald-500 hover:border-emerald-500 hover:text-emerald-950 rounded-xl transition-all flex items-center justify-center shadow-inner shrink-0 group" title="Atribuir Quantidade Total">
                       <Check className="w-6 h-6 group-hover:scale-110 transition-transform" />
                    </button>
                 </div>
              </td>
           </tr>
         );
      })}
  </tbody>
</table>`
);

fs.writeFileSync('src/pages/admin/AdminOrders.tsx', c);
console.log('done replacing table');

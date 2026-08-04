with open("src/pages/admin/AdminProducts.tsx", "r") as f:
    content = f.read()

target_header = """                      <th className="p-5 text-xs font-black text-slate-500 uppercase tracking-widest">Produto</th>
                      <th className="p-5 text-xs font-black text-slate-500 uppercase tracking-widest">Categoria</th>
                      <th className="p-5 text-xs font-black text-slate-500 uppercase tracking-widest text-center">Stock / IVA</th>
                      <th className="p-5 text-xs font-black text-slate-500 uppercase tracking-widest text-right">Ações</th>"""

replacement_header = """                      <th className="p-5 text-xs font-black text-slate-500 uppercase tracking-widest">Produto</th>
                      <th className="p-5 text-xs font-black text-slate-500 uppercase tracking-widest">Categoria</th>
                      <th className="p-5 text-xs font-black text-slate-500 uppercase tracking-widest">Lote / Local</th>
                      <th className="p-5 text-xs font-black text-slate-500 uppercase tracking-widest text-center">Stock / IVA</th>
                      <th className="p-5 text-xs font-black text-slate-500 uppercase tracking-widest text-right">Ações</th>"""

content = content.replace(target_header, replacement_header)

target_body = """                          <td className="p-4">
                             <span className="text-[10px] uppercase font-black tracking-widest text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 px-3 py-1.5 rounded-lg">
                                {p.categoria_nome || "Sem Categoria"}
                             </span>
                          </td>
                          <td className="p-4 text-center">"""

replacement_body = """                          <td className="p-4">
                             <span className="text-[10px] uppercase font-black tracking-widest text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 px-3 py-1.5 rounded-lg">
                                {p.categoria_nome || "Sem Categoria"}
                             </span>
                          </td>
                          <td className="p-4">
                             {(p.lotes?.[0]?.lote || p.lotes?.[0]?.rua || p.lotes?.[0]?.prateleira) ? (
                               <div className="flex flex-col gap-1">
                                 {p.lotes?.[0]?.lote && <span className="text-xs text-white font-bold">Lote: <span className="text-slate-400">{p.lotes[0].lote}</span></span>}
                                 {(p.lotes?.[0]?.rua || p.lotes?.[0]?.prateleira) && (
                                   <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">
                                     {p.lotes[0].rua && `Rua ${p.lotes[0].rua}`} {p.lotes[0].rua && p.lotes[0].prateleira && "•"} {p.lotes[0].prateleira && `Prat ${p.lotes[0].prateleira}`}
                                   </span>
                                 )}
                               </div>
                             ) : (
                               <span className="text-[10px] text-slate-600 uppercase font-black tracking-widest">Sem Local</span>
                             )}
                          </td>
                          <td className="p-4 text-center">"""

content = content.replace(target_body, replacement_body)

with open("src/pages/admin/AdminProducts.tsx", "w") as f:
    f.write(content)

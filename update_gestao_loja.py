import sys

with open('src/pages/admin/AdminFinancial.tsx', 'r') as f:
    content = f.read()

old_block = """                     <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto max-h-[450px] custom-scrollbar">
                        {stores.map(store => (
                           <div key={store.id} 
                                className="bg-zinc-900 border border-zinc-800/80 rounded-2xl p-6 hover:border-zinc-700 transition-all flex flex-col justify-between items-center text-center group aspect-square sm:aspect-auto sm:min-h-[220px]">
                              <div className="flex flex-col items-center gap-3 w-full">
                                 <div className="w-14 h-14 rounded-2xl bg-zinc-800 flex items-center justify-center shrink-0 mb-2 border border-zinc-700/50">
                                    <Store className="w-7 h-7 text-zinc-500 group-hover:text-amber-500 transition-colors" />
                                 </div>
                                 <div className="w-full flex-1 min-w-0">
                                    <h4 className="font-black text-lg sm:text-xl text-amber-500 uppercase tracking-widest truncate px-2">{store.nome}</h4>
                                    <p className="text-xs text-zinc-500 truncate mt-1">{store.email}</p>
                                 </div>
                              </div>
                              <div className="w-full flex flex-col gap-2 mt-6">
                                 <button 
                                    onClick={() => { setSelectedStore(store); setIsStoreModalOpen(true); }}
                                    className="w-full py-2.5 px-4 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 border border-amber-500/20"
                                 >
                                    <Plus size={14} /> Registrar Novas Despesas
                                 </button>
                                 <button 
                                    onClick={() => { 
                                       setActiveTab("fornecedores");
                                       setFilterDataAReceber({...filterDataAReceber, loja: String(store.id)});
                                    }}
                                    className="w-full py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 border border-zinc-700/50"
                                 >
                                    <Receipt size={14} /> Ver Todas as Faturas
                                 </button>
                              </div>
                           </div>
                        ))}
                        {stores.length === 0 && (
                           <div className="col-span-full text-center p-8">
                              <p className="text-sm text-zinc-500">Nenhuma loja encontrada.</p>
                           </div>
                        )}
                     </div>"""

new_block = """                     <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 overflow-y-auto max-h-[450px] custom-scrollbar">
                        {stores.map(store => (
                           <div key={store.id} 
                                className="bg-zinc-900 border border-zinc-800/80 rounded-2xl p-4 hover:border-zinc-700 transition-all flex flex-col justify-between items-center text-center group min-h-[140px]">
                              <div className="w-full flex-1 min-w-0 flex items-center justify-center py-2">
                                 <h4 className="font-black text-xl text-amber-500 uppercase tracking-widest truncate px-2" title={store.nome}>{store.nome}</h4>
                              </div>
                              <div className="w-full grid grid-cols-2 gap-2 mt-4">
                                 <button 
                                    onClick={() => { setSelectedStore(store); setIsStoreModalOpen(true); }}
                                    className="w-full py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-1 border border-amber-500/20"
                                    title="Nova Despesa"
                                 >
                                    <Plus size={16} />
                                    <span>Nova</span>
                                 </button>
                                 <button 
                                    onClick={() => { 
                                       setActiveTab("fornecedores");
                                       setFilterDataAReceber({...filterDataAReceber, loja: String(store.id)});
                                    }}
                                    className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-1 border border-zinc-700/50"
                                    title="Faturas"
                                 >
                                    <Receipt size={16} />
                                    <span>Faturas</span>
                                 </button>
                              </div>
                           </div>
                        ))}
                        {stores.length === 0 && (
                           <div className="col-span-full text-center p-8">
                              <p className="text-sm text-zinc-500">Nenhuma loja encontrada.</p>
                           </div>
                        )}
                     </div>"""

if old_block in content:
    content = content.replace(old_block, new_block)
    with open('src/pages/admin/AdminFinancial.tsx', 'w') as f:
        f.write(content)
    print("Success")
else:
    print("Not found")


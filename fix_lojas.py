import sys

with open('src/pages/admin/AdminFinancial.tsx', 'r') as f:
    code = f.read()

old_block = """                     <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-y-auto max-h-[350px] custom-scrollbar">
                        {stores.map(store => (
                           <div key={store.id} 
                                onClick={() => { setSelectedStore(store); setIsStoreModalOpen(true); }}
                                className="bg-zinc-900 border border-zinc-800/80 rounded-xl p-4 hover:border-zinc-700 cursor-pointer transition-all flex items-center gap-4 group">
                              <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                                 <Store className="w-5 h-5 text-zinc-400 group-hover:text-amber-500 transition-colors" />
                              </div>
                              <div className="min-w-0 flex-1">
                                 <h4 className="font-semibold text-sm text-zinc-200 group-hover:text-amber-400 transition-colors truncate">{store.nome}</h4>
                                 <p className="text-xs text-zinc-500 truncate">{store.email}</p>
                              </div>
                              <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                           </div>
                        ))}
                        {stores.length === 0 && (
                           <div className="col-span-1 sm:col-span-2 text-center p-8">
                              <p className="text-sm text-zinc-500">Nenhuma loja encontrada.</p>
                           </div>
                        )}
                     </div>"""

new_block = """                     <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto max-h-[450px] custom-scrollbar">
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
                                    className="w-full py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 border border-zinc-700/50"
                                 >
                                    <Receipt size={14} /> Ver todas as faturas
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

if old_block in code:
    code = code.replace(old_block, new_block)
    with open('src/pages/admin/AdminFinancial.tsx', 'w') as f:
        f.write(code)
    print("Success")
else:
    print("Not found exactly")

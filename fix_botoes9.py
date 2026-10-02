import sys

with open('src/pages/admin/AdminFinancial.tsx', 'r') as f:
    code = f.read()

old_block = """                              <div className="w-full flex flex-row flex-wrap sm:flex-nowrap gap-1 mt-auto pt-2">
                                 <button 
                                    onClick={() => { setSelectedStore(store); setIsStoreModalOpen(true); }}
                                    className="flex-1 min-w-[70px] py-1 px-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 rounded text-[9px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1 border border-amber-500/20"
                                    title="Nova Despesa"
                                 >
                                    <Plus size={10} className="shrink-0" />
                                    <span className="truncate">Nova</span>
                                 </button>
                                 <button 
                                    onClick={() => { 
                                       setActiveTab("fornecedores");
                                       setFilterDataAReceber({...filterDataAReceber, loja: String(store.id)});
                                    }}
                                    className="flex-1 min-w-[70px] py-1 px-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded text-[9px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1 border border-zinc-700/50"
                                    title="Faturas"
                                 >
                                    <Receipt size={10} className="shrink-0" />
                                    <span className="truncate">Faturas</span>
                                 </button>
                              </div>"""

new_block = """                              <div className="w-full flex flex-row flex-wrap sm:flex-nowrap gap-1.5 mt-auto pt-2">
                                 <button 
                                    onClick={() => { setSelectedStore(store); setIsStoreModalOpen(true); }}
                                    className="flex-1 min-w-[65px] py-1 px-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1 border border-amber-500/20"
                                    title="Nova Despesa"
                                 >
                                    <Plus size={10} className="shrink-0" />
                                    <span className="truncate">Nova</span>
                                 </button>
                                 <button 
                                    onClick={() => { 
                                       setActiveTab("fornecedores");
                                       setFilterDataAReceber({...filterDataAReceber, loja: String(store.id)});
                                    }}
                                    className="flex-1 min-w-[65px] py-1 px-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-md text-[9px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1 border border-zinc-700/50"
                                    title="Faturas"
                                 >
                                    <Receipt size={10} className="shrink-0" />
                                    <span className="truncate">Faturas</span>
                                 </button>
                              </div>"""

if old_block in code:
    code = code.replace(old_block, new_block)
    with open('src/pages/admin/AdminFinancial.tsx', 'w') as f:
        f.write(code)
    print("Success")
else:
    print("Not found")


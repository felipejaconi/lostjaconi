import sys

with open('src/pages/admin/AdminFinancial.tsx', 'r') as f:
    code = f.read()

old_block = """                              <div className="w-full flex flex-col gap-2 mt-6">
                                 <button 
                                    onClick={() => { setSelectedStore(store); setIsStoreModalOpen(true); }}
                                    className="w-full py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 border border-zinc-700/50"
                                 >
                                    <Receipt size={14} /> Ver todas as faturas
                                 </button>
                              </div>"""

new_block = """                              <div className="w-full flex flex-col gap-2 mt-6">
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
                              </div>"""

if old_block in code:
    code = code.replace(old_block, new_block)
    with open('src/pages/admin/AdminFinancial.tsx', 'w') as f:
        f.write(code)
    print("Success")
else:
    print("Not found exactly")

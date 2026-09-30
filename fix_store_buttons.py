import sys

with open('src/pages/admin/AdminFinancial.tsx', 'r') as f:
    code = f.read()

old_buttons = '''                                 <button 
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
                                 </button>'''

new_buttons = '''                                 <button 
                                    onClick={() => { setSelectedStore(store); setIsStoreModalOpen(true); }}
                                    className="flex-1 min-w-[50px] py-1 px-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1 border border-amber-500/20"
                                    title="Nova Despesa"
                                 >
                                    <Plus size={10} className="shrink-0" />
                                    <span className="truncate">Nova</span>
                                 </button>
                                 <button 
                                    onClick={() => { 
                                       setActiveTab("faturas");
                                       setFilterDataAPagar({...filterDataAPagar, loja: String(store.id)});
                                    }}
                                    className="flex-1 min-w-[50px] py-1 px-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 hover:text-blue-400 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1 border border-blue-500/20"
                                    title="Compras"
                                 >
                                    <ShoppingCart size={10} className="shrink-0" />
                                    <span className="truncate">Compras</span>
                                 </button>
                                 <button 
                                    onClick={() => { 
                                       setActiveTab("despesas");
                                       setFilterDataAPagar({...filterDataAPagar, loja: String(store.id)});
                                    }}
                                    className="flex-1 min-w-[50px] py-1 px-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 hover:text-rose-400 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1 border border-rose-500/20"
                                    title="Despesas"
                                 >
                                    <Receipt size={10} className="shrink-0" />
                                    <span className="truncate">Despesas</span>
                                 </button>'''

code = code.replace(old_buttons, new_buttons)

with open('src/pages/admin/AdminFinancial.tsx', 'w') as f:
    f.write(code)

print("Success")

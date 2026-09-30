import sys

with open('src/pages/admin/AdminFinancial.tsx', 'r') as f:
    code = f.read()

old_compras_btn = '''                                 <button 
                                    onClick={() => { 
                                       setActiveTab("faturas");
                                       setFilterDataAPagar({...filterDataAPagar, loja: String(store.id)});
                                    }}
                                    className="flex-1 min-w-[50px] py-1 px-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 hover:text-blue-400 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1 border border-blue-500/20"
                                    title="Compras"
                                 >
                                    <ShoppingCart size={10} className="shrink-0" />
                                    <span className="truncate">Compras</span>
                                 </button>'''

new_compras_btn = '''                                 <button 
                                    onClick={() => { 
                                       setActiveTab("fornecedores");
                                       setFilterDataAReceber({...filterDataAReceber, loja: String(store.id)});
                                    }}
                                    className="flex-1 min-w-[50px] py-1 px-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 hover:text-blue-400 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1 border border-blue-500/20"
                                    title="Compras"
                                 >
                                    <ShoppingCart size={10} className="shrink-0" />
                                    <span className="truncate">Compras</span>
                                 </button>'''

code = code.replace(old_compras_btn, new_compras_btn)

with open('src/pages/admin/AdminFinancial.tsx', 'w') as f:
    f.write(code)

print("Success")

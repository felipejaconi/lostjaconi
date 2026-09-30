import sys

with open('src/pages/admin/AdminFinancial.tsx', 'r') as f:
    code = f.read()

# 1. Add loja to filterDataAPagar
old_state = """  const [filterDataAPagar, setFilterDataAPagar] = useState({
    periodo: "todos",
    status: "todos",
    fornecedor: "todos"
  });"""
new_state = """  const [filterDataAPagar, setFilterDataAPagar] = useState({
    periodo: "todos",
    status: "todos",
    fornecedor: "todos",
    loja: "todos"
  });"""
code = code.replace(old_state, new_state)

# 2. Add filtering logic for loja
old_filter_logic = """    const fornecedorMatch = filterDataAPagar.fornecedor === "todos" || String(f.fornecedor_id) === filterDataAPagar.fornecedor;
    
    return textMatch && tipoMatch && periodMatch && statusMatch && fornecedorMatch;"""
new_filter_logic = """    const fornecedorMatch = filterDataAPagar.fornecedor === "todos" || String(f.fornecedor_id) === filterDataAPagar.fornecedor;
    
    let lojaMatch = true;
    if (filterDataAPagar.loja !== "todos") {
       try {
          if (f.descrição) {
             const desc = JSON.parse(f.descrição);
             lojaMatch = String(desc.loja_id) === filterDataAPagar.loja;
          } else {
             lojaMatch = false;
          }
       } catch(e) {
          lojaMatch = false;
       }
    }
    
    return textMatch && tipoMatch && periodMatch && statusMatch && fornecedorMatch && lojaMatch;"""
code = code.replace(old_filter_logic, new_filter_logic)

# 3. Add the UI dropdown
old_dropdown = """                     <div className="flex items-center gap-2 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg shrink-0">
                        <select value={filterDataAPagar.fornecedor} onChange={e => setFilterDataAPagar({...filterDataAPagar, fornecedor: e.target.value})} className="bg-transparent text-sm text-zinc-300 outline-none appearance-none max-w-[150px] truncate">
                           <option value="todos">Fornecedores</option>
                           {fornecedores.map(f => (
                              <option key={f.id} value={f.id}>{f.nome}</option>
                           ))}
                        </select>
                     </div>"""
new_dropdown = """                     <div className="flex items-center gap-2 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg shrink-0">
                        <select value={filterDataAPagar.fornecedor} onChange={e => setFilterDataAPagar({...filterDataAPagar, fornecedor: e.target.value})} className="bg-transparent text-sm text-zinc-300 outline-none appearance-none max-w-[150px] truncate">
                           <option value="todos">Fornecedores</option>
                           {fornecedores.map(f => (
                              <option key={f.id} value={f.id}>{f.nome}</option>
                           ))}
                        </select>
                     </div>
                     <div className="flex items-center gap-2 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg shrink-0">
                        <select value={filterDataAPagar.loja} onChange={e => setFilterDataAPagar({...filterDataAPagar, loja: e.target.value})} className="bg-transparent text-sm text-zinc-300 outline-none appearance-none max-w-[150px] truncate">
                           <option value="todos">Todas Lojas</option>
                           {stores.map((s: any) => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                           ))}
                        </select>
                     </div>"""
code = code.replace(old_dropdown, new_dropdown)

with open('src/pages/admin/AdminFinancial.tsx', 'w') as f:
    f.write(code)
print("Success")

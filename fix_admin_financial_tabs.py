import sys

with open('src/pages/admin/AdminFinancial.tsx', 'r') as f:
    code = f.read()

# 1. Update activeTab type
old_activeTab_def = 'const [activeTab, setActiveTab] = useState<"dashboard" | "faturas" | "fornecedores">("dashboard");'
new_activeTab_def = 'const [activeTab, setActiveTab] = useState<"dashboard" | "faturas" | "fornecedores" | "despesas">("dashboard");'
code = code.replace(old_activeTab_def, new_activeTab_def)

# 2. Update Tabs JSX
old_tabs_jsx = """         <button 
            onClick={() => setActiveTab("fornecedores")}
            className={cn("px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap", activeTab === "fornecedores" ? "border-blue-500 text-blue-500" : "border-transparent text-zinc-400 hover:text-zinc-300 hover:border-zinc-700")}
         >
            Faturas a Receber
         </button>
      </div>"""
new_tabs_jsx = """         <button 
            onClick={() => setActiveTab("fornecedores")}
            className={cn("px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap", activeTab === "fornecedores" ? "border-blue-500 text-blue-500" : "border-transparent text-zinc-400 hover:text-zinc-300 hover:border-zinc-700")}
         >
            Faturas a Receber
         </button>
         <button 
            onClick={() => setActiveTab("despesas")}
            className={cn("px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap", activeTab === "despesas" ? "border-blue-500 text-blue-500" : "border-transparent text-zinc-400 hover:text-zinc-300 hover:border-zinc-700")}
         >
            Faturas Despesas
         </button>
      </div>"""
code = code.replace(old_tabs_jsx, new_tabs_jsx)

# 3. Update filtering logic
old_filter_logic = """    const tipoMatch = filterTipo === 'todos' || f.tipo === filterTipo || (filterTipo === 'despesa' && f.tipo?.startsWith('despesa'));"""
new_filter_logic = """    let tipoMatch = true;
    if (activeTab === 'faturas') {
       tipoMatch = f.tipo === 'compra';
    } else if (activeTab === 'despesas') {
       tipoMatch = f.tipo?.startsWith('despesa');
    } else {
       tipoMatch = filterTipo === 'todos' || f.tipo === filterTipo || (filterTipo === 'despesa' && f.tipo?.startsWith('despesa'));
    }"""
code = code.replace(old_filter_logic, new_filter_logic)

# 4. Update tab render
old_tab_render = '{activeTab === "faturas" && ('
new_tab_render = '{(activeTab === "faturas" || activeTab === "despesas") && ('
code = code.replace(old_tab_render, new_tab_render)

# 5. Hide filterTipo dropdown
old_dropdown = """                     <div className="flex items-center gap-2 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg shrink-0">
                        <Filter className="w-4 h-4 text-zinc-500" />
                        <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)} className="bg-transparent text-sm text-zinc-300 outline-none appearance-none">
                           <option value="todos">Todos os Tipos</option>
                           <option value="compra">Compras</option>
                           <option value="despesa">Despesas</option>
                        </select>
                     </div>"""
new_dropdown = """                     {/* Tipo dropdown removed as it is now separated by tabs */}"""
code = code.replace(old_dropdown, new_dropdown)

with open('src/pages/admin/AdminFinancial.tsx', 'w') as f:
    f.write(code)

print("Success")

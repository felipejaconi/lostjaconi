import re

with open('src/pages/admin/AdminFinancial.tsx', 'r') as f:
    content = f.read()

old_html = """                  <div className="relative w-full sm:w-80">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                     <input
                       type="text"
                       placeholder="Pesquisar fatura ou fornecedor..."
                       value={search}
                       onChange={(e) => setSearch(e.target.value)}
                       className="w-full pl-9 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 focus:border-zinc-600 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition-colors"
                     />
                  </div>"""

new_html = """                  <div className="relative w-full sm:w-80 flex gap-2">
                     <div className="relative w-full">
                       <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                       <input
                         type="text"
                         placeholder="Pesquisar fatura ou fornecedor..."
                         value={search}
                         onChange={(e) => setSearch(e.target.value)}
                         className="w-full pl-9 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 focus:border-zinc-600 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition-colors"
                       />
                     </div>
                     <button
                        onClick={() => setIsModalOpen(true)}
                        className="px-4 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg shrink-0 flex items-center justify-center transition-colors"
                        title="Registar Nova Despesa"
                     >
                        <Plus className="w-4 h-4 mr-1" /> Despesa
                     </button>
                  </div>"""

content = content.replace(old_html, new_html)

with open('src/pages/admin/AdminFinancial.tsx', 'w') as f:
    f.write(content)


import sys

with open('src/pages/admin/AdminFinancial.tsx', 'r') as f:
    code = f.read()

old_code = """      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 shrink-0">
        <div className="flex items-center gap-4">
           <BrandTitle title="Financeiro" titleClassName="max-md:mt-0 md:-mt-4 max-md:pl-0 max-md:pt-0 max-md:ml-0" hideUnderline />
        </div>
        <div className="flex items-center gap-3">
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-zinc-800 pb-px shrink-0 overflow-x-auto no-scrollbar">
         <button 
            onClick={() => setActiveTab("dashboard")}
            className={cn("px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap", activeTab === "dashboard" ? "border-blue-500 text-blue-500" : "border-transparent text-zinc-400 hover:text-zinc-300 hover:border-zinc-700")}
         >
            Dashboard
         </button>
         <button 
            onClick={() => setActiveTab("faturas")}
            className={cn("px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap", activeTab === "faturas" ? "border-blue-500 text-blue-500" : "border-transparent text-zinc-400 hover:text-zinc-300 hover:border-zinc-700")}
         >
            Faturas a Pagar
         </button>
         <button 
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

new_code = """      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
           <BrandTitle title="Financeiro" titleClassName="max-md:mt-0 md:-mt-4 max-md:pl-0 max-md:pt-0 max-md:ml-0" hideUnderline />
           
           <div className="flex bg-zinc-900/50 p-1 rounded-lg border border-zinc-800/80 w-full sm:w-auto mt-2 sm:mt-0 overflow-x-auto no-scrollbar">
              <button 
                 onClick={() => setActiveTab("dashboard")}
                 className={`flex-1 sm:flex-none px-4 py-1.5 text-[10px] flex items-center justify-center font-black uppercase tracking-wider rounded-md transition-all whitespace-nowrap ${
                    activeTab === 'dashboard' ? 'bg-blue-500 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                 }`}
              >
                 Dashboard
              </button>
              <button 
                 onClick={() => setActiveTab("faturas")}
                 className={`flex-1 sm:flex-none px-4 py-1.5 text-[10px] flex items-center justify-center font-black uppercase tracking-wider rounded-md transition-all whitespace-nowrap ${
                    activeTab === 'faturas' ? 'bg-blue-500 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                 }`}
              >
                 Faturas a Pagar
              </button>
              <button 
                 onClick={() => setActiveTab("fornecedores")}
                 className={`flex-1 sm:flex-none px-4 py-1.5 text-[10px] flex items-center justify-center font-black uppercase tracking-wider rounded-md transition-all whitespace-nowrap ${
                    activeTab === 'fornecedores' ? 'bg-blue-500 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                 }`}
              >
                 Faturas a Receber
              </button>
              <button 
                 onClick={() => setActiveTab("despesas")}
                 className={`flex-1 sm:flex-none px-4 py-1.5 text-[10px] flex items-center justify-center font-black uppercase tracking-wider rounded-md transition-all whitespace-nowrap ${
                    activeTab === 'despesas' ? 'bg-blue-500 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                 }`}
              >
                 Faturas Despesas
              </button>
           </div>
        </div>
        <div className="flex items-center gap-3">
        </div>
      </div>"""

if old_code in code:
    code = code.replace(old_code, new_code)
    with open('src/pages/admin/AdminFinancial.tsx', 'w') as f:
        f.write(code)
    print("Success")
else:
    print("Old code not found")

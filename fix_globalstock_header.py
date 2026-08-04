import sys

with open('src/pages/admin/AdminGlobalStock.tsx', 'r') as f:
    content = f.read()

target = '''      {/* Header Melhorado */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 shrink-0">
        <div className="w-full md:w-auto flex flex-col items-center md:items-start">
           <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-blue-500/10 text-blue-500 flex items-center justify-center rounded-xl border border-blue-500/20 shadow-inner">
               <Layers className="w-5 h-5" />
             </div>
             <div className="flex items-center flex-wrap pt-2 md:pt-6">
                <BrandTitle title="Estoque Armazém" titleClassName="max-md:mt-0 md:-mt-4 max-md:pl-0 max-md:pt-0 max-md:ml-0" hideUnderline />
             </div>
           </div>
        </div>
        
        {/* Navegação Secundária "Mac-like Segmented Control" */}
        <div className="flex bg-zinc-900 border border-zinc-800 rounded-xl p-1 shadow-inner overflow-x-auto custom-scrollbar">
           <button 
              onClick={() => setActiveTab("dashboard")}
              className={cn("px-5 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all whitespace-nowrap", activeTab === "dashboard" ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300")}
           >
              Visão Geral
           </button>
           <button 
              onClick={() => setActiveTab("movimentos")}
              className={cn("px-5 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all whitespace-nowrap", activeTab === "movimentos" ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300")}
           >
              Movimentos
           </button>
           <button 
              onClick={() => setActiveTab("contagem")}
              className={cn("px-5 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all whitespace-nowrap", activeTab === "contagem" ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300")}
           >
              Faltas
           </button>
           <button 
              onClick={() => setActiveTab("quebras")}
              className={cn("px-5 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all whitespace-nowrap", activeTab === "quebras" ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300")}
           >
              Quebras
           </button>
        </div>
      </div>'''

replacement = '''      {/* Header Melhorado */}
      <div className="sticky top-0 z-40 bg-zinc-950 pt-2 md:pt-4 pb-4 -mt-2 md:-mt-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <BrandTitle title="Estoque Armazém" titleClassName="max-md:mt-0 md:-mt-4 max-md:pl-0 max-md:pt-0 max-md:ml-0" hideUnderline />
        
        <div className="flex bg-zinc-900/50 p-1 rounded-lg border border-zinc-800/80 w-full sm:w-auto overflow-x-auto no-scrollbar">
           <button 
              onClick={() => setActiveTab("dashboard")}
              className={`flex-1 sm:flex-none px-4 py-1.5 text-[10px] flex items-center justify-center font-black uppercase tracking-wider rounded-md transition-all whitespace-nowrap ${
                 activeTab === 'dashboard' ? 'bg-blue-500 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
              }`}
           >
              Visão Geral
           </button>
           <button 
              onClick={() => setActiveTab("movimentos")}
              className={`flex-1 sm:flex-none px-4 py-1.5 text-[10px] flex items-center justify-center font-black uppercase tracking-wider rounded-md transition-all whitespace-nowrap ${
                 activeTab === 'movimentos' ? 'bg-blue-500 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
              }`}
           >
              Movimentos
           </button>
           <button 
              onClick={() => setActiveTab("contagem")}
              className={`flex-1 sm:flex-none px-4 py-1.5 text-[10px] flex items-center justify-center font-black uppercase tracking-wider rounded-md transition-all whitespace-nowrap ${
                 activeTab === 'contagem' ? 'bg-blue-500 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
              }`}
           >
              Faltas
           </button>
           <button 
              onClick={() => setActiveTab("quebras")}
              className={`flex-1 sm:flex-none px-4 py-1.5 text-[10px] flex items-center justify-center font-black uppercase tracking-wider rounded-md transition-all whitespace-nowrap ${
                 activeTab === 'quebras' ? 'bg-blue-500 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
              }`}
           >
              Quebras
           </button>
        </div>
      </div>'''

if target in content:
    content = content.replace(target, replacement)
    with open('src/pages/admin/AdminGlobalStock.tsx', 'w') as f:
        f.write(content)
    print("Replaced header successfully")
else:
    print("Target not found")

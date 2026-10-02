import sys

with open('src/pages/admin/AdminReports.tsx', 'r') as f:
    code = f.read()

old_jsx = '''      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
        <motion.div initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} className="bg-zinc-950 p-4 xl:p-5 rounded-2xl border border-zinc-800 shadow-sm relative overflow-hidden flex flex-col justify-center">
           <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500 border border-amber-500/20">
                <TrendingUp size={16} />
              </div>
           </div>
           <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">A Receber (Valor Total Vencido)</p>
           <p className="text-xl font-black text-zinc-100">€{totalReceberVencido.toLocaleString('pt-PT', {minimumFractionDigits: 2})}</p>
        </motion.div>
        
        <motion.div initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} transition={{delay: 0.1}} className="bg-zinc-950 p-4 xl:p-5 rounded-2xl border border-zinc-800 shadow-sm relative overflow-hidden flex flex-col justify-center">
           <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                <Wallet size={16} />
              </div>
           </div>
           <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Recebido (Valor Total Recebido)</p>
           <p className="text-xl font-black text-zinc-100">€{totalRecebido.toLocaleString('pt-PT', {minimumFractionDigits: 2})}</p>
        </motion.div>

        <motion.div initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} transition={{delay: 0.2}} className="bg-zinc-950 p-4 xl:p-5 rounded-2xl border border-zinc-800 shadow-sm relative overflow-hidden flex flex-col justify-center">
           <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 bg-orange-500/10 rounded-xl flex items-center justify-center text-orange-500 border border-orange-500/20">
                <AlertTriangle size={16} />
              </div>
           </div>
           <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Valor Total a Pagar</p>
           <p className="text-xl font-black text-zinc-100">€{totalPagarGeral.toLocaleString('pt-PT', {minimumFractionDigits: 2})}</p>
        </motion.div>

        <motion.div initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} transition={{delay: 0.3}} className="bg-zinc-950 p-4 xl:p-5 rounded-2xl border border-zinc-800 shadow-sm relative overflow-hidden flex flex-col justify-center">
           <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 bg-rose-500/10 rounded-xl flex items-center justify-center text-rose-500 border border-rose-500/20">
                <TrendingDown size={16} />
              </div>
           </div>
           <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">A Pagar (Valor Total Vencido)</p>
           <p className="text-xl font-black text-zinc-100">€{totalPagarVencido.toLocaleString('pt-PT', {minimumFractionDigits: 2})}</p>
        </motion.div>

        <motion.div initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} transition={{delay: 0.4}} className="bg-zinc-950 p-4 xl:p-5 rounded-2xl border border-zinc-800 shadow-sm relative overflow-hidden flex flex-col justify-center">
           <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500 border border-blue-500/20">
                <Layers size={16} />
              </div>
           </div>
           <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Balanço Estimado Vencido</p>
           <p className={cn("text-xl font-black", saldo >= 0 ? "text-emerald-400" : "text-rose-400")}>
               {saldo >= 0 ? "+" : "-"}€{Math.abs(saldo).toLocaleString('pt-PT', {minimumFractionDigits: 2})}
           </p>
        </motion.div>
      </div>'''

new_jsx = '''      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-3 mb-6">
        <motion.div initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} className="bg-zinc-950 p-3 xl:p-4 rounded-xl border border-zinc-800 shadow-sm relative overflow-hidden flex flex-col justify-center">
           <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-2 truncate">A Receber (Valor Total Vencido)</p>
           <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-amber-500/10 rounded-lg flex items-center justify-center text-amber-500 border border-amber-500/20 shrink-0">
                <TrendingUp size={14} />
              </div>
              <p className="text-lg font-black text-zinc-100 truncate">€{totalReceberVencido.toLocaleString('pt-PT', {minimumFractionDigits: 2})}</p>
           </div>
        </motion.div>
        
        <motion.div initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} transition={{delay: 0.1}} className="bg-zinc-950 p-3 xl:p-4 rounded-xl border border-zinc-800 shadow-sm relative overflow-hidden flex flex-col justify-center">
           <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-2 truncate">Recebido (Valor Total Recebido)</p>
           <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-500 border border-emerald-500/20 shrink-0">
                <Wallet size={14} />
              </div>
              <p className="text-lg font-black text-zinc-100 truncate">€{totalRecebido.toLocaleString('pt-PT', {minimumFractionDigits: 2})}</p>
           </div>
        </motion.div>

        <motion.div initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} transition={{delay: 0.2}} className="bg-zinc-950 p-3 xl:p-4 rounded-xl border border-zinc-800 shadow-sm relative overflow-hidden flex flex-col justify-center">
           <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-2 truncate">Valor Total a Pagar</p>
           <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-orange-500/10 rounded-lg flex items-center justify-center text-orange-500 border border-orange-500/20 shrink-0">
                <AlertTriangle size={14} />
              </div>
              <p className="text-lg font-black text-zinc-100 truncate">€{totalPagarGeral.toLocaleString('pt-PT', {minimumFractionDigits: 2})}</p>
           </div>
        </motion.div>

        <motion.div initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} transition={{delay: 0.3}} className="bg-zinc-950 p-3 xl:p-4 rounded-xl border border-zinc-800 shadow-sm relative overflow-hidden flex flex-col justify-center">
           <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-2 truncate">A Pagar (Valor Total Vencido)</p>
           <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-rose-500/10 rounded-lg flex items-center justify-center text-rose-500 border border-rose-500/20 shrink-0">
                <TrendingDown size={14} />
              </div>
              <p className="text-lg font-black text-zinc-100 truncate">€{totalPagarVencido.toLocaleString('pt-PT', {minimumFractionDigits: 2})}</p>
           </div>
        </motion.div>

        <motion.div initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} transition={{delay: 0.4}} className="bg-zinc-950 p-3 xl:p-4 rounded-xl border border-zinc-800 shadow-sm relative overflow-hidden flex flex-col justify-center">
           <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-2 truncate">Balanço Estimado Vencido</p>
           <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-500 border border-blue-500/20 shrink-0">
                <Layers size={14} />
              </div>
              <p className={cn("text-lg font-black truncate", saldo >= 0 ? "text-emerald-400" : "text-rose-400")}>
                  {saldo >= 0 ? "+" : "-"}€{Math.abs(saldo).toLocaleString('pt-PT', {minimumFractionDigits: 2})}
              </p>
           </div>
        </motion.div>
      </div>'''

code = code.replace(old_jsx, new_jsx)

with open('src/pages/admin/AdminReports.tsx', 'w') as f:
    f.write(code)

print("Success")

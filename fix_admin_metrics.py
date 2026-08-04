import sys

with open('src/pages/admin/AdminReports.tsx', 'r') as f:
    code = f.read()

# Replace metrics state variables
code = code.replace(
    '''  // Metrics
  const [totalPagar, setTotalPagar] = useState(0);
  const [totalReceber, setTotalReceber] = useState(0);
  const [saldo, setSaldo] = useState(0);''',
    '''  // Metrics
  const [totalPagarVencido, setTotalPagarVencido] = useState(0);
  const [totalPagarGeral, setTotalPagarGeral] = useState(0);
  const [totalReceberVencido, setTotalReceberVencido] = useState(0);
  const [totalRecebido, setTotalRecebido] = useState(0);
  const [saldo, setSaldo] = useState(0);'''
)

# Replace fetch logic
old_fetch = '''        let calcPagar = 0;
        const today = new Date();
        today.setHours(0,0,0,0);
        
        if (Array.isArray(faturasRes.data)) {
           faturasRes.data.forEach((f: any) => {
               if (["pendente", "parcial"].includes(f.status_pagamento || "pendente")) {
                   let isOverdue = false;
                   if (f.data_vencimento) {
                       const venc = new Date(f.data_vencimento);
                       venc.setHours(0,0,0,0);
                       isOverdue = venc < today;
                   } else if (f.data_emissao) {
                       const emiss = new Date(f.data_emissao);
                       emiss.setHours(0,0,0,0);
                       isOverdue = emiss < today;
                   }
                   if (isOverdue) {
                       calcPagar += Number(f.valor_pendente !== undefined ? f.valor_pendente : (f.valor_total || 0));
                   }
               }
           });
        }
        setTotalPagar(calcPagar);

        let calcReceber = 0;
        if (Array.isArray(pedidosRes.data)) {
           pedidosRes.data.forEach((p: any) => {
               if (['pronto', 'entregue'].includes(p.status?.toLowerCase())) {
                   calcReceber += Number(p.total || 0);
               }
           });
        }
        setTotalReceber(calcReceber);
        setSaldo(calcReceber - calcPagar);'''

new_fetch = '''        let calcPagarVencido = 0;
        let calcPagarGeral = 0;
        const today = new Date();
        today.setHours(0,0,0,0);
        
        if (Array.isArray(faturasRes.data)) {
           faturasRes.data.forEach((f: any) => {
               if (["pendente", "parcial"].includes(f.status_pagamento || "pendente")) {
                   const pendente = Number(f.valor_pendente !== undefined ? f.valor_pendente : (f.valor_total || 0));
                   calcPagarGeral += pendente;
                   
                   let isOverdue = false;
                   if (f.data_vencimento) {
                       const venc = new Date(f.data_vencimento);
                       venc.setHours(0,0,0,0);
                       isOverdue = venc < today;
                   } else if (f.data_emissao) {
                       const emiss = new Date(f.data_emissao);
                       emiss.setHours(0,0,0,0);
                       isOverdue = emiss < today;
                   }
                   if (isOverdue) {
                       calcPagarVencido += pendente;
                   }
               }
           });
        }
        setTotalPagarVencido(calcPagarVencido);
        setTotalPagarGeral(calcPagarGeral);

        let calcReceberVencido = 0;
        let calcRecebido = 0;
        if (Array.isArray(pedidosRes.data)) {
           pedidosRes.data.forEach((p: any) => {
               const valorTotal = Number(p.total || 0);
               const status = p.status?.toLowerCase();
               if (['pronto', 'entregue'].includes(status)) {
                   let isOverdue = false;
                   const dt = new Date(p.created_at);
                   dt.setHours(0,0,0,0);
                   isOverdue = dt < today;
                   if (isOverdue) {
                       calcReceberVencido += valorTotal;
                   }
               } else if (status === 'concluido') {
                   calcRecebido += valorTotal;
               }
           });
        }
        setTotalReceberVencido(calcReceberVencido);
        setTotalRecebido(calcRecebido);
        setSaldo(calcReceberVencido - calcPagarVencido);'''

code = code.replace(old_fetch, new_fetch)

# Replace JSX
old_jsx = '''      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <motion.div initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} className="bg-zinc-950 p-6 rounded-2xl border border-zinc-800 shadow-sm relative overflow-hidden flex flex-col justify-center">
           <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500 border border-amber-500/20">
                <TrendingUp size={20} />
              </div>
           </div>
           <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-1">A Receber (Valor Total Vencido)</p>
           <p className="text-2xl font-black text-zinc-100">€{totalReceber.toLocaleString('pt-PT', {minimumFractionDigits: 2})}</p>
        </motion.div>
        
        <motion.div initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} transition={{delay: 0.1}} className="bg-zinc-950 p-6 rounded-2xl border border-zinc-800 shadow-sm relative overflow-hidden flex flex-col justify-center">
           <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-rose-500/10 rounded-xl flex items-center justify-center text-rose-500 border border-rose-500/20">
                <TrendingDown size={20} />
              </div>
           </div>
           <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-1">A Pagar (Valor Total Vencido)</p>
           <p className="text-2xl font-black text-zinc-100">€{totalPagar.toLocaleString('pt-PT', {minimumFractionDigits: 2})}</p>
        </motion.div>

        <motion.div initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} transition={{delay: 0.2}} className="bg-zinc-950 p-6 rounded-2xl border border-zinc-800 shadow-sm relative overflow-hidden flex flex-col justify-center">
           <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500 border border-blue-500/20">
                <Layers size={20} />
              </div>
           </div>
           <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Balanço Estimado Vencido</p>
           <p className={cn("text-2xl font-black", saldo >= 0 ? "text-emerald-400" : "text-rose-400")}>
               {saldo >= 0 ? "+" : "-"}€{Math.abs(saldo).toLocaleString('pt-PT', {minimumFractionDigits: 2})}
           </p>
        </motion.div>
      </div>'''

new_jsx = '''      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
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

code = code.replace(old_jsx, new_jsx)

with open('src/pages/admin/AdminReports.tsx', 'w') as f:
    f.write(code)

print("Success")

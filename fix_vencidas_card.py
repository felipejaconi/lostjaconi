import sys

with open('src/pages/admin/AdminFinancial.tsx', 'r') as f:
    code = f.read()

# 1. Update stats calculation
old_stats = """     let totalPendente = new Decimal(0);
     let totalIvaCredito = new Decimal(0);"""
new_stats = """     let totalPendente = new Decimal(0);
     let totalVencido = new Decimal(0);
     let totalIvaCredito = new Decimal(0);"""
code = code.replace(old_stats, new_stats)

old_pendente = """        if (pend.greaterThan(0) && f.data_vencimento) {
           const vDate = new Date(f.data_vencimento);
           if (vDate <= nextWeek) {
              expiringBills.push(f);
           }
        }"""
new_pendente = """        if (pend.greaterThan(0)) {
           let isOverdue = false;
           const t = new Date();
           t.setHours(0, 0, 0, 0);
           if (f.data_vencimento) {
              const vDate = new Date(f.data_vencimento);
              vDate.setHours(0, 0, 0, 0);
              if (vDate < t) isOverdue = true;
           } else if (f.data_emissao) {
              const eDate = new Date(f.data_emissao);
              eDate.setHours(0, 0, 0, 0);
              if (eDate < t) isOverdue = true;
           }
           if (isOverdue) {
              totalVencido = totalVencido.add(pend);
           }
           
           if (f.data_vencimento) {
              const vDate = new Date(f.data_vencimento);
              if (vDate <= nextWeek) {
                 expiringBills.push(f);
              }
           }
        }"""
code = code.replace(old_pendente, new_pendente)

old_return = """        totalPendente: totalPendente.toNumber(),
        totalIvaCredito: totalIvaCredito.toNumber(),
        totalReceber: totalReceber.toNumber(),"""
new_return = """        totalPendente: totalPendente.toNumber(),
        totalVencido: totalVencido.toNumber(),
        totalIvaCredito: totalIvaCredito.toNumber(),
        totalReceber: totalReceber.toNumber(),"""
code = code.replace(old_return, new_return)

# 2. Update Grid Layout
old_grid = 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-5'
new_grid = 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6'
code = code.replace(old_grid, new_grid)

# 3. Add the Card
old_card2 = """                  {/* 2. Contas a Pagar */}
                  <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 shadow-sm">
                     <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20">
                           <Clock className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded">Pendente</span>
                     </div>
                     <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-1">Contas a Pagar</p>
                     <p className="text-2xl font-bold text-amber-500">€ {stats.totalPendente.toLocaleString('pt-PT', {minimumFractionDigits:2})}</p>
                  </div>"""

new_card2_and_3 = """                  {/* 2. Contas a Pagar */}
                  <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 shadow-sm">
                     <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20">
                           <Clock className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded">Pendente</span>
                     </div>
                     <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-1">Contas a Pagar</p>
                     <p className="text-2xl font-bold text-amber-500">€ {stats.totalPendente.toLocaleString('pt-PT', {minimumFractionDigits:2})}</p>
                  </div>
                  
                  {/* 2.5 Contas Vencidas */}
                  <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
                     <div className="flex items-center justify-between mb-4 relative z-10">
                        <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500 border border-rose-500/20">
                           <AlertCircle className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded">Atrasado</span>
                     </div>
                     <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-1 relative z-10">Contas Vencidas</p>
                     <p className="text-2xl font-bold text-rose-500 relative z-10">€ {stats.totalVencido.toLocaleString('pt-PT', {minimumFractionDigits:2})}</p>
                     <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-rose-500/5 blur-2xl rounded-full group-hover:bg-rose-500/10 transition-colors"></div>
                  </div>"""
code = code.replace(old_card2, new_card2_and_3)

# ensure AlertCircle is imported
if 'AlertCircle' not in code:
    code = code.replace('import { Wallet, Search', 'import { Wallet, Search, AlertCircle')

with open('src/pages/admin/AdminFinancial.tsx', 'w') as f:
    f.write(code)

print("Success")

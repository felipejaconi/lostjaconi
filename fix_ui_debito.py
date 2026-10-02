with open("src/pages/admin/AdminFinancial.tsx", "r") as f:
    content = f.read()

target = """                  {/* 3. Credito IVA */}
                  <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
                     <div className="flex items-center justify-between mb-4 relative z-10">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                           <Receipt className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">Recuperável</span>
                     </div>
                     <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-1 relative z-10">Crédito IVA (Compras)</p>
                     <p className="text-2xl font-bold text-emerald-400 relative z-10">€ {stats.totalIvaCredito.toLocaleString('pt-PT', {minimumFractionDigits:2})}</p>
                     <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-emerald-500/5 blur-2xl rounded-full group-hover:bg-emerald-500/10 transition-colors"></div>
                  </div>"""

replacement = """                  {/* 3. Credito IVA */}
                  <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
                     <div className="flex items-center justify-between mb-4 relative z-10">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                           <Receipt className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">Recuperável</span>
                     </div>
                     <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-1 relative z-10">Crédito IVA (Compras)</p>
                     <p className="text-2xl font-bold text-emerald-400 relative z-10">€ {stats.totalIvaCredito.toLocaleString('pt-PT', {minimumFractionDigits:2})}</p>
                     <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-emerald-500/5 blur-2xl rounded-full group-hover:bg-emerald-500/10 transition-colors"></div>
                  </div>

                  {/* 3.5. Debito IVA */}
                  <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
                     <div className="flex items-center justify-between mb-4 relative z-10">
                        <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500 border border-rose-500/20">
                           <Receipt className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded">A Pagar (Vendas)</span>
                     </div>
                     <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-1 relative z-10">Débito de IVA</p>
                     <p className="text-2xl font-bold text-rose-400 relative z-10">€ {stats.totalIvaDebito.toLocaleString('pt-PT', {minimumFractionDigits:2})}</p>
                     <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-rose-500/5 blur-2xl rounded-full group-hover:bg-rose-500/10 transition-colors"></div>
                  </div>"""

content = content.replace(target, replacement)
with open("src/pages/admin/AdminFinancial.tsx", "w") as f:
    f.write(content)

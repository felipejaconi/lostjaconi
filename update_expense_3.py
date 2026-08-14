import re

with open('src/pages/admin/AdminExpenseEntries.tsx', 'r') as f:
    content = f.read()

old_html = """            <div>
              <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Data Vencimento</label>
              <input
                type="date"
                value={dataVencimento}
                onChange={(e) => setDataVencimento(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:border-rose-500/50 outline-none transition-all"
              />
            </div>"""

new_html = """            <div>
              <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Data Vencimento</label>
              <input
                type="date"
                value={dataVencimento}
                onChange={(e) => setDataVencimento(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:border-rose-500/50 outline-none transition-all"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Nº de Parcelas</label>
              <input
                type="number"
                min="1"
                step="1"
                value={parcelas}
                onChange={(e) => setParcelas(parseInt(e.target.value) || 1)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:border-rose-500/50 outline-none transition-all"
              />
            </div>"""

content = content.replace(old_html, new_html)

with open('src/pages/admin/AdminExpenseEntries.tsx', 'w') as f:
    f.write(content)


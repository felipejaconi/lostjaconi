import re

with open('src/pages/admin/AdminFinancial.tsx', 'r') as f:
    content = f.read()

old_html = """               <div className="grid grid-cols-2 gap-4">
                  <div>
                     <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wide mb-2">Data Emissão</label>
                     <input required type="date" value={formData.data_emissao} onChange={e => setFormData({...formData, data_emissao: e.target.value})} className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 focus:border-blue-500 focus:bg-zinc-950 rounded-xl text-zinc-100 outline-none text-sm transition-colors" />
                  </div>
                  <div>
                     <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wide mb-2">Vencimento (Opç)</label>
                     <input type="date" value={formData.data_vencimento} onChange={e => setFormData({...formData, data_vencimento: e.target.value})} className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 focus:border-blue-500 focus:bg-zinc-950 rounded-xl text-zinc-100 outline-none text-sm transition-colors" />
                  </div>
               </div>"""

new_html = """               <div className="grid grid-cols-2 gap-4">
                  <div>
                     <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wide mb-2">Data Emissão</label>
                     <input required type="date" value={formData.data_emissao} onChange={e => setFormData({...formData, data_emissao: e.target.value})} className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 focus:border-blue-500 focus:bg-zinc-950 rounded-xl text-zinc-100 outline-none text-sm transition-colors" />
                  </div>
                  <div>
                     <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wide mb-2">Vencimento (Opç)</label>
                     <input type="date" value={formData.data_vencimento} onChange={e => setFormData({...formData, data_vencimento: e.target.value})} className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 focus:border-blue-500 focus:bg-zinc-950 rounded-xl text-zinc-100 outline-none text-sm transition-colors" />
                  </div>
               </div>
               <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wide mb-2">Nº de Parcelas (Meses)</label>
                  <input required type="number" min="1" step="1" value={formData.parcelas} onChange={e => setFormData({...formData, parcelas: parseInt(e.target.value) || 1})} className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 focus:border-blue-500 focus:bg-zinc-950 rounded-xl text-zinc-100 outline-none text-sm transition-colors" />
                  <p className="text-[10px] text-zinc-500 mt-2">
                     Se inserir 2 ou mais, o sistema lançará a despesa para os meses seguintes automaticamente (Ex: P1/2, P2/2).
                  </p>
               </div>"""

content = content.replace(old_html, new_html)

with open('src/pages/admin/AdminFinancial.tsx', 'w') as f:
    f.write(content)


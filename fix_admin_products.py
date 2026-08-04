with open("src/pages/admin/AdminProducts.tsx", "r") as f:
    content = f.read()

content = content.replace(
    'lote: "",',
    'lote: "",\n    rua: "",\n    prateleira: "",'
)

# Replace in the reset area (around line 232)
content = content.replace(
    'lote: "",\n        unidade_base',
    'lote: "",\n        rua: "",\n        prateleira: "",\n        unidade_base'
)

# Also in handleEdit
content = content.replace(
    'lote: p.lote?.toString() || "",',
    'lote: p.lotes?.[0]?.lote?.toString() || p.lote?.toString() || "",\n        rua: p.lotes?.[0]?.rua?.toString() || "",\n        prateleira: p.lotes?.[0]?.prateleira?.toString() || "",'
)

# And in the inputs
inputs_str = """                       <div>
                         <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                           Lote
                         </label>
                         <input type="text" value={formData.lote || ""} onChange={(e) => setFormData({ ...formData, lote: e.target.value })} className="w-full px-4 py-2 bg-[#0a0a0a] border border-white/10 rounded-xl outline-none focus:border-blue-500/50 text-white font-bold text-sm" placeholder="Ex: L01" />
                       </div>"""

replacement_inputs_str = """                       <div>
                         <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                           Lote
                         </label>
                         <input type="text" value={formData.lote || ""} onChange={(e) => setFormData({ ...formData, lote: e.target.value })} className="w-full px-4 py-2 bg-[#0a0a0a] border border-white/10 rounded-xl outline-none focus:border-blue-500/50 text-white font-bold text-sm" placeholder="Ex: L01" />
                       </div>
                       <div>
                         <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                           Rua
                         </label>
                         <input type="text" value={formData.rua || ""} onChange={(e) => setFormData({ ...formData, rua: e.target.value })} className="w-full px-4 py-2 bg-[#0a0a0a] border border-white/10 rounded-xl outline-none focus:border-blue-500/50 text-white font-bold text-sm" placeholder="Ex: A" />
                       </div>
                       <div>
                         <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                           Prateleira
                         </label>
                         <input type="text" value={formData.prateleira || ""} onChange={(e) => setFormData({ ...formData, prateleira: e.target.value })} className="w-full px-4 py-2 bg-[#0a0a0a] border border-white/10 rounded-xl outline-none focus:border-blue-500/50 text-white font-bold text-sm" placeholder="Ex: 1" />
                       </div>"""

content = content.replace(inputs_str, replacement_inputs_str)

with open("src/pages/admin/AdminProducts.tsx", "w") as f:
    f.write(content)

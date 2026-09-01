import re

with open('src/pages/admin/AdminStores.tsx', 'r') as f:
    content = f.read()

double_pin = """                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">PIN Gerência</label>
                    <input type="text" value={formData.manager_pin} onChange={(e) => setFormData({ ...formData, manager_pin: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-yellow-500/30 rounded-2xl focus:border-primary/50 outline-none text-white text-sm" placeholder="0000" maxLength={8} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">PIN Gerência</label>
                    <input type="text" value={formData.manager_pin} onChange={(e) => setFormData({ ...formData, manager_pin: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-yellow-500/30 rounded-2xl focus:border-primary/50 outline-none text-white text-sm" placeholder="0000" maxLength={8} />
                  </div>"""

single_pin = """                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">PIN Gerência</label>
                    <input type="text" value={formData.manager_pin} onChange={(e) => setFormData({ ...formData, manager_pin: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-yellow-500/30 rounded-2xl focus:border-primary/50 outline-none text-white text-sm" placeholder="0000" maxLength={8} />
                  </div>"""

content = content.replace(double_pin, single_pin)

with open('src/pages/admin/AdminStores.tsx', 'w') as f:
    f.write(content)

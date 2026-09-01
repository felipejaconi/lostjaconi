import re

with open('src/pages/admin/AdminStores.tsx', 'r') as f:
    content = f.read()

# 1. Update initial formData state
content = content.replace(
    'manager_name: "",\n    password: "",',
    'manager_name: "",\n    manager_pin: "0000",\n    password: "",'
)

# 2. Update reset in save success
content = content.replace(
    'manager_name: "", password: "",',
    'manager_name: "", manager_pin: "0000", password: "",'
)

# 3. Update edit button click
content = content.replace(
    'manager_name: store.manager_name || "",\n      password: "",',
    'manager_name: store.manager_name || "",\n      manager_pin: store.manager_pin || "0000",\n      password: "",'
)

# 4. Add the input field in the modal form
manager_name_input = """                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Responsável</label>
                    <input type="text" value={formData.manager_name} onChange={(e) => setFormData({ ...formData, manager_name: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-yellow-500/30 rounded-2xl focus:border-primary/50 outline-none text-white text-sm" />
                  </div>"""

manager_pin_input = """                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Responsável</label>
                    <input type="text" value={formData.manager_name} onChange={(e) => setFormData({ ...formData, manager_name: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-yellow-500/30 rounded-2xl focus:border-primary/50 outline-none text-white text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">PIN Gerência</label>
                    <input type="text" value={formData.manager_pin} onChange={(e) => setFormData({ ...formData, manager_pin: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-yellow-500/30 rounded-2xl focus:border-primary/50 outline-none text-white text-sm" placeholder="0000" maxLength={8} />
                  </div>"""

content = content.replace(manager_name_input, manager_pin_input)

# Check if there are other occurrences of manager_name_input
# In AdminStores there are two views (desktop/mobile forms?) Wait, let's replace all:
content = re.sub(
    r'<div className="space-y-2">\s*<label className="text-\[10px\] font-black text-slate-500 uppercase tracking-widest ml-1">Responsável</label>\s*<input type="text" value=\{formData.manager_name\} onChange=\{\(e\) => setFormData\(\{ \.\.\.formData, manager_name: e\.target\.value \}\)\} className="w-full px-4 py-3 bg-white/5 border border-yellow-500/30 rounded-2xl focus:border-primary/50 outline-none text-white text-sm" />\s*</div>',
    manager_pin_input,
    content
)

with open('src/pages/admin/AdminStores.tsx', 'w') as f:
    f.write(content)

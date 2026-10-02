import sys

with open('src/pages/admin/AdminFinancial.tsx', 'r') as f:
    code = f.read()

old_block = """                              <div className="w-full flex-1 min-w-0 flex flex-col items-center justify-center py-2">
                                 <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">{store.name}</span>
                                 <h4 className="font-black text-lg text-amber-500 uppercase tracking-widest truncate w-full px-2" title={store.name}>{store.name}</h4>
                              </div>"""

new_block = """                              <div className="w-full flex-1 min-w-0 flex flex-col items-center justify-center py-2">
                                 <h4 className="font-black text-lg text-amber-500 uppercase tracking-widest truncate w-full px-2 mt-4" title={store.name}>{store.name}</h4>
                              </div>"""

if old_block in code:
    code = code.replace(old_block, new_block)
    with open('src/pages/admin/AdminFinancial.tsx', 'w') as f:
        f.write(code)
    print("Success")
else:
    print("Not found")


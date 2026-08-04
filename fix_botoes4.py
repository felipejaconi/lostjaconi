import sys

with open('src/pages/admin/AdminFinancial.tsx', 'r') as f:
    code = f.read()

old_block = """                              <div className="w-full flex-1 min-w-0 flex flex-col items-center justify-center py-2">
                                 <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Loja</span>
                                 <h4 className="font-black text-xl text-amber-500 uppercase tracking-widest truncate px-2" title={store.name}>{store.name}</h4>
                              </div>
                              <div className="w-full flex flex-wrap gap-1.5 mt-auto pt-3">"""

new_block = """                              <div className="w-full flex-1 min-w-0 flex flex-col items-center justify-center py-2">
                                 <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">{store.name}</span>
                                 <h4 className="font-black text-lg text-amber-500 uppercase tracking-widest truncate w-full px-2" title={store.name}>{store.name}</h4>
                              </div>
                              <div className="w-full flex flex-row flex-wrap sm:flex-nowrap gap-1 mt-auto pt-2">"""

if old_block in code:
    code = code.replace(old_block, new_block)
    with open('src/pages/admin/AdminFinancial.tsx', 'w') as f:
        f.write(code)
    print("Success")
else:
    print("Not found")


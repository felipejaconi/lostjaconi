import sys

with open('src/pages/admin/AdminFinancial.tsx', 'r') as f:
    code = f.read()

old_block = """                              <div className="w-full flex-1 min-w-0 flex flex-col items-center justify-center py-2 relative">
                                 <h4 className="font-black text-[11px] sm:text-[13px] text-amber-500 uppercase tracking-[0.2em] leading-tight line-clamp-3 w-full px-2 text-center" title={store.name}>{store.name}</h4>
                              </div>
                              <div className="w-full flex flex-wrap gap-1.5 mt-auto pt-3">"""

new_block = """                              <div className="w-full flex-1 min-w-0 flex flex-col items-center justify-center py-2 relative">
                                 <h4 className="font-black text-[13px] sm:text-[15px] text-amber-500 uppercase tracking-widest leading-tight line-clamp-3 w-full px-2 text-center" title={store.name}>{store.name}</h4>
                              </div>
                              <div className="w-full flex flex-wrap gap-1 mt-auto pt-2">"""

if old_block in code:
    code = code.replace(old_block, new_block)
    with open('src/pages/admin/AdminFinancial.tsx', 'w') as f:
        f.write(code)
    print("Success")
else:
    print("Not found")


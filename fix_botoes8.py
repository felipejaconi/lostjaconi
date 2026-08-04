import sys

with open('src/pages/admin/AdminFinancial.tsx', 'r') as f:
    code = f.read()

old_block = """                              <div className="w-full flex-1 min-w-0 flex flex-col items-center justify-center py-2 relative">
                                 <h4 className="font-black text-[11px] sm:text-[13px] text-amber-500 uppercase tracking-[0.2em] leading-tight line-clamp-3 w-full px-2 text-center" title={store.name}>{store.name}</h4>
                              </div>
                              <div className="w-full flex flex-row flex-wrap sm:flex-nowrap gap-1 mt-auto pt-2">"""

new_block = """                              <div className="w-full flex-1 min-w-0 flex flex-col items-center justify-center py-2 relative">
                                 <h4 className="font-black text-[14px] sm:text-[16px] text-amber-500 uppercase tracking-[0.15em] leading-tight line-clamp-3 w-full px-2 text-center" title={store.name}>{store.name}</h4>
                              </div>
                              <div className="w-full flex flex-row flex-wrap sm:flex-nowrap gap-1 mt-auto pt-2">"""

if old_block in code:
    code = code.replace(old_block, new_block)
    with open('src/pages/admin/AdminFinancial.tsx', 'w') as f:
        f.write(code)
    print("Success")
else:
    print("Not found")


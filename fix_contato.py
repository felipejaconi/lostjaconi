import sys

with open('src/pages/admin/AdminSuppliers.tsx', 'r') as f:
    code = f.read()

# We need to insert `{f.contato && (` between `)}` of contribuinte and `<div ...>` of contato.
# It currently looks like:
#                     )}
#                           </div>
#                           <span className="truncate">{f.contato}</span>
#                        </div>
#                     )}

code = code.replace("                     )}\n                           </div>", "                     )}\n                     {f.contato && (\n                        <div className=\"flex items-center gap-3 text-sm text-slate-300\">\n                           <div className=\"w-6 h-6 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center text-slate-500 shrink-0\">\n                               <Phone size={12} />\n                           </div>")

with open('src/pages/admin/AdminSuppliers.tsx', 'w') as f:
    f.write(code)

print("Success fix contato")

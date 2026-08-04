import sys

with open('src/pages/admin/AdminReports.tsx', 'r') as f:
    code = f.read()

old_label1 = '<p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-1">A Receber (Lojas)</p>'
new_label1 = '<p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-1">A Receber (Valor Total)</p>'
code = code.replace(old_label1, new_label1)

with open('src/pages/admin/AdminReports.tsx', 'w') as f:
    f.write(code)
print("Success")

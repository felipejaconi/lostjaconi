import sys

with open('src/pages/admin/AdminExpenseEntries.tsx', 'r') as f:
    code = f.read()

code = code.replace(
    '<div className="p-6">',
    '<div className={compact ? "p-1 pb-6" : "p-6"}>'
)

code = code.replace(
    '<div className="p-6 bg-zinc-900/50 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-6">',
    '<div className={compact ? "pt-6 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-6" : "p-6 bg-zinc-900/50 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-6"}>'
)

with open('src/pages/admin/AdminExpenseEntries.tsx', 'w') as f:
    f.write(code)

print("Success")

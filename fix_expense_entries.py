import sys

with open('src/pages/admin/AdminExpenseEntries.tsx', 'r') as f:
    code = f.read()

code = code.replace(
    'export default function AdminExpenseEntries({ onSuccess, lojaId }: { onSuccess?: () => void, lojaId?: string }) {',
    'export default function AdminExpenseEntries({ onSuccess, lojaId, compact = false }: { onSuccess?: () => void, lojaId?: string, compact?: boolean }) {'
)

code = code.replace(
    '  return (\n    <div className="p-4 sm:p-8 max-w-3xl mx-auto space-y-6">\n      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-sm overflow-hidden">',
    '  return (\n    <div className={compact ? "" : "p-4 sm:p-8 max-w-3xl mx-auto space-y-6"}>\n      <div className={compact ? "" : "bg-zinc-900 border border-zinc-800 rounded-2xl shadow-sm overflow-hidden"}>'
)

with open('src/pages/admin/AdminExpenseEntries.tsx', 'w') as f:
    f.write(code)

print("Success")

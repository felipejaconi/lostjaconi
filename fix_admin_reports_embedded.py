import sys

with open('src/pages/admin/AdminReports.tsx', 'r') as f:
    code = f.read()

code = code.replace(
    'export default function AdminReports() {',
    'export default function AdminReports({ embedded = false }: { embedded?: boolean }) {'
)

code = code.replace(
    '<div className="pt-2 px-4 md:pt-4 md:px-6 lg:px-8 pb-32">',
    '<div className={embedded ? "" : "pt-2 px-4 md:pt-4 md:px-6 lg:px-8 pb-32"}>'
)

# hide the header if embedded
old_header = """      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-zinc-800 pb-6 mb-8">
        <div>
          <h1 className="text-3xl lg:text-4xl font-semibold text-zinc-100 tracking-tight flex items-center gap-3">
             <Wallet className="w-8 h-8 text-blue-500" />
             Relatórios Financeiros
           </h1>
          <p className="text-sm text-zinc-400 font-medium mt-2">Extração e análise de dados de contas a pagar e receber</p>
        </div>
      </div>"""

new_header = """      {!embedded && <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-zinc-800 pb-6 mb-8">
        <div>
          <h1 className="text-3xl lg:text-4xl font-semibold text-zinc-100 tracking-tight flex items-center gap-3">
             <Wallet className="w-8 h-8 text-blue-500" />
             Relatórios Financeiros
           </h1>
          <p className="text-sm text-zinc-400 font-medium mt-2">Extração e análise de dados de contas a pagar e receber</p>
        </div>
      </div>}"""

code = code.replace(old_header, new_header)

with open('src/pages/admin/AdminReports.tsx', 'w') as f:
    f.write(code)

print("Success")

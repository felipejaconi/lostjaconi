with open("src/pages/admin/AdminWarehouseMap.tsx", "r") as f:
    content = f.read()

target = """        {ruas.length === 0 && mapData.semLocalizacao.length === 0 ? (
           <div className="text-center py-12 bg-zinc-900/50 rounded-2xl border border-zinc-800/80">"""

replacement = """        {ruas.length === 0 && mapData.semLocalizacao.length === 0 ? (
           <div className="text-center py-12 bg-zinc-900/50 rounded-2xl border border-zinc-800/80 lg:col-span-3">"""

content = content.replace(target, replacement)

with open("src/pages/admin/AdminWarehouseMap.tsx", "w") as f:
    f.write(content)

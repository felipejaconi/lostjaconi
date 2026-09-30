with open("src/pages/admin/AdminWarehouseMap.tsx", "r") as f:
    content = f.read()

target = """        {mapData.semLocalizacao.length > 0 && (
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-sm">"""

replacement = """        {mapData.semLocalizacao.length > 0 && (
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-sm lg:col-span-3">"""

content = content.replace(target, replacement)

with open("src/pages/admin/AdminWarehouseMap.tsx", "w") as f:
    f.write(content)

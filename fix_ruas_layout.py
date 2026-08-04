with open("src/pages/admin/AdminWarehouseMap.tsx", "r") as f:
    content = f.read()

target = """      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">"""
replacement = """      <div className="grid grid-cols-1 gap-6">"""

content = content.replace(target, replacement)

target2 = """           <div className="text-center py-12 bg-zinc-900/50 rounded-2xl border border-zinc-800/80 lg:col-span-3">"""
replacement2 = """           <div className="text-center py-12 bg-zinc-900/50 rounded-2xl border border-zinc-800/80">"""

content = content.replace(target2, replacement2)

target3 = """            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-sm lg:col-span-3">"""
replacement3 = """            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-sm">"""

content = content.replace(target3, replacement3)

with open("src/pages/admin/AdminWarehouseMap.tsx", "w") as f:
    f.write(content)

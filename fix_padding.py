with open("src/pages/admin/AdminWarehouseMap.tsx", "r") as f:
    content = f.read()

content = content.replace(
    "className={`w-10 h-10 rounded-lg border flex items-center justify-center p-1 relative group cursor-pointer transition-transform hover:scale-110 z-10 hover:z-20 ${colorClass}`}",
    "className={`w-10 h-10 rounded-lg border flex items-center justify-center p-0.5 relative group cursor-pointer transition-transform hover:scale-110 z-10 hover:z-20 ${colorClass}`}"
)

with open("src/pages/admin/AdminWarehouseMap.tsx", "w") as f:
    f.write(content)

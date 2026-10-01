with open("src/pages/admin/AdminWarehouseMap.tsx", "r") as f:
    content = f.read()

content = content.replace("hover:z-20", "hover:z-[60]")

with open("src/pages/admin/AdminWarehouseMap.tsx", "w") as f:
    f.write(content)

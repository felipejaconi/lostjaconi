with open("src/pages/admin/AdminWarehouseMap.tsx", "r") as f:
    content = f.read()

content = content.replace("hover:scale-150", "hover:scale-[2.5]")

with open("src/pages/admin/AdminWarehouseMap.tsx", "w") as f:
    f.write(content)

with open("src/pages/admin/AdminWarehouseMap.tsx", "r") as f:
    content = f.read()

content = content.replace("hover:scale-110", "hover:scale-150")

with open("src/pages/admin/AdminWarehouseMap.tsx", "w") as f:
    f.write(content)

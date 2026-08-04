with open("src/pages/admin/AdminWarehouseMap.tsx", "r") as f:
    content = f.read()

content = content.replace("hover:scale-[2.5]", "hover:scale-[3.5] transform-origin-center")

with open("src/pages/admin/AdminWarehouseMap.tsx", "w") as f:
    f.write(content)

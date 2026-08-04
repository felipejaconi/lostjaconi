with open("src/pages/admin/AdminWarehouseMap.tsx", "r") as f:
    content = f.read()

content = content.replace(r"stock_armazem?: number;\n  imagem_url?: string;", "stock_armazem?: number;\n  imagem_url?: string;")

with open("src/pages/admin/AdminWarehouseMap.tsx", "w") as f:
    f.write(content)

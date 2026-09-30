with open("src/pages/admin/AdminWarehouseMap.tsx", "r") as f:
    content = f.read()

target = """          quantity: lote.quantidade !== undefined ? lote.quantidade : (p.stock_armazem ?? p.estoque ?? 0)"""
replacement = """          quantity: p.stock_armazem ?? p.estoque ?? 0"""

content = content.replace(target, replacement)

with open("src/pages/admin/AdminWarehouseMap.tsx", "w") as f:
    f.write(content)

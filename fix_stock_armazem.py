with open("src/pages/admin/AdminWarehouseMap.tsx", "r") as f:
    content = f.read()

# Interface
target_interface = """interface Product {
  id: string;
  nome: string;
  estoque: number;
  estoque_minimo?: number;"""

replacement_interface = """interface Product {
  id: string;
  nome: string;
  estoque: number;
  stock_armazem?: number;
  estoque_minimo?: number;"""
content = content.replace(target_interface, replacement_interface)

# semLocalizacao push 1
target_push1 = """        semLocalizacao.push({ product: p, quantity: p.estoque });"""
replacement_push1 = """        semLocalizacao.push({ product: p, quantity: p.stock_armazem ?? p.estoque ?? 0 });"""
content = content.replace(target_push1, replacement_push1)

# layout quantity
target_qty = """quantity: lote.quantidade !== undefined ? lote.quantidade : p.estoque"""
replacement_qty = """quantity: lote.quantidade !== undefined ? lote.quantidade : (p.stock_armazem ?? p.estoque ?? 0)"""
content = content.replace(target_qty, replacement_qty)

with open("src/pages/admin/AdminWarehouseMap.tsx", "w") as f:
    f.write(content)

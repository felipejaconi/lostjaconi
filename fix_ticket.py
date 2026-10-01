import re

with open('src/routes/orders.ts', 'r') as f:
    content = f.read()

old_calc = """mediaPedido: c.numPedidos > 0 ? (c.totalHistorico / c.numPedidos).toFixed(2) : 0,"""
new_calc = """mediaPedido: c.numPedidos > 0 ? (c.mensal / c.numPedidos).toFixed(2) : 0,"""

content = content.replace(old_calc, new_calc)

with open('src/routes/orders.ts', 'w') as f:
    f.write(content)

print("Fixed mediaPedido")

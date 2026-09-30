import re

with open('src/routes/orders.ts', 'r') as f:
    content = f.read()

old_code = """      for (const p of pedidos || []) {
        if (!p.loja || p.status === "cancelado") continue;
        const lojaId = p.user_id;
        const lojaNome = p.loja.name;
        const dataPedido = new Date(p.created_at);
        
        for (const item of p.pedido_itens || []) {"""

new_code = """      for (const p of pedidos || []) {
        if (!p.loja || p.status === "cancelado") continue;
        const lojaId = p.user_id;
        const lojaNome = p.loja.name;
        
        const originalDate = new Date(p.created_at);
        const adjustedDate = new Date(originalDate);
        const lastDayOfMonth = new Date(adjustedDate.getFullYear(), adjustedDate.getMonth() + 1, 0).getDate();
        if (adjustedDate.getDate() === lastDayOfMonth) {
            adjustedDate.setDate(adjustedDate.getDate() + 1);
        }
        const dataPedido = adjustedDate;
        
        for (const item of p.pedido_itens || []) {"""

if old_code in content:
    content = content.replace(old_code, new_code)
    with open('src/routes/orders.ts', 'w') as f:
        f.write(content)
    print("Success")
else:
    print("Not found")

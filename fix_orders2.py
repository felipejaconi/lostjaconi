import sys

with open('src/pages/admin/AdminOrders.tsx', 'r') as f:
    code = f.read()

old_block = """  const uniqueStores = Array.from(new Map(orders.map(o => [o.user_id, o])).values())
    .filter(o => o.user_id)
    .map(o => ({
      id: o.user_id,
      name: o.loja_nome || o.user?.name || "Loja"
    }))"""

new_block = """  const uniqueStores = (Array.from(new Map(orders.map((o: any) => [o.user_id, o])).values()) as any[])
    .filter((o: any) => o.user_id)
    .map((o: any) => ({
      id: o.user_id,
      name: o.loja_nome || o.user?.name || "Loja"
    }))"""

if old_block in code:
    code = code.replace(old_block, new_block)
    with open('src/pages/admin/AdminOrders.tsx', 'w') as f:
        f.write(code)
    print("Success")
else:
    print("Not found")


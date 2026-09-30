import sys

with open('src/pages/admin/AdminOrders.tsx', 'r') as f:
    code = f.read()

old_block = """    try {
      setIsCreatingOrder(true);
      const res = await api.post("/pedidos", {"""

new_block = """    try {
      setIsCreatingOrder(true);
      const res: any = await api.post("/pedidos", {"""

if old_block in code:
    code = code.replace(old_block, new_block)
    with open('src/pages/admin/AdminOrders.tsx', 'w') as f:
        f.write(code)
    print("Success")
else:
    print("Not found")


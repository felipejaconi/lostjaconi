import re

with open('src/routes/orders.ts', 'r') as f:
    content = f.read()

# Locate the forEach loop
old_code = """        (orders || []).forEach((order: any) => {
          const storeId = order.user_id;
          const storeName = order.user?.name || "Loja Desconhecida";
          const orderDate = new Date(order.created_at);
          const total = Number(order.total);"""

new_code = """        (orders || []).forEach((order: any) => {
          const storeId = order.user_id;
          const storeName = order.user?.name || "Loja Desconhecida";
          const originalDate = new Date(order.created_at);
          
          const adjustedDate = new Date(originalDate);
          const lastDayOfMonth = new Date(adjustedDate.getFullYear(), adjustedDate.getMonth() + 1, 0).getDate();
          if (adjustedDate.getDate() === lastDayOfMonth) {
              adjustedDate.setDate(adjustedDate.getDate() + 1);
          }
          
          const orderDate = adjustedDate;
          const total = Number(order.total);"""

if old_code in content:
    content = content.replace(old_code, new_code)
    with open('src/routes/orders.ts', 'w') as f:
        f.write(content)
    print("Success")
else:
    print("Not found")

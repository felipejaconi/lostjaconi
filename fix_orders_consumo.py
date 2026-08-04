import re

with open('src/routes/orders.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Locate the section
start_pattern = r'const now = new Date\(\);.*?const currentDayOfMonth = now\.getDate\(\) \|\| 1;'

new_code = """const now = new Date();
        const firstDayOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const firstDayOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

        const consumption: any = {};

        (orders || []).forEach((order: any) => {
          const storeId = order.user_id;
          const storeName = order.user?.name || "Loja Desconhecida";
          const orderDate = new Date(order.created_at);
          const total = Number(order.total);

          if (!consumption[storeId]) {
            consumption[storeId] = {
              name: storeName,
              diario: 0,
              semanal: 0,
              mensal: 0,
              mesAnterior: 0,
              totalHistorico: 0,
              numPedidos: 0,
            };
          }

          consumption[storeId].totalHistorico += total;
          consumption[storeId].numPedidos += 1;

          if (orderDate >= firstDayOfCurrentMonth) {
              consumption[storeId].mensal += total;
          } else if (orderDate >= firstDayOfPreviousMonth && orderDate < firstDayOfCurrentMonth) {
              consumption[storeId].mesAnterior += total;
          }
        });

        const currentDayOfMonth = now.getDate() || 1;"""

content = re.sub(start_pattern, new_code.replace('\\', '\\\\'), content, flags=re.DOTALL)

with open('src/routes/orders.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")

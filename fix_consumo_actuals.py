import re

with open('src/routes/orders.ts', 'r') as f:
    content = f.read()

old_code = """        const now = new Date();
        const firstDayOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const firstDayOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const consumption: any = {};

        (orders || []).forEach((order: any) => {
          const storeId = order.user_id;
          const storeName = order.user?.name || "Loja Desconhecida";
          const originalDate = new Date(order.created_at);
          
          const adjustedDate = new Date(originalDate);
          const lastDayOfMonth = new Date(adjustedDate.getFullYear(), adjustedDate.getMonth() + 1, 0).getDate();
          if (adjustedDate.getDate() === lastDayOfMonth) {
              adjustedDate.setDate(adjustedDate.getDate() + 1);
          }
          
          const orderDate = adjustedDate;
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

          if (orderDate >= firstDayOfCurrentMonth) {
              consumption[storeId].mensal += total;
              consumption[storeId].totalHistorico += total;
              consumption[storeId].numPedidos += 1;
          } else if (orderDate >= firstDayOfPreviousMonth && orderDate < firstDayOfCurrentMonth) {
              consumption[storeId].mesAnterior += total;
          }
        });

        const currentDayOfMonth = now.getDate() || 1;
        const result = Object.values(consumption).map((c: any) => ({
          ...c,
          diario: c.mensal / currentDayOfMonth,
          semanal: c.mensal / 7,
          mediaPedido: c.numPedidos > 0 ? (c.totalHistorico / c.numPedidos).toFixed(2) : 0,
        }));"""

new_code = """        const agora = new Date();
        agora.setHours(0,0,0,0);

        const startOfDay = new Date(agora);
        
        const startOfWeek = new Date(agora);
        const day = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - day + (day == 0 ? -6 : 1);
        startOfWeek.setDate(diff);

        const startOfMonth = new Date(agora.getFullYear(), agora.getMonth(), 1);
        const startOfPreviousMonth = new Date(agora.getFullYear(), agora.getMonth() - 1, 1);

        const consumption: any = {};

        (orders || []).forEach((order: any) => {
          const storeId = order.user_id;
          const storeName = order.user?.name || "Loja Desconhecida";
          const originalDate = new Date(order.created_at);
          
          const adjustedDate = new Date(originalDate);
          const lastDayOfMonth = new Date(adjustedDate.getFullYear(), adjustedDate.getMonth() + 1, 0).getDate();
          if (adjustedDate.getDate() === lastDayOfMonth) {
              adjustedDate.setDate(adjustedDate.getDate() + 1);
          }
          
          const orderDate = adjustedDate;
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

          if (orderDate >= startOfDay) consumption[storeId].diario += total;
          if (orderDate >= startOfWeek) consumption[storeId].semanal += total;
          if (orderDate >= startOfMonth) {
              consumption[storeId].mensal += total;
              consumption[storeId].totalHistorico += total;
              consumption[storeId].numPedidos += 1;
          } else if (orderDate >= startOfPreviousMonth && orderDate < startOfMonth) {
              consumption[storeId].mesAnterior += total;
          }
        });

        const result = Object.values(consumption).map((c: any) => ({
          ...c,
          mediaPedido: c.numPedidos > 0 ? (c.totalHistorico / c.numPedidos).toFixed(2) : 0,
        }));"""

if old_code in content:
    content = content.replace(old_code, new_code)
    with open('src/routes/orders.ts', 'w') as f:
        f.write(content)
    print("Success")
else:
    print("Not found")

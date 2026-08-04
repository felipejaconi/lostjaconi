import re

with open('src/routes/orders.ts', 'r') as f:
    content = f.read()

old_code = """          consumption[storeId].totalHistorico += total;
          consumption[storeId].numPedidos += 1;

          if (orderDate >= firstDayOfCurrentMonth) {
              consumption[storeId].mensal += total;
          } else if (orderDate >= firstDayOfPreviousMonth && orderDate < firstDayOfCurrentMonth) {
              consumption[storeId].mesAnterior += total;
          }"""

new_code = """          if (orderDate >= firstDayOfCurrentMonth) {
              consumption[storeId].mensal += total;
              consumption[storeId].totalHistorico += total;
              consumption[storeId].numPedidos += 1;
          } else if (orderDate >= firstDayOfPreviousMonth && orderDate < firstDayOfCurrentMonth) {
              consumption[storeId].mesAnterior += total;
          }"""

if old_code in content:
    content = content.replace(old_code, new_code)
    with open('src/routes/orders.ts', 'w') as f:
        f.write(content)
    print("Success")
else:
    print("Not found")

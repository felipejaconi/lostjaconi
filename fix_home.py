import sys

with open('src/pages/admin/AdminHome.tsx', 'r') as f:
    code = f.read()

old_block = """      .then((res) => {
        setRecentOrders(res.data.recentOrders);
        setPendingOrdersCount(res.data.pendingOrdersCount);
        setProdutosAlertas(res.data.produtosAlertas);
        setTotalFornecedores(res.data.totalFornecedores || 0);
      })"""

new_block = """      .then((res: any) => {
        setRecentOrders(res.data.recentOrders);
        setPendingOrdersCount(res.data.pendingOrdersCount);
        setProdutosAlertas(res.data.produtosAlertas);
        setTotalFornecedores(res.data.totalFornecedores || 0);
      })"""

if old_block in code:
    code = code.replace(old_block, new_block)
    with open('src/pages/admin/AdminHome.tsx', 'w') as f:
        f.write(code)
    print("Success")
else:
    print("Not found")


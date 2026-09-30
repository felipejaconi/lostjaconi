import re

with open('src/pages/admin/AdminOrders.tsx', 'r') as f:
    content = f.read()

# 1. Remove the auto-sync prices loop. 
old_effect = """  useEffect(() => {
    if (products.length > 0 && orders.length > 0) {
      let needsUpdate = false;
      const updates: any[] = [];
      const updatedOrders = [...orders];

      updatedOrders.forEach(order => {
        if (order.status === 'pendente' || order.status === 'processando') {
          order.pedido_itens?.forEach((item: any) => {
            const prod = products.find(p => p.id === item.produto_id);
            if (prod && Number(prod.preco) > 0 && Math.abs(Number(prod.preco) - Number(item.preco_unitario)) > 0.001) {
              updates.push(api.put(`/pedidos/${order.id}/itens/${item.id}`, { preco_unitario: Number(prod.preco) }));
              item.preco_unitario = Number(prod.preco);
              needsUpdate = true;
            }
          });
        }
      });

      if (needsUpdate) {
        setOrders(updatedOrders); // Trigger re-render with new values
        Promise.all(updates).catch(e => console.error("Error auto-syncing prices:", e));
      }
    }
  }, [products]); // Trigger sync whenever products are updated"""

content = content.replace(old_effect, "  // Removed auto-sync prices to fix massive lag on load")

# 2. Prevent double fetch on mount
old_mount = """  useEffect(() => {
    autoConnectScale();
    const unsubscribeScale = onScaleStatusChange(setStatus => {
        setScaleStatus(setStatus);
    });

    fetchOrders(); fetchStores(); fetchProducts();"""

new_mount = """  useEffect(() => {
    autoConnectScale();
    const unsubscribeScale = onScaleStatusChange(setStatus => {
        setScaleStatus(setStatus);
    });

    fetchStores(); fetchProducts(); // fetchOrders is called by the viewMode effect"""

content = content.replace(old_mount, new_mount)

with open('src/pages/admin/AdminOrders.tsx', 'w') as f:
    f.write(content)
print("Patched frontend")

with open("src/pages/admin/AdminFinancial.tsx", "r") as f:
    content = f.read()

target = """function getPedidoTotalComIva(pedido: any): number {
  let sumSubtotal = 0;
  let sumIva = 0;
  (pedido.pedido_itens || []).forEach((item: any) => {
    const qty = Number(item.quantidade) || 0;
    const preco = Number(item.preco_unitario || 0);
    const liq = qty * preco;
    const ivaPerc = Number(item.produto?.iva || 0);
    const ivaVal = liq * (ivaPerc / 100);
    sumSubtotal += liq;
    sumIva += ivaVal;
  });
  return sumSubtotal + sumIva;
}"""

replacement = """function getPedidoTotalComIva(pedido: any): number {
  let sumSubtotal = 0;
  let sumIva = 0;
  (pedido.pedido_itens || []).forEach((item: any) => {
    const qty = Number(item.quantidade) || 0;
    const preco = Number(item.preco_unitario || 0);
    const liq = qty * preco;
    const ivaPerc = Number(item.produto?.iva || 0);
    const ivaVal = liq * (ivaPerc / 100);
    sumSubtotal += liq;
    sumIva += ivaVal;
  });
  return sumSubtotal + sumIva;
}

function getPedidoTotalIva(pedido: any): number {
  let sumIva = 0;
  (pedido.pedido_itens || []).forEach((item: any) => {
    const qty = Number(item.quantidade) || 0;
    const preco = Number(item.preco_unitario || 0);
    const liq = qty * preco;
    const ivaPerc = Number(item.produto?.iva || 0);
    sumIva += liq * (ivaPerc / 100);
  });
  return sumIva;
}"""

content = content.replace(target, replacement)
with open("src/pages/admin/AdminFinancial.tsx", "w") as f:
    f.write(content)

with open("src/pages/admin/AdminFinancial.tsx", "r") as f:
    content = f.read()

target1 = """     let totalVencido = new Decimal(0);
     let totalIvaCredito = new Decimal(0);
     let totalReceber = new Decimal(0);"""

replacement1 = """     let totalVencido = new Decimal(0);
     let totalIvaCredito = new Decimal(0);
     let totalIvaDebito = new Decimal(0);
     let totalReceber = new Decimal(0);"""

content = content.replace(target1, replacement1)

target2 = """     pedidos.forEach(p => {
        if (['pronto', 'entregue'].includes(p.status?.toLowerCase())) {
           totalReceber = totalReceber.add(new Decimal(getPedidoTotalComIva(p) || 0));
        }
     });"""

replacement2 = """     pedidos.forEach(p => {
        // Considera debito de IVA de pedidos que estão em um estado faturado ou entregue
        // Para simplificar, consideramos de todos os pedidos não cancelados ou pelo menos dos que não estão pendentes
        // ou que a data é deste mês (para comparar alhos com bugalhos).
        const orderDate = new Date(p.created_at);
        const isCurrentMonth = orderDate.getMonth() === today.getMonth() && orderDate.getFullYear() === today.getFullYear();
        if (isCurrentMonth && p.status?.toLowerCase() !== 'cancelado') {
           totalIvaDebito = totalIvaDebito.add(new Decimal(getPedidoTotalIva(p) || 0));
        }

        if (['pronto', 'entregue'].includes(p.status?.toLowerCase())) {
           totalReceber = totalReceber.add(new Decimal(getPedidoTotalComIva(p) || 0));
        }
     });"""

content = content.replace(target2, replacement2)

target3 = """        totalCompras: totalCompras.toNumber(),
        totalDespesas: totalDespesas.toNumber(),
        totalPendente: totalPendente.toNumber(),
        totalVencido: totalVencido.toNumber(),
        totalIvaCredito: totalIvaCredito.toNumber(),
        totalReceber: totalReceber.toNumber(),"""

replacement3 = """        totalCompras: totalCompras.toNumber(),
        totalDespesas: totalDespesas.toNumber(),
        totalPendente: totalPendente.toNumber(),
        totalVencido: totalVencido.toNumber(),
        totalIvaCredito: totalIvaCredito.toNumber(),
        totalIvaDebito: totalIvaDebito.toNumber(),
        totalReceber: totalReceber.toNumber(),"""

content = content.replace(target3, replacement3)

with open("src/pages/admin/AdminFinancial.tsx", "w") as f:
    f.write(content)

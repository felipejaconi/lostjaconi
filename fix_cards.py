import re

with open("src/pages/admin/AdminFinancial.tsx", "r") as f:
    content = f.read()

# Fix the totalIvaDebito calculation logic
target_logic = """     pedidos.forEach(p => {
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

replacement_logic = """     pedidos.forEach(p => {
        if (['pronto', 'entregue'].includes(p.status?.toLowerCase())) {
           totalReceber = totalReceber.add(new Decimal(getPedidoTotalComIva(p) || 0));
           totalIvaDebito = totalIvaDebito.add(new Decimal(getPedidoTotalIva(p) || 0));
        }
     });"""

content = content.replace(target_logic, replacement_logic)

# Make cards more compact and fit in 7 columns
content = content.replace('className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4"', 'className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3"')

# Compact card styling replacements
# We only want to replace the occurrences within the 7 cards section, but a simple replace is fine if they match exactly those cards.
content = content.replace('rounded-2xl p-5 shadow-sm', 'rounded-xl p-4 shadow-sm')
content = content.replace('w-10 h-10 rounded-xl', 'w-8 h-8 rounded-lg')
content = content.replace('justify-between mb-4', 'justify-between mb-3')
content = content.replace('w-5 h-5', 'w-4 h-4')
content = content.replace('text-2xl font-bold', 'text-xl font-bold')

with open("src/pages/admin/AdminFinancial.tsx", "w") as f:
    f.write(content)

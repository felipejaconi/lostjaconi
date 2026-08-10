const fs = require('fs');
const file = 'src/pages/admin/AdminReports.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  '{ id: "pagar", title: "A Pagar", icon: TrendingDown, color: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500" }',
  '{ id: "pagar", title: "A Pagar (compras)", icon: TrendingDown, color: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500" }'
);

code = code.replace(
  '{ id: "debito_iva", title: "Débito IVA", icon: FileSpreadsheet, color: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500" }',
  '{ id: "debito_iva", title: "Débito IVA (lojas)", icon: FileSpreadsheet, color: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500" }'
);

code = code.replace(
  '{ id: "receber", title: "A Receber", icon: TrendingUp, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500" }',
  '{ id: "receber", title: "A Receber (lojas)", icon: TrendingUp, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500" }'
);

code = code.replace(
  '{ id: "consumo_lojas", title: "Totais Lojas", icon: Store, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500" }',
  '{ id: "consumo_lojas", title: "Compras Totais (Lojas)", icon: Store, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500" }'
);

fs.writeFileSync(file, code);

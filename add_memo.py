import sys

with open('src/pages/admin/AdminSuppliers.tsx', 'r') as f:
    code = f.read()

memo_import = "import React, { useState, useEffect, useMemo } from \"react\";"
code = code.replace("import React, { useState, useEffect } from \"react\";", memo_import)

memo_code = """
  const chartData = useMemo(() => {
    const stats: Record<string, { nome: string; total: number }> = {};
    faturas.forEach(f => {
       const val = Number(f.valor_total || 0);
       const fornId = f.fornecedor_id;
       if (fornId && f.fornecedor) {
          if (!stats[fornId]) {
             stats[fornId] = { nome: f.fornecedor.nome || "Desconhecido", total: 0 };
          }
          stats[fornId].total += val;
       }
    });
    return Object.values(stats)
       .sort((a, b) => b.total - a.total)
       .slice(0, 10); // top 10
  }, [faturas]);
"""

# Insert before return (
target = "  const filteredFornecedores = fornecedores.filter(f =>"
code = code.replace(target, memo_code + "\n" + target)

with open('src/pages/admin/AdminSuppliers.tsx', 'w') as f:
    f.write(code)
print('Success')

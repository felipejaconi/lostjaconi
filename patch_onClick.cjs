const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/AdminFechos.tsx', 'utf8');

code = code.replace(
/      return \{\n         name: loja\.name,\n         atual: calcTotal\(cFechos\),\n         anterior: calcTotal\(pFechos\)\n      \};/,
`      return {
         id: loja.id,
         name: loja.name,
         atual: calcTotal(cFechos),
         anterior: calcTotal(pFechos)
      };`
);

code = code.replace(
/<Bar dataKey="atual" name="Mês Atual" fill="#3b82f6" radius=\{\[4, 4, 0, 0\]\} maxBarSize=\{60\} \/>/,
`<Bar dataKey="atual" name="Mês Atual" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={60} onClick={(data: any) => data?.id && setSelectedLojaId(data.id)} cursor="pointer" />`
);

code = code.replace(
/<Bar dataKey="anterior" name="Mês Anterior" fill="#64748b" radius=\{\[4, 4, 0, 0\]\} maxBarSize=\{60\} opacity=\{0\.5\} \/>/,
`<Bar dataKey="anterior" name="Mês Anterior" fill="#64748b" radius={[4, 4, 0, 0]} maxBarSize={60} opacity={0.5} onClick={(data: any) => data?.id && setSelectedLojaId(data.id)} cursor="pointer" />`
);


fs.writeFileSync('src/pages/admin/AdminFechos.tsx', code);

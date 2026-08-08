const fs = require('fs');
const file = 'src/routes/wms.ts';
let code = fs.readFileSync(file, 'utf8');
code = code.replace(
  'await supabase.from("pedido_itens").delete().in("id", idsToDelete);',
  'await supabase.from("pedido_itens").update({ quantidade: 0 }).in("id", idsToDelete);'
);
fs.writeFileSync(file, code);

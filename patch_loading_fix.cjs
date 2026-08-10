const fs = require('fs');
const file = 'src/pages/admin/AdminFinancial.tsx';
let code = fs.readFileSync(file, 'utf8');

// Undo what I did for Modal Pagamento
code = code.replace(
  '            </>\n         )}\n\n         {/* Modal Pagamento */}',
  '         {/* Modal Pagamento */}'
);

// Close the block properly before Modal Despesa
code = code.replace(
  '      </div>\n      {/* Modal Despesa */}',
  '            </>\n         )}\n      </div>\n      {/* Modal Despesa */}'
);

fs.writeFileSync(file, code);

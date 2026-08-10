const fs = require('fs');
const file = 'src/pages/admin/AdminFinancial.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  '      </div>\n\n      {/* Modal Despesa */}',
  '            </>\n         )}\n      </div>\n\n      {/* Modal Despesa */}'
);

fs.writeFileSync(file, code);

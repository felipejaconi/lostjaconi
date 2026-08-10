const fs = require('fs');
const file = 'src/pages/admin/AdminFinancial.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  '              </button>\n           </div>\n        <div className="flex items-center gap-3">',
  '              </button>\n           </div>\n           )}\n        <div className="flex items-center gap-3">'
);

fs.writeFileSync(file, code);

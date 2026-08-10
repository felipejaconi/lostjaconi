const fs = require('fs');
const file = 'src/pages/admin/AdminFinancial.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  '<div className="flex bg-[#0a0a0a] p-1.5 rounded-2xl border border-white/5 w-full sm:w-auto overflow-x-auto no-scrollbar gap-1 shadow-inner">',
  '{!isArmazem && (\n              <div className="flex bg-[#0a0a0a] p-1.5 rounded-2xl border border-white/5 w-full sm:w-auto overflow-x-auto no-scrollbar gap-1 shadow-inner">'
);

code = code.replace(
  '              </button>\n           </div>\n      </div>',
  '              </button>\n           </div>\n           )}\n      </div>'
);

fs.writeFileSync(file, code);

const fs = require('fs');
const file = 'src/pages/admin/AdminFinancial.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  '{activeTab === "faturas" && (\n            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl shadow-sm flex flex-col h-full min-h-[500px]">',
  '{activeTab === "faturas" && isLoading ? (\n            <div className="flex items-center justify-center h-64 w-full">\n               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>\n            </div>\n         ) : activeTab === "faturas" && (\n            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl shadow-sm flex flex-col h-full min-h-[500px]">'
);

fs.writeFileSync(file, code);

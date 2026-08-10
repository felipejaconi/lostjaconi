const fs = require('fs');
const file = 'src/pages/admin/AdminFinancial.tsx';
let code = fs.readFileSync(file, 'utf8');

const loader = `
      {/* Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
         {isLoading ? (
            <div className="flex items-center justify-center h-64 w-full">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div>
            </div>
         ) : (
            <>
`;

code = code.replace(
  '      {/* Content */}\n      <div className="flex-1 overflow-y-auto no-scrollbar pb-10">',
  loader
);

code = code.replace(
  '         {/* Modal Pagamento */}',
  '            </>\n         )}\n\n         {/* Modal Pagamento */}'
);

// We need to undo the previous patch to avoid syntax errors or double conditions
code = code.replace(
  '{activeTab === "faturas" && isLoading ? (\n            <div className="flex items-center justify-center h-64 w-full">\n               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>\n            </div>\n         ) : activeTab === "faturas" && (',
  '{activeTab === "faturas" && ('
);

fs.writeFileSync(file, code);

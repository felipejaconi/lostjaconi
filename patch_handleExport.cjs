const fs = require('fs');
const file = 'src/pages/admin/AdminReports.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  'const handleExport = async () => {',
  'const handleExport = async (isView: boolean = false) => {'
);

code = code.replace(
  '      if (format === "pdf") {\n        printGenericDocument({\n          title,\n          headers,\n          data,\n          docNumber: `FIN-${new Date().getFullYear()}-${reportType.toUpperCase()}`,\n          footerNotes: "Relatório Financeiro gerado pelo sistema ERP Lost Wind."\n        });\n      } else {',
  '      if (format === "pdf") {\n        printGenericDocument({\n          title,\n          headers,\n          data,\n          docNumber: `FIN-${new Date().getFullYear()}-${reportType.toUpperCase()}`,\n          footerNotes: "Relatório Financeiro gerado pelo sistema ERP Lost Wind.",\n          autoPrint: !isView\n        });\n      } else {'
);

fs.writeFileSync(file, code);

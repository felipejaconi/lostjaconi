const fs = require('fs');
const file = 'src/lib/printGenericDocument.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  '  date?: string;\n}',
  '  date?: string;\n  autoPrint?: boolean;\n}'
);

code = code.replace(
  '  date\n}: PrintGenericOptions) {',
  '  date,\n  autoPrint = true\n}: PrintGenericOptions) {'
);

code = code.replace(
  '<script>\n        window.onload = function() {\n            setTimeout(function() {\n                window.print();\n            }, 500);\n        }\n      </script>',
  '${autoPrint ? `<script>\n        window.onload = function() {\n            setTimeout(function() {\n                window.print();\n            }, 500);\n        }\n      </script>` : ""}'
);

fs.writeFileSync(file, code);

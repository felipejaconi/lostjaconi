const fs = require('fs');
const file = 'src/pages/admin/AdminFinancial.tsx';
let code = fs.readFileSync(file, 'utf8');

const useEffectCode = `
  useEffect(() => {
    if (searchParams.get("tab") === "faturas") {
      setActiveTab("faturas");
    }
  }, [searchParams]);
`;

code = code.replace(
  '  useEffect(() => {\n    fetchDados();\n  }, []);',
  '  useEffect(() => {\n    fetchDados();\n  }, []);\n' + useEffectCode
);

fs.writeFileSync(file, code);

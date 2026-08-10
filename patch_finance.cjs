const fs = require('fs');
const file = 'src/pages/admin/AdminFinancial.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  'import AdminExpenseEntries from "./AdminExpenseEntries";',
  'import AdminExpenseEntries from "./AdminExpenseEntries";\nimport { useAuth } from "../../context/AuthContext";\nimport { useSearchParams } from "react-router-dom";'
);

code = code.replace(
  'export default function AdminFinancial() {',
  'export default function AdminFinancial() {\n  const { user } = useAuth();\n  const [searchParams] = useSearchParams();\n  const isArmazem = user?.role === "armazem";'
);

code = code.replace(
  'const [activeTab, setActiveTab] = useState<"dashboard" | "faturas" | "fornecedores" | "despesas" | "relatorios">("dashboard");',
  'const [activeTab, setActiveTab] = useState<"dashboard" | "faturas" | "fornecedores" | "despesas" | "relatorios">(() => {\n    if (searchParams.get("tab") === "faturas") return "faturas";\n    if (user?.role === "armazem") return "faturas";\n    return "dashboard";\n  });'
);

fs.writeFileSync(file, code);

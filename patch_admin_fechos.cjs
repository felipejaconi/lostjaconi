const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/AdminFechos.tsx', 'utf8');

if (!code.includes('BarChart')) {
  code = code.replace(
    /import \{ BrandTitle \} from "\.\.\/\.\.\/components\/BrandTitle";/,
    `import { BrandTitle } from "../../components/BrandTitle";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, CartesianGrid, YAxis, Legend } from "recharts";`
  );
}

if (!code.includes('prevFechos')) {
  code = code.replace(
    /const \[fechos, setFechos\] = useState<any\[\]>\(\[\]\);/,
    `const [fechos, setFechos] = useState<any[]>([]);\n  const [prevFechos, setPrevFechos] = useState<any[]>([]);`
  );
}

if (!code.includes('resPrev = await api.get')) {
  code = code.replace(
    /const res = await api\.get\(`\/admin\/fechos\?month=\$\{month\}&year=\$\{year\}`\);\n\s*setFechos\(res\.data \|\| \[\]\);/,
    `const pMonth = selectedDate.getMonth() === 0 ? 12 : selectedDate.getMonth();
        const pYear = selectedDate.getMonth() === 0 ? year - 1 : year;
        
        const [res, resPrev] = await Promise.all([
           api.get(\`/admin/fechos?month=\${month}&year=\${year}\`),
           api.get(\`/admin/fechos?month=\${pMonth}&year=\${pYear}\`)
        ]);
        
        setFechos(res.data || []);
        setPrevFechos(resPrev.data || []);`
  );
}

fs.writeFileSync('src/pages/admin/AdminFechos.tsx', code);

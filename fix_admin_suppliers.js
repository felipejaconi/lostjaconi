import fs from 'fs';
let code = fs.readFileSync('src/pages/admin/AdminSuppliers.tsx', 'utf-8');

const importsTarget = `import { Save, Users, Plus, Edit2, Trash2, Search, Building2, MapPin, CreditCard, Filter, Check, X, FileText, ChevronRight, Package, Tag, Calendar, Download, RefreshCw, BarChartIcon, ExternalLink } from "lucide-react";`;
const importsNew = `import { Save, Users, Plus, Edit2, Trash2, Search, Building2, MapPin, CreditCard, Filter, Check, X, FileText, ChevronRight, Package, Tag, Calendar, Download, RefreshCw, BarChartIcon, ExternalLink } from "lucide-react";\nimport { monthNames } from "../../lib/utils";`;

if (!code.includes('import { monthNames }')) {
    code = code.replace(importsTarget, importsNew);
}

const stateTarget = `  const [productSuppliersReport, setProductSuppliersReport] = useState<any[]>([]);
  const [isReportLoading, setIsReportLoading] = useState(false);`;

const stateNew = `  const [productSuppliersReport, setProductSuppliersReport] = useState<any[]>([]);
  const [isReportLoading, setIsReportLoading] = useState(false);

  const [reportPeriod, setReportPeriod] = useState<"mes" | "todos">("mes");
  const [reportMonth, setReportMonth] = useState<number>(new Date().getMonth());
  const [reportYear, setReportYear] = useState<number>(new Date().getFullYear());`;

if (!code.includes('const [reportPeriod, setReportPeriod]')) {
    code = code.replace(stateTarget, stateNew);
}

const fetchFornTarget = `  const fetchSupplierProductsList = async (fornecedorId: string) => {
    setIsSupplierProductsLoading(true);
    setSupplierProducts([]);
    try {
      const res = await api.get(\`/admin/fornecedores/\${fornecedorId}/produtos\`);`;

const fetchFornNew = `  const fetchSupplierProductsList = async (fornecedorId: string, p = reportPeriod, m = reportMonth, y = reportYear) => {
    setIsSupplierProductsLoading(true);
    setSupplierProducts([]);
    try {
      const res = await api.get(\`/admin/fornecedores/\${fornecedorId}/produtos?period=\${p}&month=\${m}&year=\${y}\`);`;

code = code.replace(fetchFornTarget, fetchFornNew);

const fetchProdTarget = `  const fetchProductReport = async (productId: string) => {
    if (!productId) {
       setProductSuppliersReport([]);
       return;
    }
    setIsReportLoading(true);
    try {
      const res = await api.get(\`/admin/produtos/\${productId}/fornecedores\`);`;

const fetchProdNew = `  const fetchProductReport = async (productId: string, p = reportPeriod, m = reportMonth, y = reportYear) => {
    if (!productId) {
       setProductSuppliersReport([]);
       return;
    }
    setIsReportLoading(true);
    try {
      const res = await api.get(\`/admin/produtos/\${productId}/fornecedores?period=\${p}&month=\${m}&year=\${y}\`);`;

code = code.replace(fetchProdTarget, fetchProdNew);

const effectProdTarget = `  useEffect(() => {
    if (selectedReportProductId) {
       fetchProductReport(selectedReportProductId);
    } else {
       setProductSuppliersReport([]);
    }
  }, [selectedReportProductId]);`;

const effectProdNew = `  useEffect(() => {
    if (selectedReportProductId) {
       fetchProductReport(selectedReportProductId, reportPeriod, reportMonth, reportYear);
    } else {
       setProductSuppliersReport([]);
    }
  }, [selectedReportProductId, reportPeriod, reportMonth, reportYear]);`;

code = code.replace(effectProdTarget, effectProdNew);

// In the Modal, near the top, add the Period Selector.
const modalHeaderTarget = `             <div className="flex border-b border-white/10 shrink-0 overflow-x-auto custom-scrollbar">`;

const modalHeaderNew = `             <div className="p-4 sm:px-6 sm:py-4 border-b border-white/10 bg-black/40 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 bg-white/5 rounded-xl p-1 border border-white/10">
                   <button
                     onClick={() => { setReportPeriod("mes"); if (reportsTab === 'fornecedores' && selectedReportSupplierId) fetchSupplierProductsList(selectedReportSupplierId, 'mes', reportMonth, reportYear); }}
                     className={\`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all \${reportPeriod === 'mes' ? 'bg-blue-500 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}\`}
                   >
                     Mês Específico
                   </button>
                   <button
                     onClick={() => { setReportPeriod("todos"); if (reportsTab === 'fornecedores' && selectedReportSupplierId) fetchSupplierProductsList(selectedReportSupplierId, 'todos', reportMonth, reportYear); }}
                     className={\`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all \${reportPeriod === 'todos' ? 'bg-blue-500 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}\`}
                   >
                     Todo o Período
                   </button>
                </div>
                {reportPeriod === "mes" && (
                   <div className="flex items-center gap-2">
                      <select
                         value={reportMonth}
                         onChange={(e) => { const val = Number(e.target.value); setReportMonth(val); if (reportsTab === 'fornecedores' && selectedReportSupplierId) fetchSupplierProductsList(selectedReportSupplierId, 'mes', val, reportYear); }}
                         className="bg-[#111] border border-white/10 rounded-xl px-3 py-1.5 text-xs font-bold text-white uppercase tracking-wider outline-none focus:border-blue-500 transition-colors"
                      >
                         {monthNames.map((m, i) => (
                            <option key={i} value={i}>{m}</option>
                         ))}
                      </select>
                      <select
                         value={reportYear}
                         onChange={(e) => { const val = Number(e.target.value); setReportYear(val); if (reportsTab === 'fornecedores' && selectedReportSupplierId) fetchSupplierProductsList(selectedReportSupplierId, 'mes', reportMonth, val); }}
                         className="bg-[#111] border border-white/10 rounded-xl px-3 py-1.5 text-xs font-bold text-white uppercase tracking-wider outline-none focus:border-blue-500 transition-colors"
                      >
                         {[2024, 2025, 2026, 2027].map(y => (
                            <option key={y} value={y}>{y}</option>
                         ))}
                      </select>
                   </div>
                )}
             </div>

             <div className="flex border-b border-white/10 shrink-0 overflow-x-auto custom-scrollbar">`;

code = code.replace(modalHeaderTarget, modalHeaderNew);

fs.writeFileSync('src/pages/admin/AdminSuppliers.tsx', code);
console.log("AdminSuppliers.tsx updated!");

import re

with open('src/pages/admin/AdminSuppliers.tsx', 'r') as f:
    content = f.read()

# Add state for selected month
state_addition = """  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const monthOptions = useMemo(() => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      options.push({ key, label: label.charAt(0).toUpperCase() + label.slice(1) });
    }
    return options;
  }, []);"""

if "const [selectedMonth" not in content:
    content = content.replace("  const [faturas, setFaturas] = useState<any[]>([]);", "  const [faturas, setFaturas] = useState<any[]>([]);\n" + state_addition)

# Update chartData logic to filter by selectedMonth
old_chartData = """  const chartData = useMemo(() => {
    const stats: Record<string, { nome: string; total: number }> = {};
    faturas.forEach(f => {
       const val = Number(f.valor_total || 0);
       const fornId = f.fornecedor_id;
       if (fornId && f.fornecedor) {
          if (!stats[fornId]) {
             stats[fornId] = { nome: f.fornecedor.nome || "Desconhecido", total: 0 };
          }
          stats[fornId].total += val;
       }
    });
    return Object.values(stats)
       .sort((a, b) => b.total - a.total)
       .slice(0, 10); // top 10
  }, [faturas]);"""

new_chartData = """  const chartData = useMemo(() => {
    const stats: Record<string, { nome: string; total: number }> = {};
    faturas.forEach(f => {
       // Filter by selectedMonth
       if (f.data_emissao) {
           const d = new Date(f.data_emissao);
           const fMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
           if (fMonth !== selectedMonth && selectedMonth !== 'all') return;
       } else if (f.created_at) {
           const d = new Date(f.created_at);
           const fMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
           if (fMonth !== selectedMonth && selectedMonth !== 'all') return;
       } else {
           if (selectedMonth !== 'all') return; // no date means skip if a specific month is selected
       }

       const val = Number(f.valor_total || 0);
       const fornId = f.fornecedor_id;
       if (fornId && f.fornecedor) {
          if (!stats[fornId]) {
             stats[fornId] = { nome: f.fornecedor.nome || "Desconhecido", total: 0 };
          }
          stats[fornId].total += val;
       }
    });
    return Object.values(stats)
       .sort((a, b) => b.total - a.total)
       .slice(0, 10); // top 10
  }, [faturas, selectedMonth]);"""

content = content.replace(old_chartData, new_chartData)

# Update UI
old_ui = """      {/* Gráfico de Principais Fornecedores */}
      <div className="mt-8 bg-[#111] border border-white/10 rounded-3xl shadow-sm p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-32 bg-blue-500/5 blur-[100px] rounded-full pointer-events-none" />
        <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-6">
          <BarChartIcon className="w-5 h-5 text-blue-500" /> Principais Fornecedores (Gastos)
        </h3>"""

new_ui = """      {/* Gráfico de Principais Fornecedores */}
      <div className="mt-8 bg-[#111] border border-white/10 rounded-3xl shadow-sm p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-32 bg-blue-500/5 blur-[100px] rounded-full pointer-events-none" />
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <BarChartIcon className="w-5 h-5 text-blue-500" /> Principais Fornecedores (Gastos)
          </h3>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="appearance-none bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500/50 cursor-pointer shadow-inner"
          >
            <option value="all">Todo o Histórico</option>
            {monthOptions.map(opt => (
              <option key={opt.key} value={opt.key}>{opt.label}</option>
            ))}
          </select>
        </div>"""

content = content.replace(old_ui, new_ui)

with open('src/pages/admin/AdminSuppliers.tsx', 'w') as f:
    f.write(content)

print("Done")

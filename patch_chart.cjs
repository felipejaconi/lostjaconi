const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/AdminFechos.tsx', 'utf8');

const chartLogic = `  const chartData = lojas.map(loja => {
      const cFechos = fechos.filter(f => f.loja_id === loja.id);
      const pFechos = prevFechos.filter(f => f.loja_id === loja.id);
      
      const calcTotal = (arr) => arr.reduce((acc, f) => {
         return acc + Number(f.sys_mb || 0) + Number(f.sys_dinheiro || 0) + Number(f.sys_mesa || 0) + Number(f.sys_uber || 0);
      }, 0);
      
      return {
         name: loja.name,
         atual: calcTotal(cFechos),
         anterior: calcTotal(pFechos)
      };
  });

  return (`;

code = code.replace(/  return \(/, chartLogic);

const tableAreaRegex = /<div className="bg-\[#111\] border border-white\/10 rounded-3xl shadow-lg overflow-hidden flex flex-col min-h-\[600px\] mb-8 relative">([\s\S]*?)<\/ContentViewport>/;

const chartRender = `<div className="bg-[#111] border border-white/10 rounded-3xl shadow-lg overflow-hidden flex flex-col min-h-[600px] mb-8 relative p-6">
        {selectedLojaId === 'all' ? (
           <div className="flex flex-col w-full h-[500px]">
              <div className="mb-6">
                 <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <BarChart2 className="text-blue-500" size={24} />
                    Faturação: Mês Atual vs Mês Anterior
                 </h3>
                 <p className="text-zinc-400 text-sm mt-1">Comparação do total faturado no sistema por loja.</p>
              </div>
              <div className="flex-1 min-h-0">
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ left: -20, right: 0, top: 20, bottom: 20 }}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                       <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                       <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} tickFormatter={(val) => \`€\${val}\`} />
                       <Tooltip 
                          cursor={{ fill: '#ffffff05' }}
                          contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#fff', borderRadius: '8px' }}
                          itemStyle={{ color: '#e4e4e7' }}
                          formatter={(value) => [\`€\${Number(value).toFixed(2)}\`, '']}
                       />
                       <Legend wrapperStyle={{ paddingTop: '20px' }} />
                       <Bar dataKey="atual" name="Mês Atual" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={60} />
                       <Bar dataKey="anterior" name="Mês Anterior" fill="#64748b" radius={[4, 4, 0, 0]} maxBarSize={60} opacity={0.5} />
                    </BarChart>
                 </ResponsiveContainer>
              </div>
           </div>
        ) : (
           <div className="overflow-x-auto -mx-6 -my-6">
              $1
           </div>
        )}
      </div>
    </ContentViewport>`;

code = code.replace(tableAreaRegex, chartRender);

if (!code.includes('BarChart2')) {
   code = code.replace(/import \{ BrandTitle \}/, 'import { BarChart2 } from "lucide-react";\nimport { BrandTitle }');
}

fs.writeFileSync('src/pages/admin/AdminFechos.tsx', code);

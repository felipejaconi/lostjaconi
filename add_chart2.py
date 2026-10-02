import sys

with open('src/pages/admin/AdminSuppliers.tsx', 'r') as f:
    code = f.read()

chart_code = """
      {/* Gráfico de Principais Fornecedores */}
      <div className="mt-8 bg-[#111] border border-white/10 rounded-3xl shadow-sm p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-32 bg-blue-500/5 blur-[100px] rounded-full pointer-events-none" />
        <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-6">
          <BarChartIcon className="w-5 h-5 text-blue-500" /> Principais Fornecedores (Gastos)
        </h3>
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-slate-500 text-sm font-semibold uppercase tracking-wider">
            Sem dados de gastos.
          </div>
        ) : (
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" strokeOpacity={0.05} vertical={false} />
                <XAxis dataKey="nome" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickMargin={10} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `€${value}`} />
                <Tooltip
                  cursor={{ fill: '#ffffff', opacity: 0.05 }}
                  contentStyle={{ backgroundColor: '#0a0a0a', borderColor: '#ffffff20', borderRadius: '16px', color: '#f8fafc', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5)' }}
                  itemStyle={{ color: '#3b82f6', fontWeight: 'bold' }}
                  formatter={(value: number) => [`€ ${value.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}`, 'Total']}
                />
                <Bar dataKey="total" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
"""

target = "        )}\n      </div>\n\n      {isModalOpen && ("

if "Principais Fornecedores (Gastos)" not in code:
    code = code.replace(target, chart_code + "\n" + target)

    with open('src/pages/admin/AdminSuppliers.tsx', 'w') as f:
        f.write(code)
    print('Success')
else:
    print('Chart already exists')

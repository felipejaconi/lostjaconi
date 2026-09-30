import sys

with open('src/pages/admin/AdminSuppliers.tsx', 'r') as f:
    code = f.read()

chart_code = """
        {/* Gráfico de Principais Fornecedores */}
        <div className="mt-8 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-zinc-100 flex items-center gap-2 mb-6">
            <BarChartIcon className="w-5 h-5 text-blue-500" /> Principais Fornecedores (Gastos)
          </h3>
          {chartData.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-zinc-500 text-sm">
              Sem dados de gastos.
            </div>
          ) : (
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="nome" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} tickMargin={10} />
                  <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `€${value}`} />
                  <Tooltip
                    cursor={{ fill: '#27272a', opacity: 0.4 }}
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', color: '#f4f4f5' }}
                    itemStyle={{ color: '#3b82f6', fontWeight: 'bold' }}
                    formatter={(value: number) => [`€ ${value.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}`, 'Total']}
                  />
                  <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
"""

# replace 
#             )}
#           </div>
#        )}

target = "        )}\n      </div>\n\n      {isModalOpen && ("
code = code.replace(target, chart_code + "\n" + target)

# add BarChartIcon import if missing
if "BarChartIcon" not in code:
    code = code.replace("import { Plus, Users", "import { Plus, Users, BarChart as BarChartIcon")

with open('src/pages/admin/AdminSuppliers.tsx', 'w') as f:
    f.write(code)
print('Success')

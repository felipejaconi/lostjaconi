import sys

with open('src/pages/admin/AdminReports.tsx', 'r') as f:
    code = f.read()

# First, remove the button from the bottom
old_bottom = '''         </div>

         <div className="mt-8 pt-6 border-t border-zinc-800">
            <button
               onClick={handleExport}
               disabled={loading}
               className="w-full sm:w-auto px-8 py-3.5 bg-blue-500 text-white font-bold text-sm rounded-xl hover:bg-blue-600 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mx-auto"
            >
               {loading ? <span className="animate-pulse">A Processar...</span> : <><Download size={18} /> Baixar Relatório</>}
            </button>
         </div>
      </div>
    </div>
  );'''

new_bottom = '''         </div>
      </div>
    </div>
  );'''
code = code.replace(old_bottom, new_bottom)

# Now inject it into the left column
old_left = '''                <div>
                    <label className="flex items-center gap-2 text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-3">
                        <FileText size={14}/> Tipo de Relatório
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {reportOptions.map((opt) => {
                           const Icon = opt.icon;
                           const isSelected = reportType === opt.id;
                           return (
                             <button
                                key={opt.id}
                                onClick={() => { setReportType(opt.id as ReportType); setEntity("todos"); setStatus("todos"); }}
                                className={`flex items-center gap-2 p-2 px-2.5 rounded-lg border transition-all text-left ${
                                    isSelected
                                    ? `${opt.bg} ${opt.border} ${opt.color}`
                                    : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-800/50"
                                }`}
                             >
                                <Icon size={14} className={isSelected ? opt.color : "text-zinc-500 shrink-0"} />
                                <span className="text-[10px] font-bold leading-tight truncate">{opt.title}</span>
                             </button>
                           );
                        })}
                    </div>
                </div>
            </div>'''

new_left = '''                <div className="flex-1">
                    <label className="flex items-center gap-2 text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-3">
                        <FileText size={14}/> Tipo de Relatório
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {reportOptions.map((opt) => {
                           const Icon = opt.icon;
                           const isSelected = reportType === opt.id;
                           return (
                             <button
                                key={opt.id}
                                onClick={() => { setReportType(opt.id as ReportType); setEntity("todos"); setStatus("todos"); }}
                                className={`flex items-center gap-2 p-2 px-2.5 rounded-lg border transition-all text-left ${
                                    isSelected
                                    ? `${opt.bg} ${opt.border} ${opt.color}`
                                    : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-800/50"
                                }`}
                             >
                                <Icon size={14} className={isSelected ? opt.color : "text-zinc-500 shrink-0"} />
                                <span className="text-[10px] font-bold leading-tight truncate">{opt.title}</span>
                             </button>
                           );
                        })}
                    </div>
                </div>
                
                <div className="pt-6 border-t border-zinc-800/50 mt-auto">
                    <button
                       onClick={handleExport}
                       disabled={loading}
                       className="w-full sm:w-auto px-6 py-3 bg-blue-500 text-white font-bold text-sm rounded-xl hover:bg-blue-600 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                       {loading ? <span className="animate-pulse">A Processar...</span> : <><Download size={18} /> Baixar Relatório</>}
                    </button>
                </div>
            </div>'''

code = code.replace(old_left, new_left)

# Also need to make the left column full height to align it to bottom
old_cols = '''<div className="space-y-6">'''
new_cols = '''<div className="space-y-6 flex flex-col h-full">'''
code = code.replace(old_cols, new_cols, 1) # Only replace the first occurrence (left column)

with open('src/pages/admin/AdminReports.tsx', 'w') as f:
    f.write(code)

print("Success")

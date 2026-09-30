import sys

with open('src/pages/admin/AdminReports.tsx', 'r') as f:
    code = f.read()

# Replace the download button container
old_btn = '''                <div className="mt-4 flex justify-end">
                    <button
                       onClick={handleExport}
                       disabled={loading}
                       className="w-full sm:w-auto px-5 py-2.5 bg-blue-500 text-white font-bold text-sm rounded-xl hover:bg-blue-600 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
                    >
                       {loading ? <span className="animate-pulse">A Processar...</span> : <><Download size={16} /> Baixar Relatório</>}
                    </button>
                </div>'''
                
new_btn = '''                <div className="pt-6 border-t border-zinc-800/50 mt-auto flex flex-col justify-end">
                    <button
                       onClick={handleExport}
                       disabled={loading}
                       className="w-full px-6 py-3.5 bg-blue-500 text-white font-bold text-sm rounded-xl hover:bg-blue-600 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
                    >
                       {loading ? <span className="animate-pulse">A Processar...</span> : <><Download size={18} /> Baixar Relatório</>}
                    </button>
                </div>'''
code = code.replace(old_btn, new_btn)

with open('src/pages/admin/AdminReports.tsx', 'w') as f:
    f.write(code)

print("Success")

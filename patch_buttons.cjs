const fs = require('fs');
const file = 'src/pages/admin/AdminReports.tsx';
let code = fs.readFileSync(file, 'utf8');

const newButtons = `
                <div className="pt-6 border-t border-zinc-800/50 mt-auto flex flex-col gap-3 justify-end">
                    {format === "pdf" && (
                       <button
                          onClick={() => handleExport(true)}
                          disabled={loading}
                          className="w-full px-6 py-3.5 bg-zinc-800 text-white font-bold text-sm rounded-xl hover:bg-zinc-700 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                       >
                          {loading ? <span className="animate-pulse">A Processar...</span> : <><Eye size={18} /> Ver Relatório</>}
                       </button>
                    )}
                    <button
                       onClick={() => handleExport(false)}
                       disabled={loading}
                       className="w-full px-6 py-3.5 bg-blue-500 text-white font-bold text-sm rounded-xl hover:bg-blue-600 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
                    >
                       {loading ? <span className="animate-pulse">A Processar...</span> : <><Download size={18} /> Baixar Relatório</>}
                    </button>
                </div>
`;

code = code.replace(
  '                <div className="pt-6 border-t border-zinc-800/50 mt-auto flex flex-col justify-end">\n                    <button\n                       onClick={handleExport}\n                       disabled={loading}\n                       className="w-full px-6 py-3.5 bg-blue-500 text-white font-bold text-sm rounded-xl hover:bg-blue-600 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"\n                    >\n                       {loading ? <span className="animate-pulse">A Processar...</span> : <><Download size={18} /> Baixar Relatório</>}\n                    </button>\n                </div>',
  newButtons
);

fs.writeFileSync(file, code);

const fs = require('fs');
const file = 'src/pages/admin/AdminReports.tsx';
let code = fs.readFileSync(file, 'utf8');

const oldButtons = `                <div className="pt-6 border-t border-zinc-800/50 mt-auto flex flex-col gap-3 justify-end">
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
                </div>`;

const newButtons = `                <div className="pt-6 border-t border-zinc-800/50 mt-auto flex flex-row gap-2 justify-end">
                    {format === "pdf" && (
                       <button
                          onClick={() => handleExport(true)}
                          disabled={loading}
                          className="flex-1 px-4 py-2.5 bg-zinc-800 text-white font-bold text-sm rounded-xl hover:bg-zinc-700 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                       >
                          {loading ? <span className="animate-pulse">A Processar...</span> : <><Eye size={16} /> Ver</>}
                       </button>
                    )}
                    <button
                       onClick={() => handleExport(false)}
                       disabled={loading}
                       className="flex-1 px-4 py-2.5 bg-blue-500 text-white font-bold text-sm rounded-xl hover:bg-blue-600 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
                    >
                       {loading ? <span className="animate-pulse">A Processar...</span> : <><Download size={16} /> Baixar</>}
                    </button>
                </div>`;

code = code.replace(oldButtons, newButtons);
fs.writeFileSync(file, code);

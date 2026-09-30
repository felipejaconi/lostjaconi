const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/AdminFechos.tsx', 'utf8');

const replacement = `                      })}
                      {(() => {
                         const totais = days.reduce((acc, day) => {
                             const fecho = getFecho(day, loja.id);
                             if (!fecho) return acc;
                             
                             const sysMb = Number(fecho.sys_mb || 0);
                             const sysDin = Number(fecho.sys_dinheiro || 0);
                             const sysMesa = Number(fecho.sys_mesa || 0);
                             const sysUber = Number(fecho.sys_uber || 0);
                             const tVenda = sysMb + sysDin + sysMesa + sysUber;
                             
                             const realMb = Number(fecho.real_mb || 0);
                             const realDin = Number(fecho.real_dinheiro || 0);
                             const realMesa = Number(fecho.real_mesa || 0);
                             const realUber = Number(fecho.real_uber || 0);
                             const tVendasApre = realMb + realDin + realMesa + realUber;
                             
                             return {
                                sysMb: acc.sysMb + sysMb,
                                sysDin: acc.sysDin + sysDin,
                                sysMesa: acc.sysMesa + sysMesa,
                                sysUber: acc.sysUber + sysUber,
                                tVenda: acc.tVenda + tVenda,
                                realMb: acc.realMb + realMb,
                                realDin: acc.realDin + realDin,
                                realMesa: acc.realMesa + realMesa,
                                realUber: acc.realUber + realUber,
                                tVendasApre: acc.tVendasApre + tVendasApre,
                                dif: acc.dif + (tVendasApre - tVenda)
                             };
                         }, {
                             sysMb: 0, sysDin: 0, sysMesa: 0, sysUber: 0, tVenda: 0,
                             realMb: 0, realDin: 0, realMesa: 0, realUber: 0, tVendasApre: 0, dif: 0
                         });

                         const difColor = totais.dif > 0 ? "text-emerald-400" : totais.dif < 0 ? "text-rose-400" : "text-zinc-500";
                         
                         return (
                            <tr className="border-t-2 border-white/20 bg-black/60 group">
                               <td className="p-3 text-right text-zinc-300 font-bold uppercase tracking-widest sticky left-0 bg-[#111] z-10 shadow-[4px_0_12px_rgba(0,0,0,0.5)] border-t-2 border-white/10">
                                  TOTAL
                               </td>
                               
                               {/* SISTEMA */}
                               <td className="p-3 text-right font-bold text-blue-400 border-l border-white/10 bg-blue-500/[0.05]">
                                  {totais.sysMb > 0 ? \`€\${totais.sysMb.toFixed(2)}\` : '-'}
                               </td>
                               <td className="p-3 text-right font-bold text-blue-400 bg-blue-500/[0.05]">
                                  {totais.sysDin > 0 ? \`€\${totais.sysDin.toFixed(2)}\` : '-'}
                               </td>
                               <td className="p-3 text-right font-bold text-blue-400 bg-blue-500/[0.05]">
                                  {totais.sysMesa > 0 ? \`€\${totais.sysMesa.toFixed(2)}\` : '-'}
                               </td>
                               <td className="p-3 text-right font-bold text-blue-400 bg-blue-500/[0.05]">
                                  {totais.sysUber > 0 ? \`€\${totais.sysUber.toFixed(2)}\` : '-'}
                               </td>
                               <td className="p-3 text-right font-black text-blue-500 bg-blue-500/[0.1]">
                                  {totais.tVenda > 0 ? \`€\${totais.tVenda.toFixed(2)}\` : '-'}
                               </td>

                               {/* APRESENTADO */}
                               <td className="p-3 text-right font-bold text-emerald-400 border-l border-white/10 bg-emerald-500/[0.05]">
                                  {totais.realMb > 0 ? \`€\${totais.realMb.toFixed(2)}\` : '-'}
                               </td>
                               <td className="p-3 text-right font-bold text-emerald-400 bg-emerald-500/[0.05]">
                                  {totais.realDin > 0 ? \`€\${totais.realDin.toFixed(2)}\` : '-'}
                               </td>
                               <td className="p-3 text-right font-bold text-emerald-400 bg-emerald-500/[0.05]">
                                  {totais.realMesa > 0 ? \`€\${totais.realMesa.toFixed(2)}\` : '-'}
                               </td>
                               <td className="p-3 text-right font-bold text-emerald-400 bg-emerald-500/[0.05]">
                                  {totais.realUber > 0 ? \`€\${totais.realUber.toFixed(2)}\` : '-'}
                               </td>
                               <td className="p-3 text-right font-black text-emerald-500 bg-emerald-500/[0.1]">
                                  {totais.tVendasApre > 0 ? \`€\${totais.tVendasApre.toFixed(2)}\` : '-'}
                               </td>
                               
                               {/* TOTALS */}
                               <td className={\`p-3 text-right font-black border-l border-white/10 bg-white/[0.05] \${difColor}\`}>
                                  {totais.dif > 0 ? \`+€\${totais.dif.toFixed(2)}\` : totais.dif < 0 ? \`-€\${Math.abs(totais.dif).toFixed(2)}\` : '€0.00'}
                               </td>
                               
                               <td className="p-3 text-center bg-white/[0.02]">
                               </td>
                            </tr>
                         );
                      })()}`;

code = code.replace(/                      \}\)\}/, replacement);
fs.writeFileSync('src/pages/admin/AdminFechos.tsx', code);

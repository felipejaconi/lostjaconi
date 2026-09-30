import React, { useState, useEffect } from "react";
import { Store, Package, PackageMinus, Check, ListChecks, ScanLine, Scale, Trash2, Save, Send, AlertCircle, ChevronRight, Plus } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import api from "../../lib/api";
import Swal from "sweetalert2";
import { readWeightFromScale, autoConnectScale, onScaleStatusChange, ScaleStatus } from "../../lib/scale";

export default function AdminStockExits() {
  const [loading, setLoading] = useState(true);
  const [scaleStatus, setScaleStatus] = useState<ScaleStatus>('disconnected');

  // State for Manual Exit
  const [products, setProducts] = useState<any[]>([]);
  const [manualItems, setManualItems] = useState<any[]>([]);
  const [manualMotivo, setManualMotivo] = useState("");
  const [manualDestino, setManualDestino] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const [prodsRes] = await Promise.all([
        api.get("/produtos")
      ]);
      setProducts(Array.isArray(prodsRes.data) ? prodsRes.data.sort((a:any, b:any) => a.nome.localeCompare(b.nome)) : []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    autoConnectScale();
    const unsubscribeScale = onScaleStatusChange(setStatus => {
        setScaleStatus(setStatus);
    });
    fetchData();
    return () => {
        unsubscribeScale();
    };
  }, []);

  const addManualItem = () => {
    setManualItems([...manualItems, { id: Date.now(), produto_id: "", quantidade: "", unidade_saida: "un", mode: 'unidade' }]);
  };

  const removeManualItem = (id: number) => {
    setManualItems(manualItems.filter(item => item.id !== id));
  };

  const updateManualItem = (id: number, field: string, value: any) => {
    setManualItems(manualItems.map(item => {
       if (item.id === id) {
          const newItem = { ...item, [field]: value };
          if (field === 'produto_id') {
             const prod = products.find(p => p.id === value);
             if (prod) {
                newItem.unidade_saida = prod.unidade_base || "un";
                newItem.mode = 'unidade';
                newItem.fator_conversao = 1;
             }
          } else if (field === 'unidade_saida') {
             const prod = products.find(p => p.id === item.produto_id);
             if (prod) {
               newItem.fator_conversao = 1;
             }
          }
          return newItem;
       }
       return item;
    }));
  };

  const getWeightFromScaleManual = async (id: number) => {
     try {
       Swal.fire({
          title: "A ler Balança",
          text: "Coloque o artigo na balança...",
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading()
       });
       const weight = await readWeightFromScale();
       updateManualItem(id, 'quantidade', weight);
       Swal.fire({
         title: "Balança",
         text: `Peso lido com sucesso: ${weight} kg`,
         icon: "success",
         timer: 1500,
         showConfirmButton: false
       });
     } catch (e: any) {
       console.error(e);
       Swal.fire("Erro", e.message || "Falha na leitura da balança.", "error");
     }
  };

  const handleManualExit = async () => {
    const validItems = manualItems.filter(i => i.produto_id && i.quantidade && Number(i.quantidade) > 0);
    
    if (validItems.length === 0) {
      return Swal.fire("Atenção", "Adicione pelo menos um artigo com quantidade válida.", "warning");
    }
    if (!manualMotivo) {
      return Swal.fire("Atenção", "Indique o motivo ou destino desta saída.", "warning");
    }

    try {
      setLoading(true);
      
      for (const item of validItems) {
         const prod = products.find(p => p.id === item.produto_id);
         let qtyToDeduct = Number(item.quantidade);
         const fator = Number(item.fator_conversao) || 1;
         qtyToDeduct = qtyToDeduct * fator;

         await api.post("/admin/stock/movimentacao", {
            produto_id: item.produto_id,
            tipo: "saida",
            quantidade: qtyToDeduct,
            unidade: item.unidade_saida, // Add raw unit just in case backend expects it
            motivo: `[EXPEDIÇÃO AVULSA] ${manualMotivo}`
         });
      }

      Swal.fire({
        title: "Sucesso",
        text: "Saída registada no armazém.",
        icon: "success",
        timer: 2000,
        showConfirmButton: false
      });

      setManualItems([]);
      setManualMotivo("");
      setManualDestino("");
      fetchData(); 
    } catch (err: any) {
      Swal.fire("Erro na Expedição", err.response?.data?.message || err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const renderScaleStatus = () => {
      switch (scaleStatus) {
          case 'connected':
              return (
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full text-[10px] font-bold uppercase tracking-wider" title="Balança conectada">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Balança OK
                  </div>
              );
          case 'connecting':
              return (
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-full text-[10px] font-bold uppercase tracking-wider" title="A tentar conectar à balança...">
                      <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
                      A Ligar...
                  </div>
              );
          case 'error':
              return (
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-red-500/10 text-red-500 border border-red-500/20 rounded-full text-[10px] font-bold uppercase tracking-wider" title="Erro ao conectar à balança. Verifique o cabo e portas USB.">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      Erro Balança
                  </div>
              );
          case 'disconnected':
          default:
              return (
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-zinc-500/10 text-zinc-500 border border-zinc-500/20 rounded-full text-[10px] font-bold uppercase tracking-wider" title="Balança desconectada">
                      <div className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                      Desconectada
                  </div>
              );
      }
  };

  return (
    <div className=" pt-2 md:pt-4 pb-32 ">
      
      {/* HEADER & TABS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl lg:text-4xl font-semibold text-zinc-100 tracking-tight flex items-center gap-3">
            Expedição {renderScaleStatus()}
          </h1>
          <p className="text-zinc-400 mt-2 text-sm lg:text-base">Gira a saída de artigos para as lojas ou por motivos diversos.</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
          <motion.div key="manual" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 lg:p-8 shadow-sm">
               
               <div className="mb-6 max-w-2xl">
                  <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Destino / Motivo da Saída</label>
                  <input 
                    type="text" 
                    value={manualMotivo}
                    onChange={e => setManualMotivo(e.target.value)}
                    placeholder="Ex: Quebra, Transferência Interna, Consumo..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:border-amber-500/50 outline-none transition-colors placeholder:text-zinc-600"
                  />
               </div>

               {manualItems.length === 0 ? (
                  <div className="p-12 text-center border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/20">
                     <ScanLine className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
                     <h3 className="text-sm font-medium text-zinc-300">Lista Vazia</h3>
                     <p className="text-xs text-zinc-500 mt-1 mb-4">Adicione artigos para dar saída manual no armazém.</p>
                     <button onClick={addManualItem} className="bg-zinc-800 text-zinc-100 hover:bg-zinc-700 px-6 py-2.5 rounded-lg text-xs font-semibold transition-colors border border-zinc-700 flex items-center gap-2 mx-auto">
                       <Plus size={16} /> Adicionar Linha
                     </button>
                  </div>
               ) : (
                  <div className="space-y-4">
                    <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[900px]">
                           <thead>
                             <tr className="bg-zinc-900/50 border-b border-zinc-800">
                                <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider pl-6 w-1/3">Artigo</th>
                                <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider text-center">Disp. Armazém</th>
                                <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider text-center">Modo Leitura</th>
                                <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider text-center">Quantidade Real</th>
                                <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider text-right">Alocação(€)</th>
                                <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider text-center pr-6 w-16">Ação</th>
                             </tr>
                           </thead>
                           <tbody className="divide-y divide-zinc-800/50">
                              {manualItems.map(item => {
                                 const objProd = products.find(p => p.id === item.produto_id);
                                 const maxStock = objProd ? Number(objProd.stock_armazem) || 0 : 0;
                                 const pvp = objProd ? Number(objProd.preco) || 0 : 0;
                                 
                                 let precoUnitTabela = pvp;
                                 if (item.mode === 'cx') {
                                    const fator = Number(objProd?.fator_conversao_venda) || 1;
                                    precoUnitTabela = pvp * fator;
                                 } else if (item.mode === 'unidade' && (objProd?.unidade_venda === 'cx')) {
                                    const fator = Number(objProd?.fator_conversao_venda) || 1;
                                    precoUnitTabela = pvp / fator;
                                 }
                                 const precoFinalRow = precoUnitTabela * (Number(item.quantidade) || 0);
                                 
                                 return (
                                   <tr key={item.id} className="hover:bg-zinc-800/30 transition-colors">
                                      <td className="px-4 py-3 pl-6">
                                        <select 
                                          value={item.produto_id}
                                          onChange={e => updateManualItem(item.id, 'produto_id', e.target.value)}
                                          className="w-full h-10 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg px-3 text-sm text-zinc-100 focus:border-amber-500/50 outline-none transition-colors cursor-pointer"
                                        >
                                          <option value="">Selecione um produto...</option>
                                          {products.map(p => (
                                            <option key={p.id} value={p.id}>{p.nome}</option>
                                          ))}
                                        </select>
                                      </td>

                                      <td className="px-4 py-3 text-center">
                                         <p className={`text-sm font-semibold tabular-nums ${maxStock > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            {maxStock.toFixed(2)} <span className="text-[10px] uppercase text-zinc-500">{objProd?.unidade_base || 'un'}</span>
                                         </p>
                                      </td>

                                      <td className="px-4 py-3">
                                         <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg p-2 max-w-[180px] mx-auto w-full items-center justify-center">
                                            <span className="text-[10px] font-bold text-amber-500 uppercase">
                                              {objProd?.unidade_base || 'UN'}
                                            </span>
                                         </div>
                                      </td>

                                      <td className="px-4 py-3">
                                         <div className="flex items-center gap-2 max-w-[200px] mx-auto">
                                            {item.unidade_saida === 'kg' && (
                                              <button 
                                                onClick={() => getWeightFromScaleManual(item.id)}
                                                className="h-9 px-2.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-lg text-xs font-semibold hover:bg-amber-500/20 transition-colors flex items-center justify-center shrink-0"
                                              >
                                                <Scale className="w-4 h-4" />
                                              </button>
                                            )}
                                            <div className="relative flex-1">
                                                <input 
                                                  type="number"
                                                  min="0"
                                                  step="0.001"
                                                  value={item.quantidade}
                                                  onChange={e => updateManualItem(item.id, 'quantidade', e.target.value)}
                                                  className="w-full h-9 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg px-3 text-sm font-semibold text-zinc-100 focus:border-amber-500/50 outline-none transition-colors text-right tabular-nums pr-8"
                                                  placeholder="0"
                                                />
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-zinc-500 uppercase pointer-events-none">
                                                   {item.unidade_saida}
                                                </div>
                                            </div>
                                         </div>
                                      </td>

                                      <td className="px-4 py-3 text-right">
                                         <p className="text-sm font-semibold text-zinc-100 tabular-nums">€ {precoFinalRow.toFixed(2)}</p>
                                         {precoFinalRow > 0 && <p className="text-[10px] text-zinc-500 font-medium">€ {precoUnitTabela.toFixed(2)} / {item.unidade_saida}</p>}
                                      </td>

                                      <td className="px-4 py-3 text-center pr-6">
                                         <button 
                                           onClick={() => removeManualItem(item.id)}
                                           className="w-9 h-9 bg-transparent text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors flex items-center justify-center mx-auto"
                                         >
                                           <Trash2 className="w-4 h-4" />
                                         </button>
                                      </td>
                                   </tr>
                                 );
                              })}
                           </tbody>
                        </table>
                      </div>
                    </div>
                    
                    <div>
                        <button onClick={addManualItem} className="text-xs font-semibold text-amber-500 hover:text-amber-400 flex items-center gap-1.5 transition-colors">
                           <Plus size={16} /> Adicionar Nova Linha
                        </button>
                    </div>

                    <div className="flex justify-end pt-4">
                      <button
                        onClick={handleManualExit}
                        disabled={loading}
                        className="w-full md:w-auto px-8 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold rounded-xl text-sm transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 active:scale-95"
                      >
                        <Send className="w-4 h-4" /> Confirmar Saída Manual
                      </button>
                    </div>
                  </div>
               )}
            </div>
          </motion.div>
      </AnimatePresence>
    </div>
  );
}

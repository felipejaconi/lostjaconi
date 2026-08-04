import React, { useState, useEffect } from "react";
import { Plus, Trash2, Save, FileText, Calendar, X, Receipt, Image as ImageIcon } from "lucide-react";
import Swal from "sweetalert2";
import api from "../../lib/api";
import { SearchableCombobox } from "../../components/ui/SearchableCombobox";
import { optimizeImage } from "../../lib/imageOptimization";
import { motion, AnimatePresence } from "motion/react";
import Decimal from "decimal.js";
import { BrandTitle } from "../../components/BrandTitle";
import { Modal } from "../../components/ui/Modal";
import AdminExpenseEntries from "./AdminExpenseEntries";

// Configuração profissional de precisão decimal (High Precision, HALF_UP rounding)
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export default function AdminStockEntries({ onSuccess }: { onSuccess?: () => void }) {
  const [products, setProducts] = useState<any[]>([]);
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [useNovaEntidade, setUseNovaEntidade] = useState(false);
  const [fornecedorExistente, setFornecedorExistente] = useState("");
  const [fornecedorNovo, setFornecedorNovo] = useState("");
  
  const [numeroFatura, setNumeroFatura] = useState("");
  const [dataFatura, setDataFatura] = useState(new Date().toISOString().split("T")[0]);
  const [dataVencimento, setDataVencimento] = useState("");
  
  const [isProductModalOpen, setProductModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [targetItemRowId, setTargetItemRowId] = useState<number | null>(null);
  const [newProductData, setNewProductData] = useState({
    nome: "",
    descricao: "",
    categoria_id: "",
    barcode_ean: "",
    pais_origem: "",
    unidade_base: "un",
    unidade_compra: "un",
    fator_conversao_compra: "1",
    is_peso_variavel: false
  });
  const [selectedProductFile, setSelectedProductFile] = useState<File | null>(null);

  const IVA_OPTIONS = [0, 6, 13, 23];

  const [items, setItems] = useState<any[]>([{ id: Date.now(), produto_id: "", quantidade: "", custo_unitario: "", total_liquido: "", iva: 23, fator_conversao: "", unidade_entrada: "un" }]);

  useEffect(() => {
    fetchData();
    const saved = localStorage.getItem('adminStockEntriesState');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.useNovaEntidade !== undefined) setUseNovaEntidade(parsed.useNovaEntidade);
        if (parsed.fornecedorExistente !== undefined) setFornecedorExistente(parsed.fornecedorExistente);
        if (parsed.fornecedorNovo !== undefined) setFornecedorNovo(parsed.fornecedorNovo);
        if (parsed.numeroFatura !== undefined) setNumeroFatura(parsed.numeroFatura);
        if (parsed.dataFatura !== undefined) setDataFatura(parsed.dataFatura);
        if (parsed.dataVencimento !== undefined) setDataVencimento(parsed.dataVencimento);
        if (parsed.items !== undefined) setItems(parsed.items);
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('adminStockEntriesState', JSON.stringify({
      useNovaEntidade, fornecedorExistente, fornecedorNovo, numeroFatura, dataFatura, dataVencimento, items
    }));
  }, [useNovaEntidade, fornecedorExistente, fornecedorNovo, numeroFatura, dataFatura, dataVencimento, items]);

  const fetchData = async () => {
    try {
      const [resProd, resForn, resCat] = await Promise.all([
        api.get("/produtos"),
        api.get("/admin/fornecedores"),
        api.get("/categorias")
      ]);
      setProducts(resProd.data);
      setFornecedores(resForn.data || []);
      setCategories(resCat.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = new FormData();
      Object.entries(newProductData).forEach(([key, value]) => {
        data.append(key, typeof value === 'boolean' ? value.toString() : value as string);
      });
      if (selectedProductFile) {
        data.append('imagem', selectedProductFile);
      }

      const res = await api.post("/produtos", data, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      const prodsRes = await api.get("/produtos");
      setProducts(prodsRes.data);

      if (targetItemRowId) {
         const addedId = (res.data as any)?.id || (prodsRes.data as any[]).find((p: any) => p.nome === newProductData.nome)?.id;
         if (addedId) updateItem(targetItemRowId, 'produto_id', addedId);
      }
      
      setProductModalOpen(false);
      setNewProductData({
        nome: "", descricao: "", categoria_id: "", barcode_ean: "", pais_origem: "", unidade_base: "un", unidade_compra: "un", fator_conversao_compra: "1", is_peso_variavel: false
      });
      setSelectedProductFile(null);
      Swal.fire({ title: "Sucesso", text: "Produto criado rapidamente!", icon: "success", timer: 1500, showConfirmButton: false });
    } catch (e: any) {
      Swal.fire("Erro", e.response?.data?.error || "Erro ao criar", "error");
    }
  };

  const addItem = () => {
    setItems([...items, { id: Date.now(), produto_id: "", quantidade: "", custo_unitario: "", total_liquido: "", iva: 23, fator_conversao: "", unidade_entrada: "un" }]);
  };

  const removeItem = (id: number) => {
    if (items.length === 1) return;
    setItems(items.filter(item => item.id !== id));
  };

  const safeDecimal = (val: any): Decimal | null => {
    if (val === null || val === undefined || val.toString().trim() === '') return null;
    try { return new Decimal(val); } catch (e) { return null; }
  };

  const updateItem = (id: number, field: string, value: any) => {
    setItems(items.map(item => {
       if (item.id === id) {
          const newItem = { ...item, [field]: value };
          
          if (field === 'produto_id') {
             const prod = products.find(p => p.id === value);
             if (prod) {
                newItem.fator_conversao = 1;
                newItem.unidade_entrada = prod.unidade_base || "un";
                if (prod.iva !== undefined) {
                   newItem.iva = prod.iva;
                }
             }
          } else if (field === 'unidade_entrada') {
             const prod = products.find(p => p.id === item.produto_id);
             if (prod) {
                newItem.fator_conversao = 1;
             }
          }

          // Strict Financial Architecture
          const q = safeDecimal(newItem.quantidade);
          const cu = safeDecimal(newItem.custo_unitario);
          const tl = safeDecimal(newItem.total_liquido);

          if (field === 'quantidade') {
             if (tl !== null && q !== null && !q.isZero()) {
                // Priority: Total Líquido -> derive Custo Unitário (up to 6 decimals)
                newItem.custo_unitario = tl.div(q).toDecimalPlaces(6, Decimal.ROUND_HALF_UP).toString();
             } else if (cu !== null && q !== null) {
                // Derived Total Líquido
                newItem.total_liquido = cu.mul(q).toDecimalPlaces(4, Decimal.ROUND_HALF_UP).toString();
             }
          } else if (field === 'custo_unitario') {
             if (cu !== null && q !== null) {
                newItem.total_liquido = cu.mul(q).toDecimalPlaces(4, Decimal.ROUND_HALF_UP).toString();
             } else if (value === "") {
                newItem.total_liquido = "";
             }
          } else if (field === 'total_liquido') {
             if (tl !== null && q !== null && !q.isZero()) {
                newItem.custo_unitario = tl.div(q).toDecimalPlaces(6, Decimal.ROUND_HALF_UP).toString();
             } else if (value === "") {
                // Se apagar o total líquido, apagamos o custo unitário para não gerar estado inconsistente.
                newItem.custo_unitario = ""; 
             }
          }

          return newItem;
       }
       return item;
    }));
  };

  const getCalculations = () => {
    let valorLiquido = new Decimal(0);
    let creditoIva = new Decimal(0);

    items.forEach(item => {
       const q = safeDecimal(item.quantidade);
       const c = safeDecimal(item.custo_unitario);
       const tl = safeDecimal(item.total_liquido);
       
       let liqItem = new Decimal(0);
       
       // Priority on User Defined Total Liquido (Invoice source of truth)
       if (tl !== null) {
          liqItem = tl;
       } else if (q !== null && c !== null) {
          liqItem = q.mul(c);
       }
       
       const iva = safeDecimal(item.iva) || new Decimal(0);
       // Internal IVA calculation preserves precision, rounded to 2 decimals visually later
       const ivaItem = liqItem.mul(iva).div(100);

       valorLiquido = valorLiquido.add(liqItem);
       creditoIva = creditoIva.add(ivaItem);
    });

    const valorFinal = valorLiquido.add(creditoIva);
    
    return { 
       valorLiquido: valorLiquido.toNumber(), 
       creditoIva: creditoIva.toNumber(), 
       valorFinal: valorFinal.toNumber(),
       valorLiquidoRaw: valorLiquido,
       creditoIvaRaw: creditoIva,
       valorFinalRaw: valorFinal
    };
  };

  const { valorLiquido, creditoIva, valorFinal } = getCalculations();

  const handleConfirm = async () => {
    const fornecedorFinal = useNovaEntidade ? fornecedorNovo : fornecedorExistente;

    if (!fornecedorFinal || !numeroFatura || !dataFatura || !dataVencimento) {
      Swal.fire("Atenção", "Preencha todos os dados da fatura (Fornecedor, Número, Data e Vencimento).", "warning");
      return;
    }

    const validItems = items.filter(it => it.produto_id && Number(it.quantidade) > 0);
    if (validItems.length === 0) {
      Swal.fire("Aviso", "Adicione pelo menos um produto com quantidade preenchida.", "warning");
      return;
    }

    setIsProcessing(true);
    try {
       // Usar cálculos exatos da arquitetura Decimal para o envio à base de dados
       const { valorLiquidoRaw, creditoIvaRaw, valorFinalRaw } = getCalculations();

      const payload = {
         fornecedor: fornecedorFinal,
         numero_fatura: numeroFatura,
         data: dataFatura,
         data_vencimento: dataVencimento,
         // Valores gravados com a máxima precisão permitida pela API
         valor_liquido: valorLiquidoRaw.toNumber(),
         credito_iva: creditoIvaRaw.toNumber(),
         valor_final: valorFinalRaw.toNumber(),
         items: validItems.map(it => {
            const q = safeDecimal(it.quantidade) || new Decimal(0);
            const c = safeDecimal(it.custo_unitario) || new Decimal(0);
            const tl = safeDecimal(it.total_liquido);
            const liq = tl !== null ? tl : q.mul(c);
            const ivaPerc = safeDecimal(it.iva) || new Decimal(0);
            const ivaVal = liq.mul(ivaPerc).div(100);
            
            return {
               produto_id: it.produto_id,
               quantidade: q.toNumber(),
               custo_unitario: c.toNumber(), 
               iva: ivaPerc.toNumber(),
               valor_liquido: liq.toNumber(),
               valor_iva: ivaVal.toNumber(),
               valor_total: liq.add(ivaVal).toNumber(),
               fator_conversao: safeDecimal(it.fator_conversao)?.toNumber() || 1,
               unidade_entrada: it.unidade_entrada || "un"
            };
         })
      };

      await api.post("/stock/entrada-manual", payload);
      Swal.fire("Sucesso", "Fatura registada e stock atualizado com sucesso!", "success");
      
      localStorage.removeItem('adminStockEntriesState');
      setFornecedorExistente("");
      setFornecedorNovo("");
      setNumeroFatura("");
      setDataFatura(new Date().toISOString().split("T")[0]);
      setDataVencimento("");
      setItems([{ id: Date.now(), produto_id: "", quantidade: "", custo_unitario: "", total_liquido: "", iva: 23, fator_conversao: "", unidade_entrada: "un" }]);
      
      if (onSuccess) onSuccess();
      
    } catch (e: any) {
      Swal.fire("Erro", e.response?.data?.error || e.response?.data?.message || "Erro ao registar fatura", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className=" pt-2 md:pt-4 pb-32 ">

      <Modal isOpen={isExpenseModalOpen} onClose={() => setIsExpenseModalOpen(false)} maxWidth="2xl">
        <AdminExpenseEntries compact={true} onSuccess={() => setIsExpenseModalOpen(false)} />
      </Modal>

      <div className="sticky top-0 z-40 bg-[#050505] pt-2 md:pt-4 pb-4 -mt-2 md:-mt-4 mb-10 w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4 max-w-full">
        <BrandTitle title="Registro de Faturas" titleClassName="-mt-7 pl-0 pt-0 ml-0" hideUnderline />
        <button onClick={() => setIsExpenseModalOpen(true)} className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 -mt-6 sm:mt-0 shadow-sm">
           <Receipt size={16} />
           Registrar Despesa
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10 w-full">
        
        {/* Main Content Area */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Invoice Details Section */}
          <section className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 lg:p-8">
            <h2 className="text-lg font-medium text-zinc-100 mb-6 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-zinc-400" />
              Detalhes da Fatura
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">Fornecedor</label>
                  <button 
                    onClick={() => setUseNovaEntidade(!useNovaEntidade)}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                  >
                    {useNovaEntidade ? "Selecionar Existente" : "+ Novo Fornecedor"}
                  </button>
                </div>
                {!useNovaEntidade ? (
                  <SearchableCombobox
                    options={fornecedores}
                    value={fornecedorExistente}
                    onChange={(val) => setFornecedorExistente(val)}
                    placeholder="Pesquisar fornecedor..."
                    labelKey="nome"
                    valueKey="id"
                  />
                ) : (
                  <input 
                    type="text" 
                    value={fornecedorNovo}
                    onChange={e => setFornecedorNovo(e.target.value)}
                    placeholder="Nome do novo fornecedor"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all placeholder:text-zinc-600"
                  />
                )}
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">Nº da Fatura</label>
                <input 
                  type="text" 
                  value={numeroFatura}
                  onChange={e => setNumeroFatura(e.target.value)}
                  placeholder="Ex: FT 2026/01"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all placeholder:text-zinc-600"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">Data de Entrada</label>
                <input 
                  type="date" 
                  value={dataFatura}
                  onChange={e => setDataFatura(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all [color-scheme:dark]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">Data de Vencimento</label>
                <input 
                  type="date" 
                  value={dataVencimento}
                  onChange={e => setDataVencimento(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all [color-scheme:dark]"
                />
              </div>
            </div>
          </section>

          {/* Products Section */}
          <section className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 lg:p-8">
             <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-medium text-zinc-100 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-zinc-400" />
                  Produtos da Fatura
                </h2>
                <button 
                  onClick={addItem} 
                  className="text-sm font-medium text-zinc-900 bg-zinc-100 hover:bg-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Adicionar
                </button>
             </div>

             <div className="space-y-4">
                {items.map((item, index) => {
                  const objProd = products.find(p => p.id === item.produto_id);
                  
                  const q = safeDecimal(item.quantidade);
                  const c = safeDecimal(item.custo_unitario);
                  const tl = safeDecimal(item.total_liquido);

                  let curLiq = new Decimal(0);
                  if (tl !== null) {
                     curLiq = tl;
                  } else if (q !== null && c !== null) {
                     curLiq = q.mul(c);
                  }

                  const ivaPerc = safeDecimal(item.iva) || new Decimal(0);
                  const curIva = curLiq.mul(ivaPerc).div(100);
                  const curTotal = curLiq.add(curIva);

                  return (
                    <div key={item.id} className="group relative bg-zinc-950 border border-zinc-800 rounded-xl p-5 transition-colors hover:border-zinc-700">
                      
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                        <div className="md:col-span-12 lg:col-span-5">
                          <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2 block">Produto</label>
                          <div className="relative z-20">
                            <SearchableCombobox
                              options={products}
                              value={item.produto_id}
                              onChange={val => updateItem(item.id, 'produto_id', val)}
                              placeholder="Pesquisar produto..."
                              labelKey="nome"
                              valueKey="id"
                              onAddNew={() => {
                                setTargetItemRowId(item.id);
                                setProductModalOpen(true);
                              }}
                              renderOption={(opt) => (
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-zinc-100 text-sm font-medium">{opt.nome}</span>
                                  <span className="text-[11px] text-zinc-500">
                                    {opt.barcode_ean ? `EAN: ${opt.barcode_ean}` : 'S/ EAN'} • {opt.categoria_nome || 'Sem Cat.'}
                                  </span>
                                </div>
                              )}
                            />
                          </div>
                        </div>

                        <div className="md:col-span-4 lg:col-span-2 space-y-2">
                           <div className="flex justify-between items-center">
                            <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Qtd</label>
                            <span className="text-[10px] font-bold text-emerald-400 uppercase">
                              {(() => {
                                const p = products.find(prod => prod.id === item.produto_id);
                                return p?.unidade_base || 'UN';
                              })()}
                            </span>
                           </div>
                           <input 
                              type="number" min="0.001" step="0.001"
                              value={item.quantidade}
                              onChange={e => updateItem(item.id, 'quantidade', e.target.value)}
                              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500/50 outline-none transition-colors"
                              placeholder="0"
                            />
                        </div>

                        <div className="md:col-span-4 lg:col-span-2 space-y-2">
                           <div className="flex justify-between items-center">
                              <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Total Líq.</label>
                           </div>
                           <div className="relative group/input">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500 text-sm font-medium z-10 transition-colors group-hover/input:text-emerald-400">€</span>
                              <input 
                                type="number" min="0" step="0.0001"
                                value={item.total_liquido ?? ''}
                                onChange={e => updateItem(item.id, 'total_liquido', e.target.value)}
                                className="w-full bg-emerald-500/5 border border-emerald-500/30 rounded-lg pl-7 pr-3 py-2 text-sm text-emerald-50 font-medium focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 outline-none transition-all placeholder:text-emerald-900/30"
                                placeholder="0.00"
                              />
                           </div>
                        </div>

                        <div className="md:col-span-4 lg:col-span-3 space-y-2">
                           <div className="flex justify-between items-center">
                              <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Custo Un.</label>
                              {objProd?.preco_custo > 0 && (
                                 <span className="text-[10px] font-bold text-blue-400">Último: €{Number(objProd.preco_custo).toFixed(2)}</span>
                              )}
                           </div>
                           <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">€</span>
                              <input 
                                type="number" min="0" step="0.0001"
                                value={item.custo_unitario}
                                onChange={e => updateItem(item.id, 'custo_unitario', e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-7 pr-3 py-2 text-sm text-zinc-100 focus:border-emerald-500/50 outline-none transition-colors"
                                placeholder="0.00"
                              />
                           </div>
                        </div>

                        <div className="md:col-span-4 lg:col-span-2 space-y-2">
                           <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block">IVA</label>
                           <select
                              value={item.iva}
                              onChange={e => updateItem(item.id, 'iva', e.target.value)}
                              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500/50 outline-none transition-colors"
                            >
                              {IVA_OPTIONS.map(v => (
                                <option key={v} value={v}>{v}%</option>
                              ))}
                            </select>
                        </div>
                      </div>

                      {/* Line Summary */}
                      <div className="mt-4 pt-4 border-t border-zinc-800/50 flex flex-wrap gap-4 items-center justify-between">
                         <div className="flex items-center gap-4 text-xs">
                           <div className="flex items-center gap-1.5">
                             <span className="text-zinc-500">Líquido:</span>
                             <span className="text-zinc-300 font-medium">€{curLiq.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toString()}</span>
                           </div>
                           <div className="flex items-center gap-1.5">
                             <span className="text-zinc-500">IVA:</span>
                             <span className="text-zinc-300 font-medium">€{curIva.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toString()}</span>
                           </div>
                         </div>
                         
                         <div className="flex items-center justify-end gap-4 w-full md:w-auto">
                           <div className="text-sm font-semibold text-emerald-400 bg-emerald-400/10 px-3 py-1.5 rounded-md border border-emerald-400/20">
                             Total: €{curTotal.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toString()}
                           </div>
                           {items.length > 1 && (
                             <button 
                               onClick={() => removeItem(item.id)}
                               className="bg-zinc-800 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 p-2 rounded-md transition-colors border border-zinc-700/50 hover:border-red-500/30"
                               title="Remover Item"
                             >
                               <Trash2 className="w-4 h-4" />
                             </button>
                           )}
                         </div>
                      </div>

                    </div>
                  )
                })}
             </div>
          </section>

        </div>

        {/* Sidebar Summary */}
        <div className="lg:col-span-4 z-10 w-full relative">
          <div className="sticky top-8 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 lg:p-8 flex flex-col gap-6 w-full shadow-2xl">
            <h3 className="text-lg font-medium text-zinc-100 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-zinc-400" /> Resumo
            </h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-zinc-800/50">
                <span className="text-zinc-400 text-sm">Valor Líquido</span>
                <span className="text-zinc-100 font-medium">€ {getCalculations().valorLiquidoRaw.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber().toLocaleString('pt-PT', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-zinc-800/50">
                <span className="text-zinc-400 text-sm">IVA (Crédito)</span>
                <span className="text-emerald-400/90 font-medium">€ {getCalculations().creditoIvaRaw.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber().toLocaleString('pt-PT', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-zinc-100 font-semibold text-base">Total Fatura</span>
                <span className="text-emerald-400 font-semibold text-xl tracking-tight">€ {getCalculations().valorFinalRaw.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber().toLocaleString('pt-PT', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
              </div>
            </div>

            <button
              onClick={handleConfirm}
              disabled={isProcessing}
              className="mt-4 w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold py-3.5 px-4 rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <img src={`${import.meta.env.VITE_SUPABASE_URL || "https://ybaoaskddcmwoincsnwm.supabase.co"}/storage/v1/object/public/uploads/icon.png`} alt="Carregando..." className="w-5 h-5 animate-spin opacity-80" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              {isProcessing ? 'A Processar...' : 'Registar Fatura'}
            </button>
          </div>
        </div>

      </div>

      {/* Product Modal */}
      <AnimatePresence>
        {isProductModalOpen && (
          <motion.div 
            key="product-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 pb-20 sm:pb-6">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setProductModalOpen(false)}
              className="absolute inset-0 bg-zinc-950/80 "
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-full"
            >
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-lg font-medium text-zinc-100">Criar Novo Produto</h2>
                  <p className="text-[13px] text-zinc-500 mt-1">Configuração rápida de produto para entrada de armazém.</p>
                </div>
                <button
                  onClick={() => setProductModalOpen(false)}
                  className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto no-scrollbar">
                <form id="create-product-form" onSubmit={handleCreateProduct} className="space-y-6">
                  <div className="space-y-4">
                     <div>
                       <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Nome do Produto *</label>
                       <input
                         type="text" required value={newProductData.nome}
                         onChange={(e) => setNewProductData({ ...newProductData, nome: e.target.value })}
                         className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:border-emerald-500/50 outline-none transition-all"
                         placeholder="Ex: Arroz Agulha 1kg"
                       />
                     </div>

                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       <div>
                         <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Categoria *</label>
                         <select required value={newProductData.categoria_id} onChange={(e) => setNewProductData({ ...newProductData, categoria_id: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:border-emerald-500/50 outline-none transition-all">
                           <option value="">Selecionar...</option>
                           {categories.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                         </select>
                       </div>
                       <div>
                         <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Código Barras (EAN)</label>
                         <input type="text" value={newProductData.barcode_ean} onChange={(e) => setNewProductData({ ...newProductData, barcode_ean: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:border-emerald-500/50 outline-none transition-all" placeholder="Opcional" />
                       </div>
                     </div>

                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                       <div>
                         <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Un. Base (Stock / Compra / Venda)</label>
                         <select required value={newProductData.unidade_base} onChange={(e) => {
                           const val = e.target.value;
                           setNewProductData({ 
                              ...newProductData, 
                              unidade_base: val,
                              unidade_compra: val,
                              fator_conversao_compra: "1",
                              is_peso_variavel: val === 'kg'
                           });
                         }} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-100 focus:border-emerald-500/50 outline-none transition-all uppercase">
                           <option value="un">UN</option>
                           <option value="cx">CX</option>
                           <option value="pack">PK</option>
                           <option value="kg">KG</option>
                           <option value="lt">LT</option>
                         </select>
                       </div>
                       <div className="flex items-end pb-1">
                         <label className="flex items-center gap-3 bg-zinc-950 p-2.5 w-full rounded-xl border border-zinc-800 cursor-pointer hover:border-zinc-700 transition-colors">
                           <input 
                             type="checkbox" 
                             checked={newProductData.is_peso_variavel} 
                             onChange={(e) => setNewProductData({ ...newProductData, is_peso_variavel: e.target.checked })} 
                             className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500/50 focus:ring-offset-zinc-950" 
                           />
                           <span className="text-sm font-medium text-zinc-300">Peso Variável</span>
                         </label>
                       </div>
                     </div>

                     <div className="grid grid-cols-1 gap-4">
                        <div>
                         <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block mb-2">País de Origem</label>
                         <input type="text" value={newProductData.pais_origem} onChange={(e) => setNewProductData({ ...newProductData, pais_origem: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:border-emerald-500/50 outline-none transition-all" placeholder="Opcional" />
                        </div>
                     </div>

                     <div>
                        <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Imagem</label>
                        <div className="relative flex items-center justify-center w-full min-h-[100px] border-2 border-dashed border-zinc-800 rounded-xl hover:border-zinc-700 hover:bg-zinc-800/20 transition-colors cursor-pointer overflow-hidden group">
                          <input type="file" accept="image/*" onChange={async (e) => { const file = e.target.files?.[0]; if (file) { const optimized = await optimizeImage(file); setSelectedProductFile(optimized); } else { setSelectedProductFile(null); } }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                          <div className="flex flex-col items-center gap-2 text-zinc-500 group-hover:text-zinc-400">
                            <ImageIcon className="w-6 h-6" />
                            <span className="text-sm font-medium">
                              {selectedProductFile ? selectedProductFile.name : "Clique ou arraste uma imagem"}
                            </span>
                          </div>
                        </div>
                     </div>
                  </div>
                </form>
              </div>

              <div className="p-6 border-t border-zinc-800 bg-zinc-900/50 shrink-0 flex justify-end gap-3">
                 <button type="button" onClick={() => setProductModalOpen(false)} className="px-5 py-2.5 text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors">
                   Cancelar
                 </button>
                 <button type="submit" form="create-product-form" className="px-6 py-2.5 text-sm font-medium text-zinc-950 bg-emerald-500 hover:bg-emerald-400 rounded-xl transition-colors active:scale-95 shadow-lg shadow-emerald-500/20">
                   Criar Produto
                 </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

import React, { useState, useEffect, useMemo } from "react";
import api from "../../lib/api";
import { Search, Loader2, Map as MapIcon, Package, Filter, LayoutGrid } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Product {
  id: string;
  nome: string;
  estoque: number;
  stock_armazem?: number;
  imagem_url?: string;
  estoque_minimo?: number;
  lotes?: Array<{
    lote?: string;
    rua?: string;
    prateleira?: string;
    quantidade?: number;
  }>;
}

export default function AdminWarehouseMap() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await api.get("/produtos");
      setProducts(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const mapData = useMemo(() => {
    // Structure: Record<Rua, Record<Prateleira, Product[]>>
    const layout: Record<string, Record<string, Array<{ product: Product, loteName: string, quantity: number }>>> = {};
    const semLocalizacao: Array<{ product: Product, quantity: number }> = [];

    products.forEach(p => {
      // Apply search filter
      if (searchTerm && !p.nome.toLowerCase().includes(searchTerm.toLowerCase())) return;

      if (!p.lotes || p.lotes.length === 0) {
        semLocalizacao.push({ product: p, quantity: p.stock_armazem ?? p.estoque ?? 0 });
        return;
      }

      let hasValidLocation = false;
      p.lotes.forEach(lote => {
        const rua = lote.rua?.trim() || "";
        const prat = lote.prateleira?.trim() || "";
        const lname = lote.lote?.trim() || "Sem Lote";
        
        if (!rua && !prat) return; // will handle below
        
        hasValidLocation = true;
        const groupRua = rua || "Sem Rua";
        const groupPrat = prat || "Sem Prat";

        if (!layout[groupRua]) layout[groupRua] = {};
        if (!layout[groupRua][groupPrat]) layout[groupRua][groupPrat] = [];

        layout[groupRua][groupPrat].push({
          product: p,
          loteName: lname,
          quantity: p.stock_armazem ?? p.estoque ?? 0
        });
      });

      if (!hasValidLocation) {
        semLocalizacao.push({ product: p, quantity: p.stock_armazem ?? p.estoque ?? 0 });
      }
    });

    return { layout, semLocalizacao };
  }, [products, searchTerm]);

  const getProductColor = (quantity: number, minStock?: number) => {
    const min = minStock || 10; // default threshold
    if (quantity <= 0) return "bg-red-500 border-red-400 text-red-100 shadow-[0_0_10px_rgba(239,68,68,0.5)]";
    if (quantity <= min) return "bg-yellow-500 border-yellow-400 text-yellow-950 shadow-[0_0_10px_rgba(234,179,8,0.5)]";
    return "bg-emerald-500 border-emerald-400 text-emerald-950 shadow-[0_0_10px_rgba(16,185,129,0.5)]";
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
        <p className="text-zinc-400 animate-pulse font-medium">A carregar mapa do armazém...</p>
      </div>
    );
  }

  // Sort ruas
  const ruas = Object.keys(mapData.layout).sort((a, b) => a.localeCompare(b));

  return (
    <div className="pt-2 px-4 md:pt-4 md:px-6 lg:px-8 pb-32">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-zinc-800 pb-6 mb-8">
        <div>
          <h1 className="text-3xl lg:text-4xl font-semibold text-zinc-100 tracking-tight flex items-center gap-3">
             <MapIcon className="w-8 h-8 text-blue-500" />
             Mapa do Armazém
           </h1>
          <p className="text-sm text-zinc-400 font-medium mt-2">Visão geral da localização e status de estoque</p>
        </div>
        <div className="flex gap-3">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={16} className="text-zinc-500 group-focus-within:text-blue-500 transition-colors" />
              </div>
              <input
                type="text"
                placeholder="Buscar produto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-64 pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-100 focus:outline-none focus:border-blue-500 transition-all placeholder:text-zinc-600"
              />
            </div>
        </div>
      </div>

      <div className="flex gap-4 mb-6 text-xs font-bold uppercase tracking-widest text-zinc-400">
          <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
              <span>Bom Estoque</span>
          </div>
          <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]"></div>
              <span>Estoque Baixo</span>
          </div>
          <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
              <span>Sem Estoque (0)</span>
          </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {ruas.length === 0 && mapData.semLocalizacao.length === 0 ? (
           <div className="text-center py-12 bg-zinc-900/50 rounded-2xl border border-zinc-800/80">
              <LayoutGrid size={48} className="mx-auto text-zinc-700 mb-4" />
              <p className="text-zinc-400 font-medium">Nenhum produto encontrado com os filtros atuais.</p>
           </div>
        ) : (
          ruas.map(rua => {
            const prateleiras = Object.keys(mapData.layout[rua]).sort((a, b) => a.localeCompare(b));
            return (
              <div key={rua} className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-sm">
                <h3 className="text-2xl font-bold text-zinc-100 mb-6 flex items-center gap-2">
                    <span className="text-blue-500">Rua</span> {rua}
                </h3>
                
                <div className="flex flex-col gap-6">
                  {prateleiras.map(prat => {
                    const items = mapData.layout[rua][prat];
                    return (
                      <div key={prat} className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4">
                        <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">
                          Prateleira {prat}
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {items.map((item, idx) => {
                            const colorClass = getProductColor(item.quantity, item.product.estoque_minimo);
                            return (
                              <div 
                                key={idx} 
                                className={`w-10 h-10 rounded-lg border flex items-center justify-center p-px relative group cursor-pointer z-10 hover:z-[100] ${colorClass}`}
                              >
                                {item.product.imagem_url ? (
                                  <img src={item.product.imagem_url} alt={item.product.nome} className="w-full h-full object-cover rounded-md transition-all duration-300 group-hover:scale-[3.5] group-hover:shadow-[0_0_20px_rgba(0,0,0,0.8)] relative z-10" />
                                ) : (
                                  <Package size={16} className="opacity-80 transition-transform duration-300 group-hover:scale-[2.5] relative z-10" />
                                )}
                                
                                {/* Tooltip on Hover */}
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-10 w-56 bg-zinc-900 text-zinc-100 text-xs p-3 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 scale-95 group-hover:scale-105 shadow-[0_10px_40px_rgba(0,0,0,0.8)] border border-zinc-700 z-[110] flex flex-col gap-1">
                                   <p className="font-bold text-[13px] line-clamp-2 leading-tight">{item.product.nome}</p>
                                   <div className="mt-1 flex justify-between text-zinc-300 items-end">
                                      <span>Estoque: <strong className="text-white text-sm">{item.quantity}</strong></span>
                                      <span className="text-[10px]">Lote: <strong className="text-white">{item.loteName}</strong></span>
                                   </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}

        {mapData.semLocalizacao.length > 0 && (
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-sm">
                <h3 className="text-xl font-bold text-zinc-500 mb-6">
                    Sem Localização Definida
                </h3>
                <div className="flex flex-wrap gap-2">
                    {mapData.semLocalizacao.map((item, idx) => {
                        const colorClass = getProductColor(item.quantity, item.product.estoque_minimo);
                        return (
                          <div 
                            key={idx} 
                            className={`w-10 h-10 rounded-lg border flex items-center justify-center p-px relative group cursor-pointer z-10 hover:z-[100] ${colorClass}`}
                          >
                            {item.product.imagem_url ? (
                              <img src={item.product.imagem_url} alt={item.product.nome} className="w-full h-full object-cover rounded-md transition-all duration-300 group-hover:scale-[3.5] group-hover:shadow-[0_0_20px_rgba(0,0,0,0.8)] relative z-10" />
                            ) : (
                              <Package size={16} className="opacity-80 transition-transform duration-300 group-hover:scale-[2.5] relative z-10" />
                            )}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-10 w-56 bg-zinc-900 text-zinc-100 text-xs p-3 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 scale-95 group-hover:scale-105 shadow-[0_10px_40px_rgba(0,0,0,0.8)] border border-zinc-700 z-[110] flex flex-col gap-1">
                               <p className="font-bold text-[13px] line-clamp-2 leading-tight">{item.product.nome}</p>
                               <div className="mt-1 text-zinc-300">
                                  <span>Estoque: <strong className="text-white text-sm">{item.quantity}</strong></span>
                               </div>
                            </div>
                          </div>
                        );
                    })}
                </div>
            </div>
        )}
      </div>
    </div>
  );
}

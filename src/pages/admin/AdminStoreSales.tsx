
import React, { useState, useEffect } from "react";
import { BrandTitle } from "../../components/BrandTitle";
import { ContentViewport } from "../../components/layout/ContentViewport";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/Table";
import api from "../../lib/api";
import { Store, TrendingUp, AlertCircle, RefreshCw, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import Swal from "sweetalert2";

export default function AdminStoreSales() {
  const [consumoData, setConsumoData] = useState<any[]>([]);
  const [vendas, setVendas] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    d.setDate(1); // Set to start of month to avoid issues
    return d;
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const month = selectedDate.getMonth();
      const year = selectedDate.getFullYear();
      
      const [resConsumo, resVendas] = await Promise.all([
        api.get(`/admin/analytics/consumo?month=${month}&year=${year}`),
        api.get(`/admin/vendas_lojas?month=${month}&year=${year}`)
      ]);
      setConsumoData(resConsumo.data || []);
      setVendas(resVendas.data || {});
    } catch (err) {
      console.error(err);
      Swal.fire("Erro", "Falha ao carregar dados", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedDate]);



  const formatCurrency = (val: number) => {
    const num = Number(val) || 0;
    return num.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  
  const changeMonth = (offset: number) => {
    setSelectedDate(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + offset);
      return d;
    });
  };
  
  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];
  const displayMonth = `${monthNames[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;

  return (
    <ContentViewport>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <div>
          <BrandTitle title="Consumos" hideUnderline titleClassName="max-md:mt-0 md:-mt-4 max-md:pl-0 max-md:pt-0 max-md:ml-0 !mb-1" />
          <p className="text-zinc-400 text-sm">Controle avançado: cruze as vendas registadas com os pedidos (consumo) das lojas.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          <div className="flex items-center bg-zinc-950/80 backdrop-blur-md border border-white/10 rounded-xl p-1 shadow-lg shadow-black/50">
            <button 
              onClick={() => changeMonth(-1)}
              className="p-2 hover:bg-white/10 active:bg-white/5 rounded-lg text-zinc-400 hover:text-emerald-400 transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 group"
            >
              <ChevronLeft size={18} className="transition-transform group-hover:-translate-x-0.5" />
            </button>
            <div className="flex items-center gap-2 px-4 py-1.5 font-bold text-zinc-100 min-w-[150px] justify-center">
              <Calendar size={16} className="text-emerald-500" />
              {displayMonth}
            </div>
            <button 
              onClick={() => changeMonth(1)}
              className="p-2 hover:bg-white/10 active:bg-white/5 rounded-lg text-zinc-400 hover:text-emerald-400 transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 group"
            >
              <ChevronRight size={18} className="transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
          
          
        </div>
      </div>

      <div className="bg-[#111111] border border-white/5 rounded-2xl overflow-hidden shadow-2xl relative min-h-[400px]">
        {loading && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-10">
            <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
          </div>
        )}
        
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-black/40 border-b border-white/5">
              <TableRow className="hover:bg-transparent border-none">
                <TableHead className="text-zinc-500 font-bold uppercase tracking-wider text-xs">Loja</TableHead>
                <TableHead className="text-zinc-500 font-bold uppercase tracking-wider text-xs">Consumo (Mês)</TableHead>
                <TableHead className="text-zinc-500 font-bold uppercase tracking-wider text-xs">Despesas (Mês)</TableHead>
                <TableHead className="text-zinc-500 font-bold uppercase tracking-wider text-xs">Vendas (Mês)</TableHead>
                <TableHead className="text-zinc-500 font-bold uppercase tracking-wider text-xs">% Custo (Food Cost + Desp.)</TableHead>
                <TableHead className="text-zinc-500 font-bold uppercase tracking-wider text-xs">Margem Bruta</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {consumoData.length === 0 && !loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-zinc-500">Nenhum dado de consumo encontrado para este mês.</TableCell>
                </TableRow>
              ) : (
                consumoData.map(loja => {
                  const consumo = Number(loja.mensal || 0);
                  const despesas = Number(loja.despesasMensal || 0);
                  const venda = vendas[loja.id] || 0;
                  const custoTotal = consumo + despesas;
                  const cmv = venda > 0 ? (custoTotal / venda) * 100 : 0;
                  const isHighCost = cmv > 50 && venda > 0;
                  const isWarning = cmv > 40 && cmv <= 50 && venda > 0;
                  
                  return (
                    <TableRow key={loja.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                            <Store size={14} className="text-blue-500" />
                          </div>
                          <div>
                            <p className="font-bold text-zinc-100">{loja.name}</p>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{loja.numPedidos} pedidos em {monthNames[selectedDate.getMonth()]}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-orange-400">
                        €{formatCurrency(consumo)}
                      </TableCell>
                      <TableCell className="font-medium text-red-400">
                        €{formatCurrency(despesas)}
                      </TableCell>
                      <TableCell>
                        <div className="font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg inline-block min-w-[120px]">
                          €{formatCurrency(venda)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1.5 ${
                            venda === 0 ? 'bg-zinc-800/50 text-zinc-500' :
                            isHighCost ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                            isWarning ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                            'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}>
                            {venda > 0 ? (
                              <>
                                {isHighCost && <AlertCircle size={12} />}
                                {cmv.toFixed(1)}%
                              </>
                            ) : '-'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {venda > 0 ? (
                          <div className={`flex items-center gap-2 font-medium ${venda - custoTotal >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            <TrendingUp size={14} className={venda - custoTotal < 0 ? 'rotate-180' : ''} />
                            €{formatCurrency(venda - custoTotal)}
                          </div>
                        ) : (
                          <span className="text-zinc-600">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
              {consumoData.length > 0 && !loading && (
                <TableRow className="bg-black/20 hover:bg-black/30 border-t-2 border-white/10">
                  <TableCell className="text-right font-bold text-zinc-100 uppercase tracking-widest text-xs pr-6">
                    Total
                  </TableCell>
                  <TableCell className="font-bold text-orange-400">
                    €{formatCurrency(consumoData.reduce((acc, l) => acc + Number(l.mensal || 0), 0))}
                  </TableCell>
                  <TableCell className="font-bold text-red-400">
                    €{formatCurrency(consumoData.reduce((acc, l) => acc + Number(l.despesasMensal || 0), 0))}
                  </TableCell>
                  <TableCell className="font-bold text-emerald-400">
                    €{formatCurrency(consumoData.reduce((acc, l) => acc + (vendas[l.id] || 0), 0))}
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const tConsumo = consumoData.reduce((acc, l) => acc + Number(l.mensal || 0), 0);
                      const tDespesas = consumoData.reduce((acc, l) => acc + Number(l.despesasMensal || 0), 0);
                      const tVendas = consumoData.reduce((acc, l) => acc + (vendas[l.id] || 0), 0);
                      const tCusto = tConsumo + tDespesas;
                      const tCmv = tVendas > 0 ? (tCusto / tVendas) * 100 : 0;
                      return (
                        <div className="flex items-center gap-2 font-bold">
                          <span className={`${tCmv > 50 ? 'text-rose-500' : tCmv > 40 ? 'text-amber-500' : 'text-emerald-500'}`}>
                            {tCmv > 0 ? `${tCmv.toFixed(1)}%` : '-'}
                          </span>
                        </div>
                      );
                    })()}
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const tConsumo = consumoData.reduce((acc, l) => acc + Number(l.mensal || 0), 0);
                      const tDespesas = consumoData.reduce((acc, l) => acc + Number(l.despesasMensal || 0), 0);
                      const tVendas = consumoData.reduce((acc, l) => acc + (vendas[l.id] || 0), 0);
                      const tCusto = tConsumo + tDespesas;
                      const mg = tVendas - tCusto;
                      return (
                        <div className={`font-bold ${mg >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          €{formatCurrency(mg)}
                        </div>
                      );
                    })()}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </ContentViewport>
  );
}

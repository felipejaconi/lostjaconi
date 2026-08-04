import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../lib/api";
import { supabase } from "../../lib/supabase";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area 
} from "recharts";
import { ContentViewport } from "../../components/layout/ContentViewport";
import { DollarSign, TrendingUp, Package, Calendar, Target, BarChart2, Star, AlertTriangle, FileText, CheckCircle, Clock } from "lucide-react";
import { motion } from "motion/react";
import { OptimizedImage } from "../../components/OptimizedImage";

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}


function getPedidoTotalComIva(pedido: any): number {
  let sumSubtotal = 0;
  let sumIva = 0;
  (pedido.pedido_itens || []).forEach((item: any) => {
    const qty = Number(item.quantidade) || 0;
    const preco = Number(item.preco_unitario || 0);
    const ivaPerc = item.produto?.iva ? Number(item.produto.iva) / 100 : 0;
    const subtotal = qty * preco;
    const ivaVal = subtotal * ivaPerc;
    sumSubtotal += subtotal;
    sumIva += ivaVal;
  });
  if (pedido.pedido_itens && pedido.pedido_itens.length > 0) {
     return sumSubtotal + sumIva;
  }
  return Number(pedido.total) || 0;
}

export default function StoreManagement() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [stockLoja, setStockLoja] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    const fetchData = async () => {
      try {
        const [ordersRes, stockRes] = await Promise.all([
          api.get("/pedidos"),
          supabase.from("stock_loja").select("quantidade, produto:produtos(id, nome, preco, preco_custo, imagem_url)").eq("user_id", user.id)
        ]);
        
        setOrders(ordersRes.data || []);
        setStockLoja(stockRes.data || []);
      } catch (err) {
        console.error("Erro ao carregar dados da gerência:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // Filter by selected month and year
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Derived metrics
  const completedOrders = orders.filter(o => o.status === "concluido" || o.status === "entregue");
  
  const filteredCompletedOrders = completedOrders.filter(o => {
    const d = new Date(o.created_at);
    return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
  });

  let totalSpent = 0;
  filteredCompletedOrders.forEach(o => {
    totalSpent += getPedidoTotalComIva(o) || 0;
  });
  
  const avgOrderValue = filteredCompletedOrders.length > 0 ? totalSpent / filteredCompletedOrders.length : 0;
      

  // Low stock
  
  // Group orders by day of selected month for chart
  const today = new Date();
  
  // Create chart Map for all days of the selected month
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const maxDay = (selectedMonth === today.getMonth() && selectedYear === today.getFullYear()) ? today.getDate() : daysInMonth;
  
  const dailyDataMap: Record<string, { name: string, value: number }> = {};
  for (let i = 1; i <= maxDay; i++) {
    dailyDataMap[i.toString()] = { name: `Dia ${i}`, value: 0 };
  }

  filteredCompletedOrders.forEach(o => {
    const d = new Date(o.created_at);
    const day = d.getDate().toString();
    
    const orderTotalComIva = getPedidoTotalComIva(o) || 0;

    if (dailyDataMap[day]) {
      dailyDataMap[day].value += orderTotalComIva;
    }
  });

  const chartData = Object.values(dailyDataMap);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center pt-20">
        <img src={`${import.meta.env.VITE_SUPABASE_URL || "https://ybaoaskddcmwoincsnwm.supabase.co"}/storage/v1/object/public/uploads/icon.png`} alt="Carregando..." className="w-10 h-10 animate-spin opacity-80" />
      </div>
    );
  }

  return (
    <ContentViewport className="pt-2 sm:pt-4 px-4 sm:px-6 lg:px-8 space-y-6 sm:space-y-8 max-w-7xl mx-auto w-full pb-20">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div className="w-full text-center md:text-left flex flex-col md:flex-row md:items-center gap-4">
          <h1 
            className="text-3xl sm:text-4xl text-[#facc15] tracking-wide"
            style={{ 
              fontFamily: "'Yellowtail', cursive",
              textShadow: "2px 2px 4px rgba(0,0,0,0.5)"
            }}
          >
             A Gerência
          </h1>
          <div className="flex items-center gap-2 justify-center shrink-0">
            <select 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-[#0a0a0a] border border-white/10 text-white text-sm font-bold tracking-wider rounded-lg px-3 py-2 outline-none focus:border-[#facc15]/50 appearance-none text-center"
            >
              {['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'].map((m, i) => (
                <option key={i} value={i}>{m}</option>
              ))}
            </select>
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-[#0a0a0a] border border-white/10 text-white text-sm font-bold tracking-wider rounded-lg px-3 py-2 outline-none focus:border-[#facc15]/50 appearance-none text-center"
            >
              {[new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-[#0a0a0a] border border-white/10 p-5 rounded-2xl shadow-lg relative overflow-hidden group">
          <div className="flex items-center gap-4 relative z-10">
             <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center shrink-0">
               <DollarSign className="w-6 h-6 text-blue-500" />
             </div>
             <div>
               <p className="text-xs text-slate-500 uppercase tracking-widest font-black mb-1">Gasto Total</p>
               <h3 className="text-2xl font-bold text-white">€{totalSpent.toFixed(2)}</h3>
             </div>
          </div>
        </div>

        <div className="bg-[#0a0a0a] border border-white/10 p-5 rounded-2xl shadow-lg relative overflow-hidden group">
          <div className="flex items-center gap-4 relative z-10">
             <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center shrink-0">
               <TrendingUp className="w-6 h-6 text-emerald-500" />
             </div>
             <div>
               <p className="text-xs text-slate-500 uppercase tracking-widest font-black mb-1">Custo Médio/Pedido</p>
               <h3 className="text-2xl font-bold text-white">€{avgOrderValue.toFixed(2)}</h3>
             </div>
          </div>
        </div>

        <div className="bg-[#0a0a0a] border border-white/10 p-5 rounded-2xl shadow-lg relative overflow-hidden group">
          <div className="flex items-center gap-4 relative z-10">
             <div className="w-12 h-12 bg-orange-500/10 border border-orange-500/20 rounded-xl flex items-center justify-center shrink-0">
               <Calendar className="w-6 h-6 text-orange-500" />
             </div>
             <div>
               <p className="text-xs text-slate-500 uppercase tracking-widest font-black mb-1">Pedidos Feitos</p>
               <h3 className="text-2xl font-bold text-white">{filteredCompletedOrders.length}</h3>
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        
        {/* Chart */}
        <div className="bg-[#0a0a0a] rounded-2xl border border-white/10 shadow-2xl p-6 relative overflow-hidden">
          <div className="flex justify-between items-end mb-6">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <BarChart2 className="text-blue-500" size={20} /> Evolução de Gastos
              </h2>
            </div>
          </div>

          <div className="h-[300px] w-full">
            {chartData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-slate-500 text-sm">
                Nenhum dado disponível ainda.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSpent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    stroke="#52525b" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                    dy={10}
                  />
                  <YAxis 
                    stroke="#52525b" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(value) => `€${value}`}
                    dx={-10}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#18181b', 
                      borderColor: '#3f3f46',
                      borderRadius: '12px',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                    }}
                    itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                    formatter={(value: number) => [`€${value.toFixed(2)}`, 'Gasto']}
                    cursor={{ fill: '#27272a', opacity: 0.4 }}
                  />
                  <Bar 
                    dataKey="value" 
                    fill="url(#colorSpent)" 
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

        </div>

        {/* Faturas dos Pedidos */}
        <div className="bg-[#0a0a0a] rounded-2xl border border-white/10 shadow-2xl p-6 relative overflow-hidden">
          <div className="flex justify-between items-end mb-6">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <FileText className="text-blue-500" size={20} /> Faturas dos Pedidos
              </h2>
              <p className="text-sm text-zinc-400 mt-1">Acompanhe o estado de pagamento das suas faturas</p>
            </div>
          </div>
          
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left min-w-[700px]">
               <thead>
                  <tr className="bg-zinc-900/50 border-b border-zinc-800">
                     <th className="p-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Documento</th>
                     <th className="p-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Data</th>
                     <th className="p-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider text-right">Valor Total</th>
                     <th className="p-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider text-center">Estado de Pagamento</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-zinc-800/50">
                  {filteredCompletedOrders.length === 0 ? (
                     <tr>
                        <td colSpan={4} className="p-10 text-center">
                           <FileText className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                           <p className="text-zinc-400 font-medium text-sm">Nenhuma fatura encontrada neste mês.</p>
                        </td>
                     </tr>
                  ) : (
                     filteredCompletedOrders
                     .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                     .map(f => (
                        <tr key={f.id} className="hover:bg-zinc-800/30 transition-colors">
                           <td className="p-4">
                              <p className="text-sm font-bold text-zinc-100">Fatura #{f.id.split("-")[0].toUpperCase()}</p>
                           </td>
                           <td className="p-4">
                              <p className="text-[11px] text-zinc-400 flex items-center gap-1">
                                 <Calendar className="w-3 h-3" /> {new Date(f.created_at).toLocaleDateString("pt-PT")}
                              </p>
                           </td>
                           <td className="p-4 text-right">
                              <p className="text-sm font-black text-zinc-100">€{getPedidoTotalComIva(f).toFixed(2)}</p>
                           </td>
                           <td className="p-4 text-center">
                              <span className={cn(
                                "inline-flex px-2 py-1 border text-[10px] font-bold uppercase tracking-wider rounded items-center gap-1.5", 
                                f.status?.toLowerCase() === "concluido" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              )}>
                                 {f.status?.toLowerCase() === "concluido" ? (
                                   <><CheckCircle className="w-3 h-3" /> Paga</>
                                 ) : (
                                   <><Clock className="w-3 h-3" /> Pendente</>
                                 )}
                              </span>
                           </td>
                        </tr>
                     ))
                  )}
               </tbody>
            </table>
          </div>
        </div>

      </div>

    </ContentViewport>
  );
}

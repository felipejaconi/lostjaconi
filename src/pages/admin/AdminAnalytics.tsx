import React, { useState, useEffect, useMemo, useRef, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import {
  PieChart as PieChartIcon,
  TrendingUp,
  TrendingDown,
  BarChart2,
  Calendar,
  Store,
  DollarSign,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import Swal from "sweetalert2";
import api from "../../lib/api";
import { supabase } from "../../lib/supabase";
import { BrandTitle } from "../../components/BrandTitle";
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
import { motion } from "motion/react";
import { ContentViewport } from "../../components/layout/ContentViewport";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/Table";

const formatCurrency = (val: number | string) => {
  const num = Number(val) || 0;
  const parts = num.toFixed(2).split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return parts.join(".");
};

export default function AdminAnalytics() {
  const navigate = useNavigate();
  const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

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



  const fetchAnalytics = () => {
    const month = selectedDate.getMonth();
    const year = selectedDate.getFullYear();
    api
      .get(`/admin/analytics/consumo?month=${month}&year=${year}`)
      .then((res) => {
        setData(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchAnalytics();
    const channel = supabase
      .channel("admin-analytics-orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pedidos" },
        () => {
          fetchAnalytics();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDate]);

  const globals = useMemo(() => {
    const totalGasto = data.reduce((acc, item) => acc + Number(item.mensal || 0), 0);
    const mediaGeral = data.length ? totalGasto / data.length : 0;
    const pedidosTotal = data.reduce((acc, item) => acc + Number(item.numPedidos || 0), 0);
    const mediaPedidos = pedidosTotal ? totalGasto / pedidosTotal : 0;
    
    return {
      totalGasto,
      mediaGeral,
      pedidosTotal,
      mediaPedidos
    };
  }, [data]);

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => Number(b.mensal) - Number(a.mensal));
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[500px]">
        <img src={`${import.meta.env.VITE_SUPABASE_URL || "https://ybaoaskddcmwoincsnwm.supabase.co"}/storage/v1/object/public/uploads/icon.png`} alt="Carregando..." className="w-8 h-8 animate-spin opacity-80" />
      </div>
    );
  }

  return (
    <ContentViewport>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
        <BrandTitle title="Consumo" titleClassName="max-md:mt-0 md:-mt-4 max-md:pl-0 max-md:pt-0 max-md:ml-0 !mb-0" hideUnderline />
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/admin/vendas-lojas')}
            className="bg-emerald-500 hover:bg-emerald-600 text-emerald-950 font-bold px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            <Activity size={18} />
            C.M.V.
          </button>
          <button
            onClick={() => navigate('/admin/fechos')}
            className="bg-yellow-500 hover:bg-yellow-600 text-yellow-950 font-bold px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            FECHOS
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { 
            title: "Consumo Total (Mês)", 
            value: `€${formatCurrency(globals.totalGasto)}`, 
            icon: DollarSign,
            color: "text-emerald-500",
            bg: "bg-emerald-500/10",
            trend: "+12.5%",
            isPositive: true
          },
          { 
            title: "Média p/ Loja", 
            value: `€${formatCurrency(globals.mediaGeral)}`, 
            icon: Store,
            color: "text-blue-500",
            bg: "bg-blue-500/10",
            trend: "-2.4%",
            isPositive: false
          },
          { 
            title: "Total Pedidos (Mês)", 
            value: globals.pedidosTotal.toString(), 
            icon: Activity,
            color: "text-yellow-500",
            bg: "bg-yellow-500/10",
            trend: "+5.2%",
            isPositive: true
          },
          { 
            title: "Média p/ Pedido", 
            value: `€${formatCurrency(globals.mediaPedidos)}`, 
            icon: PieChartIcon,
            color: "text-purple-500",
            bg: "bg-purple-500/10",
            trend: "+0.8%",
            isPositive: true
          }
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 relative overflow-hidden"
          >
            <div className="flex items-start justify-between relative z-10">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{stat.title}</p>
                <h3 className="text-2xl font-semibold text-white mt-2">{stat.value}</h3>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.bg} ${stat.color}`}>
                <stat.icon size={20} />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-xs font-medium">
               {stat.isPositive ? <ArrowUpRight size={14} className="text-emerald-500" /> : <ArrowDownRight size={14} className="text-red-500" />}
               <span className={stat.isPositive ? "text-emerald-500" : "text-red-500"}>{stat.trend}</span>
               <span className="text-slate-500">vs Mês Passado</span>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="xl:col-span-2 bg-zinc-900/50 border border-white/5 rounded-[2rem] p-6 lg:p-8 overflow-hidden"
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <BarChart2 className="text-yellow-500" size={20} />
                Evolução Mensal: Mês Atual vs Mês Anterior
              </h3>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sortedData.map(d => ({ ...d, name: d.name?.split(' ')[0], mensal: parseFloat(d.mensal || 0), previsto: d.mesAnterior || 0 }))} margin={{ left: -20, right: 0, top: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10, angle: -45, textAnchor: 'end', dy: 15, dx: -5 }} height={60} interval={0} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10 }} tickFormatter={(val) => `€${formatCurrency(val)}`} />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.02)" }}
                  contentStyle={{ backgroundColor: "#0a0a0a", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
                  formatter={(value: number) => [`€${formatCurrency(value)}`, ""]}
                />
                <Bar dataKey="mensal" name="Mês Atual" fill="#eab308" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="previsto" name="Mês Anterior" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} opacity={0.5} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-zinc-900/50 border border-white/5 rounded-[2rem] p-6 lg:p-8"
        >
           <h3 className="text-base font-bold text-white mb-6 flex items-center gap-2 uppercase tracking-wide">
             <TrendingUp className="text-emerald-500" size={18} />
             Top Lojas (Consumo)
           </h3>
           <div className="space-y-4">
             {sortedData.slice(0, 5).map((item, i) => (
               <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-yellow-500/10 text-yellow-500 flex items-center justify-center font-black text-xs">
                      #{i + 1}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{item.name}</h4>
                      <p className="text-[10px] text-slate-500 tracking-wider">
                        {item.numPedidos} PEDIDOS
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-white">€{formatCurrency(item.mensal)}</p>
                    <p className="text-[10px] text-emerald-500 tracking-wider">+2.5% MÊS</p>
                  </div>
               </div>
             ))}
             {sortedData.length === 0 && <p className="text-center text-slate-500 text-sm py-8">Sem dados</p>}
           </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="mb-4 flex flex-col md:flex-row items-start md:items-center justify-between px-2 gap-4">
          <h3 className="text-lg font-bold text-white uppercase tracking-wide">Relatório Analítico Consolidado</h3>
          
          <div className="flex items-center bg-zinc-950/80 backdrop-blur-md border border-white/10 rounded-xl p-1 shadow-lg shadow-black/50">
            <button 
              onClick={() => changeMonth(-1)}
              className="p-1.5 hover:bg-white/10 active:bg-white/5 rounded-lg text-zinc-400 hover:text-emerald-400 transition-all active:scale-95 focus:outline-none"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="flex items-center gap-2 px-3 py-1 font-bold text-zinc-100 min-w-[130px] justify-center relative cursor-pointer">
              <Calendar size={14} className="text-emerald-500" />
              <span className="text-sm">{displayMonth}</span>
              <input 
                type="month" 
                value={`${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`}
                onChange={(e) => {
                   if (e.target.value) {
                       const [year, month] = e.target.value.split('-');
                       setSelectedDate(new Date(Number(year), Number(month) - 1, 1));
                   }
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                title="Selecionar Mês"
              />
            </div>
            <button 
              onClick={() => changeMonth(1)}
              className="p-1.5 hover:bg-white/10 active:bg-white/5 rounded-lg text-zinc-400 hover:text-emerald-400 transition-all active:scale-95 focus:outline-none"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Identificativo Loja</TableHead>
              <TableHead>Total Pedidos</TableHead>
              <TableHead>Custo Diário</TableHead>
              <TableHead>Custo Semanal</TableHead>
              <TableHead>Custo Mensal</TableHead>
              <TableHead className="text-right">Ticket Médio (Pedido)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((item, idx) => (
              <TableRow key={idx}>
                <TableCell className="font-bold text-white">{item.name}</TableCell>
                <TableCell className="text-slate-400 font-mono text-xs">{item.numPedidos}</TableCell>
                <TableCell className="text-slate-400">€{formatCurrency(item.diario)}</TableCell>
                <TableCell className="text-slate-400">€{formatCurrency(item.semanal)}</TableCell>
                <TableCell className="text-white font-medium">€{formatCurrency(item.mensal)}</TableCell>
                <TableCell className="text-right font-bold text-yellow-500">€{formatCurrency(item.mediaPedido)}</TableCell>
              </TableRow>
            ))}
            {sortedData.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-slate-500 py-8">Nenhum dado encontrado para o período especificado.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </motion.div>
    </ContentViewport>
  );
}




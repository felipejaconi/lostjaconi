import sys

code = """
import React, { useState, useEffect } from "react";
import api from "../../lib/api";
import {
  FileText,
  FileSpreadsheet,
  Download,
  Filter,
  Calendar,
  Layers,
  ChevronDown,
  Building2,
  TrendingDown,
  TrendingUp,
  Wallet,
  Store,
  Clock,
  AlertTriangle,
  Receipt,
  Users,
  ShoppingCart
} from "lucide-react";
import Swal from "sweetalert2";
import { motion } from "motion/react";
import { printGenericDocument } from "../../lib/printGenericDocument";
import { cn } from "../../lib/utils";

type ReportType = "receber" | "pagar" | "vencidas_pagar" | "vencidas_receber" | "iva_credito" | "despesas" | "consumo_lojas" | "gastos_lojas" | "fornecedores";

export default function AdminReports({ embedded = false }: { embedded?: boolean }) {
  const [reportType, setReportType] = useState<ReportType>("pagar");
  const [format, setFormat] = useState<"pdf" | "csv">("pdf");
  const [loading, setLoading] = useState(false);
  
  const [period, setPeriod] = useState("todos");
  const [status, setStatus] = useState("todos");
  const [entity, setEntity] = useState("todos");
  
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [lojas, setLojas] = useState<any[]>([]);

  // Metrics
  const [totalPagar, setTotalPagar] = useState(0);
  const [totalReceber, setTotalReceber] = useState(0);
  const [saldo, setSaldo] = useState(0);

  useEffect(() => {
    const fetchGlobalMetrics = async () => {
      try {
        const [fornRes, userRes, faturasRes, pedidosRes] = await Promise.all([
          api.get("/admin/fornecedores").catch(() => ({ data: [] })),
          api.get("/admin/users").catch(() => ({ data: [] })),
          api.get("/admin/faturas").catch(() => ({ data: [] })),
          api.get("/pedidos").catch(() => ({ data: [] }))
        ]);

        if (Array.isArray(fornRes.data)) setFornecedores(fornRes.data);
        if (Array.isArray(userRes.data)) {
            setLojas(userRes.data.filter((u: any) => u.role === "loja"));
        }

        let calcPagar = 0;
        const today = new Date();
        today.setHours(0,0,0,0);
        
        if (Array.isArray(faturasRes.data)) {
           faturasRes.data.forEach((f: any) => {
               if (["pendente", "parcial"].includes(f.status_pagamento || "pendente")) {
                   let isOverdue = false;
                   if (f.data_vencimento) {
                       const venc = new Date(f.data_vencimento);
                       venc.setHours(0,0,0,0);
                       isOverdue = venc < today;
                   } else if (f.data_emissao) {
                       const emiss = new Date(f.data_emissao);
                       emiss.setHours(0,0,0,0);
                       isOverdue = emiss < today;
                   }
                   if (isOverdue) {
                       calcPagar += Number(f.valor_pendente !== undefined ? f.valor_pendente : (f.valor_total || 0));
                   }
               }
           });
        }
        setTotalPagar(calcPagar);

        let calcReceber = 0;
        if (Array.isArray(pedidosRes.data)) {
           pedidosRes.data.forEach((p: any) => {
               if (['pronto', 'entregue'].includes(p.status?.toLowerCase())) {
                   calcReceber += Number(p.total || 0);
               }
           });
        }
        setTotalReceber(calcReceber);
        setSaldo(calcReceber - calcPagar);

      } catch (error) {
        console.error("Error fetching metrics:", error);
      }
    };

    fetchGlobalMetrics();
  }, []);

  const handleExport = async () => {
    setLoading(true);
    try {
      let data: any[][] = [];
      let headers: string[] = [];
      let title = "Relatório";

      const filterByPeriod = (dateString: string, periodF: string) => {
          if (periodF === "todos" || !dateString) return true;
          const dt = new Date(dateString);
          const now = new Date();
          if (periodF === "semana") {
              const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
              startOfWeek.setHours(0,0,0,0);
              return dt >= startOfWeek;
          }
          if (periodF === "mes") {
              return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
          }
          if (periodF === "ano") {
              return dt.getFullYear() === now.getFullYear();
          }
          return true;
      };

      if (reportType === "pagar" || reportType === "vencidas_pagar" || reportType === "despesas") {
        const res = await api.get("/admin/faturas");
        let fetchedData = Array.isArray(res.data) ? res.data : [];
        
        fetchedData = fetchedData.filter(f => {
            if (reportType === "despesas" && f.tipo !== "despesa" && !f.tipo?.startsWith("despesa")) return false;
            
            const periodMatch = filterByPeriod(f.data_emissao, period);
            let statusMatch = true;
            if (status !== "todos") {
               if (status === "pago") statusMatch = f.status_pagamento === "pago";
               if (status === "nao_pago") statusMatch = ["pendente", "parcial"].includes(f.status_pagamento || "pendente");
            }
            
            if (reportType === "vencidas_pagar") {
                statusMatch = ["pendente", "parcial"].includes(f.status_pagamento || "pendente");
                let isOverdue = false;
                const today = new Date();
                today.setHours(0,0,0,0);
                if (f.data_vencimento) {
                    const venc = new Date(f.data_vencimento);
                    venc.setHours(0,0,0,0);
                    isOverdue = venc < today;
                } else if (f.data_emissao) {
                    const emiss = new Date(f.data_emissao);
                    emiss.setHours(0,0,0,0);
                    isOverdue = emiss < today;
                }
                if (!isOverdue) return false;
            }

            const entityMatch = entity === "todos" || String(f.fornecedor_id) === entity;
            return periodMatch && statusMatch && entityMatch;
        });

        if (reportType === "despesas") {
           headers = ["Data Emissão", "Fornecedor", "Loja", "Nº Fatura", "Descrição", "Total (€)", "Status"];
           title = "Relatório de Despesas";
        } else {
           headers = ["Data Emissão", "Vencimento", "Fornecedor", "Loja", "Nº Fatura", "Total (€)", "Pendente (€)", "Status"];
           title = reportType === "vencidas_pagar" ? "Relatório de Faturas Vencidas a Pagar" : "Relatório de Faturas a Pagar";
        }
        
        let totalValor = 0;
        let totalPendente = 0;
        data = fetchedData.map(f => {
           let calcTotal = Number(f.valor_total || 0);
           let calcPendente = Number(f.valor_pendente || 0);
           
           totalValor += calcTotal;
           totalPendente += calcPendente;

           let lojaNome = "---";
           try {
              if (f.descrição) {
                  const desc = JSON.parse(f.descrição);
                  if (desc.loja_id) {
                     const st = lojas.find((l: any) => String(l.id) === String(desc.loja_id));
                     if (st) lojaNome = st.name || st.nome || st.loja_nome || "Loja";
                  }
              }
           } catch(e) {}
           
           if (reportType === "despesas") {
               let descStr = f.descrição || "";
               try {
                   const parsed = JSON.parse(descStr);
                   if (parsed.observacoes) descStr = parsed.observacoes;
                   else if (parsed.categoria) descStr = parsed.categoria;
               } catch(e) {}
               
               return [
                  f.data_emissao ? new Date(f.data_emissao).toLocaleDateString("pt-PT") : "N/A",
                  f.fornecedor?.nome || "N/A",
                  lojaNome,
                  f.numero_fatura || "N/A",
                  descStr,
                  calcTotal.toFixed(2),
                  (f.status_pagamento || "pendente").toUpperCase()
               ];
           } else {
               return [
                  f.data_emissao ? new Date(f.data_emissao).toLocaleDateString("pt-PT") : "N/A",
                  f.data_vencimento ? new Date(f.data_vencimento).toLocaleDateString("pt-PT") : "N/A",
                  f.fornecedor?.nome || "N/A",
                  lojaNome,
                  f.numero_fatura || "N/A",
                  calcTotal.toFixed(2),
                  calcPendente.toFixed(2),
                  (f.status_pagamento || "pendente").toUpperCase()
               ];
           }
        });
        
        if (reportType === "despesas") {
           data.push(["", "", "", "", "TOTAL", totalValor.toFixed(2), ""]);
        } else {
           data.push(["", "", "", "", "TOTAL CALCULADO", totalValor.toFixed(2), totalPendente.toFixed(2), ""]);
        }

      } else if (reportType === "iva_credito") {
        const res = await api.get("/admin/faturas");
        let fetchedData = Array.isArray(res.data) ? res.data : [];
        
        fetchedData = fetchedData.filter(f => {
            const periodMatch = filterByPeriod(f.data_emissao, period);
            const entityMatch = entity === "todos" || String(f.fornecedor_id) === entity;
            return periodMatch && entityMatch;
        });

        headers = ["Data Emissão", "Fornecedor", "Nº Fatura", "NIF", "IVA de Crédito (€)", "Tipo Fatura"];
        title = "Relatório de Crédito de IVA (Fornecedores)";
        
        let totalIvaResultante = 0;
        fetchedData.forEach(f => {
           let ivaCredito = 0;
           if (f.valor_iva !== undefined && f.valor_iva !== null) {
               ivaCredito = Number(f.valor_iva);
           } else if (f.fatura_itens && f.fatura_itens.length > 0) {
              f.fatura_itens.forEach((item: any) => {
                 if (item.valor_iva !== undefined && item.valor_iva !== null && item.valor_liquido !== undefined && item.valor_liquido !== null) {
                     ivaCredito += Number(item.valor_iva || 0);
                 } else {
                     const q = Number(item.quantidade || 0);
                     const c = Number(item.preco_custo || item.preco_unitario || 0);
                     const liq = q * c;
                     const ivaP = Number(item.iva !== undefined ? item.iva : (item.produto?.iva || 0));
                     ivaCredito += (liq * ivaP) / 100;
                 }
              });
           }
           
           if (ivaCredito > 0) {
               totalIvaResultante += ivaCredito;
               data.push([
                  f.data_emissao ? new Date(f.data_emissao).toLocaleDateString("pt-PT") : "N/A",
                  f.fornecedor?.nome || "N/A",
                  f.numero_fatura || "N/A",
                  f.fornecedor?.nif || "---",
                  ivaCredito.toFixed(2),
                  (f.tipo || "compra").toUpperCase()
               ]);
           }
        });
        
        data.push(["", "", "TOTAL IVA CRÉDITO", "", totalIvaResultante.toFixed(2), ""]);

      } else if (reportType === "fornecedores") {
        const res = await api.get("/admin/fornecedores");
        let fetchedData = Array.isArray(res.data) ? res.data : [];
        
        headers = ["Nome", "NIF", "Email", "Telefone", "IBAN"];
        title = "Relatório de Fornecedores Cadastrados";
        
        data = fetchedData.map(f => [
            f.nome || "N/A",
            f.nif || "N/A",
            f.email || "---",
            f.telefone || "---",
            f.iban || "---"
        ]);
        
      } else if (reportType === "receber" || reportType === "vencidas_receber") {
        const res = await api.get("/pedidos");
        let fetchedData = Array.isArray(res.data) ? res.data : [];
        
        fetchedData = fetchedData.filter(p => {
             const isReceberBase = ['pronto', 'entregue', 'concluido'].includes(p.status?.toLowerCase());
             const periodMatch = filterByPeriod(p.created_at, period);
            
            let statusMatch = true;
            if (status !== "todos") {
               if (status === "pago") statusMatch = p.status?.toLowerCase() === "concluido";
               if (status === "nao_pago") statusMatch = ['pronto', 'entregue'].includes(p.status?.toLowerCase());
            }
            
            if (reportType === "vencidas_receber") {
                statusMatch = ['pronto', 'entregue'].includes(p.status?.toLowerCase());
                let isOverdue = false;
                const today = new Date();
                today.setHours(0,0,0,0);
                const dt = new Date(p.created_at);
                dt.setHours(0,0,0,0);
                isOverdue = dt < today; // simple assumption: past days unpaid are overdue
                if (!isOverdue) return false;
            }
            
            const lojaMatch = entity === "todos" || String(p.user_id) === entity;
            
            return isReceberBase && periodMatch && statusMatch && lojaMatch;
        });

        headers = ["Data Pedido", "ID Pedido", "Loja", "Valor Total (€)", "Status Pagamento"];
        title = reportType === "vencidas_receber" ? "Balanço A Receber (Vencidas)" : "Relatório de Faturas a Receber";

        let totalValor = 0;
        data = fetchedData.map(p => {
           let calcTotal = Number(p.total || 0);
           totalValor += calcTotal;
           return [
               new Date(p.created_at).toLocaleDateString("pt-PT"),
               p.id.split('-')[0].toUpperCase(),
               p.loja_nome || "Loja Desconhecida",
               calcTotal.toFixed(2),
               p.status?.toLowerCase() === "concluido" ? "RECEBIDO" : "PENDENTE"
           ];
        });
        
        data.push(["", "", "TOTAL CALCULADO", totalValor.toFixed(2), ""]);
        
      } else if (reportType === "consumo_lojas" || reportType === "gastos_lojas") {
         const pedRes = await api.get("/pedidos");
         const faturasRes = await api.get("/admin/faturas");
         
         const pedidos = Array.isArray(pedRes.data) ? pedRes.data.filter((p: any) => filterByPeriod(p.created_at, period)) : [];
         const faturas = Array.isArray(faturasRes.data) ? faturasRes.data.filter((f: any) => filterByPeriod(f.data_emissao, period)) : [];
         
         let lojaStats: Record<string, { nome: string, consumo: number, compras_diretas: number, despesas: number }> = {};
         
         lojas.forEach(l => {
             lojaStats[l.id] = { nome: l.name || l.nome || "Loja " + l.id, consumo: 0, compras_diretas: 0, despesas: 0 };
         });
         
         pedidos.forEach(p => {
             if (['pronto', 'entregue', 'concluido'].includes(p.status?.toLowerCase())) {
                 const uid = String(p.user_id);
                 if (lojaStats[uid]) lojaStats[uid].consumo += Number(p.total || 0);
             }
         });
         
         faturas.forEach(f => {
             let lojaId = null;
             try {
                if (f.descrição) {
                   const parsed = JSON.parse(f.descrição);
                   if (parsed.loja_id) lojaId = String(parsed.loja_id);
                }
             } catch(e) {}
             
             if (lojaId && lojaStats[lojaId]) {
                 if (f.tipo === "compra") lojaStats[lojaId].compras_diretas += Number(f.valor_total || 0);
                 if (f.tipo === "despesa" || f.tipo?.startsWith("despesa")) lojaStats[lojaId].despesas += Number(f.valor_total || 0);
             }
         });
         
         let listStats = Object.values(lojaStats);
         if (entity !== "todos") {
             listStats = listStats.filter(s => s.nome === lojas.find(l => String(l.id) === entity)?.name);
         }
         
         if (reportType === "consumo_lojas") {
             headers = ["Loja", "Consumo Armazém (€)"];
             title = "Relatório de Consumo das Lojas (Pedidos ao Armazém)";
             let totalConsumo = 0;
             data = listStats.map(s => {
                 totalConsumo += s.consumo;
                 return [s.nome, s.consumo.toFixed(2)];
             });
             data.push(["TOTAL", totalConsumo.toFixed(2)]);
         } else {
             headers = ["Loja", "Consumo Armazém (€)", "Compras Diretas (€)", "Despesas (€)", "Total Gastos (€)"];
             title = "Relatório de Valores Totais Gastos das Lojas";
             let totC = 0, totDir = 0, totDesp = 0, totGen = 0;
             data = listStats.map(s => {
                 totC += s.consumo;
                 totDir += s.compras_diretas;
                 totDesp += s.despesas;
                 let tot = s.consumo + s.compras_diretas + s.despesas;
                 totGen += tot;
                 return [s.nome, s.consumo.toFixed(2), s.compras_diretas.toFixed(2), s.despesas.toFixed(2), tot.toFixed(2)];
             });
             data.push(["TOTAL", totC.toFixed(2), totDir.toFixed(2), totDesp.toFixed(2), totGen.toFixed(2)]);
         }
      }

      if (format === "pdf") {
        printGenericDocument({
          title,
          headers,
          data,
          docNumber: `FIN-${new Date().getFullYear()}-${reportType.toUpperCase()}`,
          footerNotes: "Relatório Financeiro gerado pelo sistema ERP Lost Wind."
        });
      } else {
        const csvContent = [
          headers.join(","),
          ...data.map((row) => row.map((cell: any) => `"${cell}"`).join(",")),
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `${title}.csv`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      Swal.fire({
        icon: "success",
        title: "Sucesso!",
        text: "O relatório foi gerado e baixado.",
        confirmButtonColor: "#3b82f6",
      });

    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: "error",
        title: "Erro",
        text: "Houve um problema ao gerar o relatório.",
        confirmButtonColor: "#3b82f6",
      });
    } finally {
      setLoading(false);
    }
  };

  const reportOptions = [
      { id: "receber", title: "A Receber", icon: TrendingUp, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500" },
      { id: "pagar", title: "A Pagar", icon: TrendingDown, color: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500" },
      { id: "vencidas_pagar", title: "Vencidas a Pagar", icon: AlertTriangle, color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500" },
      { id: "vencidas_receber", title: "Balanço Vencidas (Receber)", icon: AlertTriangle, color: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500" },
      { id: "iva_credito", title: "Crédito IVA", icon: FileSpreadsheet, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500" },
      { id: "despesas", title: "Despesas", icon: Receipt, color: "text-fuchsia-500", bg: "bg-fuchsia-500/10", border: "border-fuchsia-500" },
      { id: "consumo_lojas", title: "Consumo das Lojas", icon: Store, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500" },
      { id: "gastos_lojas", title: "Valores Totais Gastos", icon: ShoppingCart, color: "text-indigo-500", bg: "bg-indigo-500/10", border: "border-indigo-500" },
      { id: "fornecedores", title: "Fornecedores", icon: Users, color: "text-cyan-500", bg: "bg-cyan-500/10", border: "border-cyan-500" }
  ];

  return (
    <div className={embedded ? "" : "pt-2 px-4 md:pt-4 md:px-6 lg:px-8 pb-32"}>
      {!embedded && <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-zinc-800 pb-6 mb-8">
        <div>
          <h1 className="text-3xl lg:text-4xl font-semibold text-zinc-100 tracking-tight flex items-center gap-3">
             <Wallet className="w-8 h-8 text-blue-500" />
             Relatórios Financeiros
           </h1>
          <p className="text-sm text-zinc-400 font-medium mt-2">Extração e análise de dados completos do ERP</p>
        </div>
      </div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <motion.div initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} className="bg-zinc-950 p-6 rounded-2xl border border-zinc-800 shadow-sm relative overflow-hidden flex flex-col justify-center">
           <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500 border border-amber-500/20">
                <TrendingUp size={20} />
              </div>
           </div>
           <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-1">A Receber (Valor Total Vencido)</p>
           <p className="text-2xl font-black text-zinc-100">€{totalReceber.toLocaleString('pt-PT', {minimumFractionDigits: 2})}</p>
        </motion.div>
        
        <motion.div initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} transition={{delay: 0.1}} className="bg-zinc-950 p-6 rounded-2xl border border-zinc-800 shadow-sm relative overflow-hidden flex flex-col justify-center">
           <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-rose-500/10 rounded-xl flex items-center justify-center text-rose-500 border border-rose-500/20">
                <TrendingDown size={20} />
              </div>
           </div>
           <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-1">A Pagar (Valor Total Vencido)</p>
           <p className="text-2xl font-black text-zinc-100">€{totalPagar.toLocaleString('pt-PT', {minimumFractionDigits: 2})}</p>
        </motion.div>

        <motion.div initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} transition={{delay: 0.2}} className="bg-zinc-950 p-6 rounded-2xl border border-zinc-800 shadow-sm relative overflow-hidden flex flex-col justify-center">
           <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500 border border-blue-500/20">
                <Layers size={20} />
              </div>
           </div>
           <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Balanço Estimado Vencido</p>
           <p className={cn("text-2xl font-black", saldo >= 0 ? "text-emerald-400" : "text-rose-400")}>
               {saldo >= 0 ? "+" : "-"}€{Math.abs(saldo).toLocaleString('pt-PT', {minimumFractionDigits: 2})}
           </p>
        </motion.div>
      </div>

      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-sm">
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
                <div>
                    <label className="flex items-center gap-2 text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-3">
                        <FileText size={14}/> Tipo de Relatório
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {reportOptions.map((opt) => {
                           const Icon = opt.icon;
                           const isSelected = reportType === opt.id;
                           return (
                             <button
                                key={opt.id}
                                onClick={() => { setReportType(opt.id as ReportType); setEntity("todos"); setStatus("todos"); }}
                                className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all text-center h-full min-h-[90px] ${
                                    isSelected
                                    ? `${opt.bg} ${opt.border} ${opt.color}`
                                    : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-800/50"
                                }`}
                             >
                                <Icon size={20} className={isSelected ? opt.color : "text-zinc-500"} />
                                <span className="text-[11px] font-bold leading-tight px-1">{opt.title}</span>
                             </button>
                           );
                        })}
                    </div>
                </div>
            </div>
            <div className="space-y-6">
                <div>
                    <label className="flex items-center gap-2 text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-3">
                        <Calendar size={14}/> Período do Relatório
                    </label>
                    <div className="relative">
                        <select 
                             value={period} 
                             onChange={(e)=>setPeriod(e.target.value)}
                             disabled={reportType === "fornecedores"}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 font-medium outline-none focus:border-blue-500 appearance-none transition-colors disabled:opacity-50"
                        >
                            <option value="todos">Todo o Período</option>
                            <option value="semana">Esta Semana</option>
                            <option value="mes">Este Mês</option>
                            <option value="ano">Este Ano</option>
                        </select>
                        <ChevronDown size={16} className="absolute right-4 top-3.5 text-zinc-500 pointer-events-none"/>
                    </div>
                </div>

                {reportType !== "fornecedores" && (
                <div>
                    <label className="flex items-center gap-2 text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-3">
                        <Building2 size={14}/> {["pagar", "iva_credito", "vencidas_pagar", "despesas"].includes(reportType) ? "Filtrar por Fornecedor" : "Filtrar por Loja"}
                    </label>
                    <div className="relative">
                        <select 
                             value={entity} 
                             onChange={(e)=>setEntity(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 font-medium outline-none focus:border-blue-500 appearance-none transition-colors"
                        >
                            <option value="todos">Todos(as)</option>
                            {["pagar", "iva_credito", "vencidas_pagar", "despesas"].includes(reportType) && fornecedores.map(f => (
                               <option key={f.id} value={f.id}>{f.nome}</option>
                            ))}
                            {["receber", "vencidas_receber", "consumo_lojas", "gastos_lojas"].includes(reportType) && lojas.map(l => (
                               <option key={l.id} value={l.id}>{l.name}</option>
                            ))}
                        </select>
                        <ChevronDown size={16} className="absolute right-4 top-3.5 text-zinc-500 pointer-events-none"/>
                    </div>
                </div>
                )}

                {!["iva_credito", "consumo_lojas", "gastos_lojas", "fornecedores", "vencidas_pagar", "vencidas_receber"].includes(reportType) && (
                <div>
                    <label className="flex items-center gap-2 text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-3">
                        <Filter size={14}/> Status de Pagamento
                    </label>
                    <div className="relative">
                        <select 
                             value={status} 
                             onChange={(e)=>setStatus(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 font-medium outline-none focus:border-blue-500 appearance-none transition-colors"
                        >
                            <option value="todos">Todos os Status</option>
                            <option value="pago">{["pagar", "despesas"].includes(reportType) ? "Pagos" : "Recebidos"}</option>
                            <option value="nao_pago">{["pagar", "despesas"].includes(reportType) ? "Pendentes / Parciais" : "A Receber"}</option>
                        </select>
                        <ChevronDown size={16} className="absolute right-4 top-3.5 text-zinc-500 pointer-events-none"/>
                    </div>
                </div>
                )}

                <div>
                    <label className="flex items-center gap-2 text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-3">
                        Formato Final do Arquivo
                    </label>
                    <div className="flex gap-4">
                        <button
                            onClick={() => setFormat("pdf")}
                            className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                            format === "pdf"
                                ? "bg-red-500/10 border-red-500 text-red-500"
                                : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-800/50"
                            }`}
                        >
                            <FileText size={18} /> <span className="font-bold text-sm tracking-wide">PDF</span>
                        </button>
                        <button
                            onClick={() => setFormat("csv")}
                            className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                            format === "csv"
                                ? "bg-emerald-500/10 border-emerald-500 text-emerald-500"
                                : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-800/50"
                            }`}
                        >
                            <FileSpreadsheet size={18} /> <span className="font-bold text-sm tracking-wide">CSV</span>
                        </button>
                    </div>
                </div>
            </div>
         </div>

         <div className="mt-8 pt-6 border-t border-zinc-800">
            <button
               onClick={handleExport}
               disabled={loading}
               className="w-full sm:w-auto px-8 py-3.5 bg-blue-500 text-white font-bold text-sm rounded-xl hover:bg-blue-600 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mx-auto"
            >
               {loading ? <span className="animate-pulse">A Processar...</span> : <><Download size={18} /> Baixar Relatório</>}
            </button>
         </div>
      </div>
    </div>
  );
}
"""

with open('src/pages/admin/AdminReports.tsx', 'w') as f:
    f.write(code)

print("Success")

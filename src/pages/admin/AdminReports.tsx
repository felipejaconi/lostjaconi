
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
import { SearchableCombobox } from "../../components/ui/SearchableCombobox";

type ReportType = "receber" | "pagar" | "faturas_pagas" | "iva_credito" | "consumo_lojas" | "fornecedores";

export default function AdminReports({ embedded = false }: { embedded?: boolean }) {
  const [reportType, setReportType] = useState<ReportType>("pagar");
  const [format, setFormat] = useState<"pdf" | "csv">("pdf");
  const [loading, setLoading] = useState(false);
  
  const [period, setPeriod] = useState("todos");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState("todos");
  const [entity, setEntity] = useState("todos");
  
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [lojas, setLojas] = useState<any[]>([]);

  // Metrics
  const [totalPagarVencido, setTotalPagarVencido] = useState(0);
  const [totalPagarGeral, setTotalPagarGeral] = useState(0);
  const [totalReceberVencido, setTotalReceberVencido] = useState(0);
  const [totalRecebido, setTotalRecebido] = useState(0);
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

        let calcPagarVencido = 0;
        let calcPagarGeral = 0;
        const today = new Date();
        today.setHours(0,0,0,0);
        
        if (Array.isArray(faturasRes.data)) {
           faturasRes.data.forEach((f: any) => {
               if (["pendente", "parcial"].includes(f.status_pagamento || "pendente")) {
                   const pendente = Number(f.valor_pendente !== undefined ? f.valor_pendente : (f.valor_total || 0));
                   calcPagarGeral += pendente;
                   
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
                       calcPagarVencido += pendente;
                   }
               }
           });
        }
        setTotalPagarVencido(calcPagarVencido);
        setTotalPagarGeral(calcPagarGeral);

        let calcReceberVencido = 0;
        let calcRecebido = 0;
        if (Array.isArray(pedidosRes.data)) {
           pedidosRes.data.forEach((p: any) => {
               const valorTotal = Number(p.total || 0);
               const status = p.status?.toLowerCase();
               if (['pronto', 'entregue'].includes(status)) {
                   let isOverdue = false;
                   const dt = new Date(p.created_at);
                   dt.setHours(0,0,0,0);
                   isOverdue = dt < today;
                   if (isOverdue) {
                       calcReceberVencido += valorTotal;
                   }
               } else if (status === 'concluido') {
                   calcRecebido += valorTotal;
               }
           });
        }
        setTotalReceberVencido(calcReceberVencido);
        setTotalRecebido(calcRecebido);
        setSaldo(calcReceberVencido - calcPagarVencido);

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
          
          if (periodF === "personalizado") {
              if (startDate) {
                  const sdt = new Date(startDate);
                  sdt.setHours(0,0,0,0);
                  if (dt < sdt) return false;
              }
              if (endDate) {
                  const edt = new Date(endDate);
                  edt.setHours(23,59,59,999);
                  if (dt > edt) return false;
              }
              return true;
          }
          
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

      if (reportType === "pagar" || reportType === "faturas_pagas") {
        const res = await api.get("/admin/faturas");
        let fetchedData = Array.isArray(res.data) ? res.data : [];
        
        fetchedData = fetchedData.filter(f => {
            const periodMatch = filterByPeriod(f.data_emissao, period);
            let statusMatch = true;
            
            if (reportType === "pagar") {
                statusMatch = f.status_pagamento !== "pago";
            } else if (reportType === "faturas_pagas") {
                statusMatch = f.status_pagamento === "pago";
            }
            
            let entityMatch = true;
            if (entity !== "todos") {
                if (entity.startsWith("fornecedor_")) {
                    entityMatch = String(f.fornecedor_id) === entity.replace("fornecedor_", "");
                } else if (entity.startsWith("loja_")) {
                    let lojaId = null;
                    try {
                        if (f.descrição) {
                            const desc = JSON.parse(f.descrição);
                            lojaId = String(desc.loja_id);
                        }
                    } catch(e) {}
                    entityMatch = lojaId === entity.replace("loja_", "");
                } else {
                    entityMatch = String(f.fornecedor_id) === entity;
                }
            }
            return periodMatch && statusMatch && entityMatch;
        });

        headers = ["Data Emissão", "Vencimento", "Fornecedor", "Loja", "Nº Fatura", "Total (€)", "Pendente (€)", "Status"];
        title = reportType === "faturas_pagas" ? "Relatório de Faturas Pagas" : "Relatório de Faturas a Pagar";
        
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
           if (lojaNome === "---" && (f.tipo === "despesa" || f.tipo?.startsWith("despesa") || f.categoria_despesa)) {
               lojaNome = "Armazém Central";
           }
           
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
        });
        
        data.push(["", "", "", "", "TOTAL CALCULADO", totalValor.toFixed(2), totalPendente.toFixed(2), ""]);

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

      } else if (reportType === "debito_iva") {
        const res = await api.get("/pedidos");
        let fetchedData = Array.isArray(res.data) ? res.data : [];
           
        fetchedData = fetchedData.filter(p => {
             const isValidState = ['pronto', 'entregue'].includes(p.status?.toLowerCase());
             const periodMatch = filterByPeriod(p.created_at, period);
             const lojaMatch = entity === "todos" || String(p.user_id) === entity;
             return isValidState && periodMatch && lojaMatch;
        });

        headers = ["Data Pedido", "ID Pedido", "Loja", "Débito IVA (€)", "Status"];
        title = "Relatório de Débito de IVA (Vendas)";
           
        let totalIvaDebito = 0;
        fetchedData.forEach(p => {
            let sumIva = 0;
            (p.pedido_itens || []).forEach((item: any) => {
               const qty = Number(item.quantidade) || 0;
               const preco = Number(item.preco_unitario || 0);
               const liq = qty * preco;
               const ivaPerc = Number(item.produto?.iva || 0);
               sumIva += liq * (ivaPerc / 100);
            });
            
            if (sumIva > 0) {
                totalIvaDebito += sumIva;
                data.push([
                   new Date(p.created_at).toLocaleDateString("pt-PT"),
                   p.id.split('-')[0].toUpperCase(),
                   p.loja_nome || "Loja Desconhecida",
                   sumIva.toFixed(2),
                   p.status?.toUpperCase() || ""
                ]);
            }
        });
           
        data.push(["", "TOTAL IVA DÉBITO", "", totalIvaDebito.toFixed(2), ""]);

      } else if (reportType === "receber") {
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
            
            const lojaMatch = entity === "todos" || String(p.user_id) === entity;
            
            return isReceberBase && periodMatch && statusMatch && lojaMatch;
        });

        headers = ["Data Pedido", "ID Pedido", "Loja", "Valor Total (€)", "Status Pagamento"];
        title = "Relatório de Faturas a Receber";

        let totalValor = 0;
        data = fetchedData.map(p => {
           let calcTotal = Number(p.total || 0);
           if (p.pedido_itens && Array.isArray(p.pedido_itens)) {
               calcTotal = p.pedido_itens.reduce((acc: number, item: any) => {
                   const qty = Number(item.quantidade || 0);
                   const price = Number(item.preco_unitario || 0);
                   const iva = Number(item.produto?.iva !== undefined ? item.produto.iva : 23);
                   return acc + (qty * price) * (1 + iva / 100);
               }, 0);
           }
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
        
      } else if (reportType === "consumo_lojas") {
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
      { id: "pagar", title: "A Pagar", icon: TrendingDown, color: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500" },
      { id: "faturas_pagas", title: "Faturas Pagas", icon: AlertTriangle, color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500" },
      { id: "iva_credito", title: "Crédito IVA", icon: FileSpreadsheet, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500" },
      { id: "debito_iva", title: "Débito IVA", icon: FileSpreadsheet, color: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500" },
      { id: "receber", title: "A Receber", icon: TrendingUp, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500" },
      { id: "consumo_lojas", title: "Totais Lojas", icon: Store, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500" },
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

      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-3 mb-6">
        <motion.div initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} className="bg-zinc-950 p-3 xl:p-4 rounded-xl border border-zinc-800 shadow-sm relative overflow-hidden flex flex-col justify-center">
           <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-2 truncate">A Receber (Valor Total Vencido)</p>
           <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-amber-500/10 rounded-lg flex items-center justify-center text-amber-500 border border-amber-500/20 shrink-0">
                <TrendingUp size={14} />
              </div>
              <p className="text-lg font-black text-zinc-100 truncate">€{totalReceberVencido.toLocaleString('pt-PT', {minimumFractionDigits: 2})}</p>
           </div>
        </motion.div>
        
        <motion.div initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} transition={{delay: 0.1}} className="bg-zinc-950 p-3 xl:p-4 rounded-xl border border-zinc-800 shadow-sm relative overflow-hidden flex flex-col justify-center">
           <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-2 truncate">Recebido (Valor Total Recebido)</p>
           <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-500 border border-emerald-500/20 shrink-0">
                <Wallet size={14} />
              </div>
              <p className="text-lg font-black text-zinc-100 truncate">€{totalRecebido.toLocaleString('pt-PT', {minimumFractionDigits: 2})}</p>
           </div>
        </motion.div>

        <motion.div initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} transition={{delay: 0.2}} className="bg-zinc-950 p-3 xl:p-4 rounded-xl border border-zinc-800 shadow-sm relative overflow-hidden flex flex-col justify-center">
           <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-2 truncate">Valor Total a Pagar</p>
           <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-orange-500/10 rounded-lg flex items-center justify-center text-orange-500 border border-orange-500/20 shrink-0">
                <AlertTriangle size={14} />
              </div>
              <p className="text-lg font-black text-zinc-100 truncate">€{totalPagarGeral.toLocaleString('pt-PT', {minimumFractionDigits: 2})}</p>
           </div>
        </motion.div>

        <motion.div initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} transition={{delay: 0.3}} className="bg-zinc-950 p-3 xl:p-4 rounded-xl border border-zinc-800 shadow-sm relative overflow-hidden flex flex-col justify-center">
           <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-2 truncate">A Pagar (Valor Total Vencido)</p>
           <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-rose-500/10 rounded-lg flex items-center justify-center text-rose-500 border border-rose-500/20 shrink-0">
                <TrendingDown size={14} />
              </div>
              <p className="text-lg font-black text-zinc-100 truncate">€{totalPagarVencido.toLocaleString('pt-PT', {minimumFractionDigits: 2})}</p>
           </div>
        </motion.div>

        <motion.div initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} transition={{delay: 0.4}} className="bg-zinc-950 p-3 xl:p-4 rounded-xl border border-zinc-800 shadow-sm relative overflow-hidden flex flex-col justify-center">
           <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-2 truncate">Balanço Estimado Vencido</p>
           <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-500 border border-blue-500/20 shrink-0">
                <Layers size={14} />
              </div>
              <p className={cn("text-lg font-black truncate", saldo >= 0 ? "text-emerald-400" : "text-rose-400")}>
                  {saldo >= 0 ? "+" : "-"}€{Math.abs(saldo).toLocaleString('pt-PT', {minimumFractionDigits: 2})}
              </p>
           </div>
        </motion.div>
      </div>

      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-sm">
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6 flex flex-col h-full">
                <div className="flex-1">
                    <label className="flex items-center gap-2 text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-3">
                        <FileText size={14}/> Tipo de Relatório
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {reportOptions.map((opt) => {
                           const Icon = opt.icon;
                           const isSelected = reportType === opt.id;
                           return (
                             <button
                                key={opt.id}
                                onClick={() => { setReportType(opt.id as ReportType); setEntity("todos"); setStatus("todos"); }}
                                className={`flex items-center gap-2 p-2 px-2.5 rounded-lg border transition-all text-left ${
                                    isSelected
                                    ? `${opt.bg} ${opt.border} ${opt.color}`
                                    : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-800/50"
                                }`}
                             >
                                <Icon size={14} className={isSelected ? opt.color : "text-zinc-500 shrink-0"} />
                                <span className="text-[10px] font-bold leading-tight truncate">{opt.title}</span>
                             </button>
                           );
                        })}
                    </div>
                </div>
                
                <div className="pt-6 border-t border-zinc-800/50 mt-auto flex flex-col justify-end">
                    <button
                       onClick={handleExport}
                       disabled={loading}
                       className="w-full px-6 py-3.5 bg-blue-500 text-white font-bold text-sm rounded-xl hover:bg-blue-600 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
                    >
                       {loading ? <span className="animate-pulse">A Processar...</span> : <><Download size={18} /> Baixar Relatório</>}
                    </button>
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
                            <option value="personalizado">Personalizado</option>
                        </select>
                        <ChevronDown size={16} className="absolute right-4 top-3.5 text-zinc-500 pointer-events-none"/>
                    </div>
                    {period === "personalizado" && (
                        <div className="grid grid-cols-2 gap-2 mt-2">
                            <input 
                                type="date" 
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 font-medium outline-none focus:border-blue-500"
                            />
                            <input 
                                type="date" 
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 font-medium outline-none focus:border-blue-500"
                            />
                        </div>
                    )}
                </div>

                {reportType !== "fornecedores" && (
                <div>
                    <label className="flex items-center gap-2 text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-3">
                        <Building2 size={14}/> {["pagar", "faturas_pagas"].includes(reportType) ? "Filtrar por Loja ou Fornecedor" : ["iva_credito", "despesas"].includes(reportType) ? "Filtrar por Fornecedor" : "Filtrar por Loja"}
                    </label>
                    <div className="relative">
                        <SearchableCombobox 
                            value={entity}
                            onChange={setEntity}
                            placeholder="Pesquisar..."
                            options={[
                                { id: "todos", nome: "Todos(as)" },
                                ...(["pagar", "faturas_pagas"].includes(reportType) ? [
                                    ...fornecedores.map(f => ({ id: `fornecedor_${f.id}`, nome: `${f.nome} (Fornecedor)` })),
                                    ...lojas.map(l => ({ id: `loja_${l.id}`, nome: `${l.name || l.nome} (Loja)` }))
                                ] : []),
                                ...(["iva_credito", "despesas"].includes(reportType) ? fornecedores.map(f => ({ id: String(f.id), nome: f.nome })) : []),
                                ...(["receber", "consumo_lojas", "debito_iva"].includes(reportType) ? lojas.map(l => ({ id: String(l.id), nome: l.name || l.nome })) : [])
                            ]}
                        />
                    </div>
                </div>
                )}

                {!["iva_credito", "debito_iva", "consumo_lojas", "fornecedores", "faturas_pagas", "pagar"].includes(reportType) && (
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
                            <option value="pago">Recebidos</option>
                            <option value="nao_pago">A Receber</option>
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
      </div>
    </div>
  );
}

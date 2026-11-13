import React, { useState, useEffect, useMemo } from "react";
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
  AlertTriangle,
  Receipt,
  Users,
  Search,
  RotateCcw
} from "lucide-react";
import Swal from "sweetalert2";
import { motion } from "motion/react";
import { printGenericDocument } from "../../lib/printGenericDocument";
import { cn } from "../../lib/utils";
import { SearchableCombobox } from "../../components/ui/SearchableCombobox";
import { BrandTitle } from "../../components/BrandTitle";

type ReportType =
  | "receber"
  | "pagar"
  | "faturas_pagas"
  | "iva_credito"
  | "debito_iva"
  | "consumo_lojas"
  | "fornecedores"
  | "despesas"
  | "fechos";

interface QuickSuggestion {
  id: string;
  label: string;
  meta?: string;
  apply: () => void;
}

export default function AdminReports({ embedded = false }: { embedded?: boolean }) {
  const [reportType, setReportType] = useState<ReportType>("pagar");
  const [format, setFormat] = useState<"pdf" | "csv">("pdf");
  const [loading, setLoading] = useState(false);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState("todos");
  const [entity, setEntity] = useState("todos");

  // Bottom interactive preview & suggestions state (starts empty until user touches any filter)
  const [hasInteracted, setHasInteracted] = useState(false);
  const [quickSearch, setQuickSearch] = useState("");
  const [visibleLimit, setVisibleLimit] = useState(50);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Cached raw datasets for instant filtering & smart suggestions
  const [rawFaturas, setRawFaturas] = useState<any[] | null>(null);
  const [rawPedidos, setRawPedidos] = useState<any[] | null>(null);
  const [rawFechos, setRawFechos] = useState<any[] | null>(null);

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
        const [fornRes, userRes, metricsRes] = await Promise.all([
          api.get("/admin/fornecedores").catch(() => ({ data: [] })),
          api.get("/admin/users").catch(() => ({ data: [] })),
          api.get("/admin/reports/summary-metrics").catch(() => ({ data: {} }))
        ]);

        if (Array.isArray(fornRes.data)) setFornecedores(fornRes.data);
        if (Array.isArray(userRes.data)) {
          setLojas(userRes.data.filter((u: any) => u.role === "loja"));
        }

        const m = (metricsRes.data as any) || {};
        setTotalPagarVencido(m.totalPagarVencido || 0);
        setTotalPagarGeral(m.totalPagarGeral || 0);
        setTotalReceberVencido(m.totalReceberVencido || 0);
        setTotalRecebido(m.totalRecebido || 0);
        setSaldo(m.saldo || 0);
      } catch (error) {
        console.error("Error fetching metrics:", error);
      }
    };

    fetchGlobalMetrics();
  }, []);

  // Reset pagination when filters change
  useEffect(() => {
    setVisibleLimit(50);
  }, [reportType, startDate, endDate, status, entity, quickSearch]);

  // Lazy-load the required datasets once the user starts selecting filters
  useEffect(() => {
    if (!hasInteracted) return;

    let cancelled = false;
    const loadNeededData = async () => {
      const needsFaturas = ["pagar", "faturas_pagas", "iva_credito", "despesas", "consumo_lojas", "fornecedores"].includes(reportType);
      const needsPedidos = ["receber", "debito_iva", "consumo_lojas"].includes(reportType);
      const needsFechos = reportType === "fechos";

      const tasks: PromiseLike<void>[] = [];

      if (needsFaturas && rawFaturas === null) {
        tasks.push(
          api
            .get("/admin/faturas")
            .then((res) => {
              if (!cancelled) setRawFaturas(Array.isArray(res.data) ? res.data : []);
            })
            .catch(() => {
              if (!cancelled) setRawFaturas([]);
            })
        );
      }

      if (needsPedidos && rawPedidos === null) {
        tasks.push(
          api
            .get("/pedidos?all=true")
            .then((res) => {
              if (!cancelled) setRawPedidos(Array.isArray(res.data) ? res.data : []);
            })
            .catch(() => {
              if (!cancelled) setRawPedidos([]);
            })
        );
      }

      if (needsFechos && rawFechos === null) {
        tasks.push(
          api
            .get("/admin/fechos")
            .then((res) => {
              if (!cancelled) setRawFechos(Array.isArray(res.data) ? res.data : []);
            })
            .catch(() => {
              if (!cancelled) setRawFechos([]);
            })
        );
      }

      if (tasks.length > 0) {
        setPreviewLoading(true);
        await Promise.all(tasks);
        if (!cancelled) setPreviewLoading(false);
      }
    };

    loadNeededData();
    return () => {
      cancelled = true;
    };
  }, [hasInteracted, reportType, rawFaturas, rawPedidos, rawFechos]);

  const normalizedEntity = !entity || entity === "todos" ? "todos" : entity;

  const parseRecordDate = (dateString: string): Date | null => {
    if (!dateString) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [y, m, d] = dateString.split("-").map(Number);
      return new Date(y, m - 1, d, 12, 0, 0, 0);
    }
    const dt = new Date(dateString);
    return isNaN(dt.getTime()) ? null : dt;
  };

  const filterByDateRange = (dateString: string, customStart = startDate, customEnd = endDate) => {
    if (!customStart && !customEnd) return true;
    const dt = parseRecordDate(dateString);
    if (!dt) return false;

    if (customStart) {
      const [sy, sm, sd] = customStart.split("-").map(Number);
      const sdt = new Date(sy, sm - 1, sd, 0, 0, 0, 0);
      if (dt < sdt) return false;
    }
    if (customEnd) {
      const [ey, em, ed] = customEnd.split("-").map(Number);
      const edt = new Date(ey, em - 1, ed, 23, 59, 59, 999);
      if (dt > edt) return false;
    }
    return true;
  };

  const formatIsoInputDate = (isoDate: string) => {
    if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate;
    const [y, m, d] = isoDate.split("-");
    return `${d}/${m}/${y}`;
  };

  const getFaturaIva = (f: any): number => {
    if (f.valor_iva !== undefined && f.valor_iva !== null) {
      return Number(f.valor_iva);
    }
    if (f.fatura_itens && f.fatura_itens.length > 0) {
      let sum = 0;
      f.fatura_itens.forEach((item: any) => {
        if (item.valor_iva !== undefined && item.valor_iva !== null && item.valor_liquido !== undefined && item.valor_liquido !== null) {
          sum += Number(item.valor_iva || 0);
        } else {
          const q = Number(item.quantidade || 0);
          const c = Number(item.preco_custo || item.preco_unitario || 0);
          const liq = q * c;
          const ivaP = Number(item.iva !== undefined ? item.iva : item.produto?.iva || 0);
          sum += (liq * ivaP) / 100;
        }
      });
      return sum;
    }
    return 0;
  };

  const getFaturaLojaId = (f: any): string | null => {
    try {
      if (f.descrição) {
        const desc = typeof f.descrição === "string" ? JSON.parse(f.descrição) : f.descrição;
        if (desc?.loja_id) return String(desc.loja_id);
      }
    } catch {}
    return null;
  };

  const getPedidoTotalComIva = (p: any): number => {
    if (p.pedido_itens && Array.isArray(p.pedido_itens) && p.pedido_itens.length > 0) {
      return p.pedido_itens.reduce((acc: number, item: any) => {
        const qty = Number(item.quantidade || 0);
        const price = Number(item.preco_unitario || 0);
        const iva = Number(item.produto?.iva !== undefined ? item.produto.iva : 23);
        return acc + qty * price * (1 + iva / 100);
      }, 0);
    }
    return Number(p.total || 0);
  };

  const getPedidoIva = (p: any): number => {
    let sumIva = 0;
    (p.pedido_itens || []).forEach((item: any) => {
      const qty = Number(item.quantidade || 0);
      const preco = Number(item.preco_unitario || 0);
      const liq = qty * preco;
      const ivaPerc = Number(item.produto?.iva || 0);
      sumIva += liq * (ivaPerc / 100);
    });
    return sumIva;
  };

  const formatCurrency = (val: number) =>
    `€ ${val.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const computeReportResult = (
    faturasInput: any[],
    pedidosInput: any[],
    fechosInput: any[],
    searchFilter = ""
  ): {
    title: string;
    headers: string[];
    rows: string[][];
    totalRow: string[] | null;
    summaryTotal: number;
    summaryLabel: string;
    numericColumns: number[];
  } => {
    let rows: string[][] = [];
    let totalRow: string[] | null = null;
    let headers: string[] = [];
    let title = "Relatório";
    let summaryTotal = 0;
    let summaryLabel = "Total";
    let numericColumns: number[] = [];

    if (reportType === "pagar" || reportType === "faturas_pagas") {
      const filtered = faturasInput.filter((f) => {
        const periodMatch = filterByDateRange(f.data_emissao);
        const statusMatch = reportType === "pagar" ? f.status_pagamento !== "pago" : f.status_pagamento === "pago";

        let entityMatch = true;
        if (normalizedEntity !== "todos") {
          if (normalizedEntity.startsWith("fornecedor_")) {
            entityMatch = String(f.fornecedor_id) === normalizedEntity.replace("fornecedor_", "");
          } else if (normalizedEntity.startsWith("loja_")) {
            const lojaId = getFaturaLojaId(f);
            entityMatch = lojaId === normalizedEntity.replace("loja_", "");
          } else {
            entityMatch = String(f.fornecedor_id) === normalizedEntity;
          }
        }
        return periodMatch && statusMatch && entityMatch;
      });

      headers = ["Data Emissão", "Vencimento", "Fornecedor", "Loja", "Nº Fatura", "Total (€)", "Pendente (€)", "Status"];
      numericColumns = [5, 6];
      title = reportType === "faturas_pagas" ? "Relatório de Faturas Pagas" : "Relatório de Faturas a Pagar";

      let totalValor = 0;
      let totalPendente = 0;
      rows = filtered.map((f) => {
        const calcTotal = Number(f.valor_total || 0);
        const calcPendente = Number(f.valor_pendente || 0);

        let lojaNome = "---";
        const lId = getFaturaLojaId(f);
        if (lId) {
          const st = lojas.find((l: any) => String(l.id) === lId);
          if (st) lojaNome = st.name || st.nome || st.loja_nome || "Loja";
        }
        if (lojaNome === "---" && (f.tipo === "despesa" || f.tipo?.startsWith("despesa") || f.categoria_despesa)) {
          lojaNome = "Armazém Central";
        }

        totalValor += calcTotal;
        totalPendente += calcPendente;

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

      summaryTotal = reportType === "pagar" ? totalPendente : totalValor;
      summaryLabel = reportType === "pagar" ? "Total Pendente" : "Total Pago";
      totalRow = ["", "", "", "", "TOTAL CALCULADO", totalValor.toFixed(2), totalPendente.toFixed(2), ""];
    } else if (reportType === "iva_credito") {
      const filtered = faturasInput.filter((f) => {
        const periodMatch = filterByDateRange(f.data_emissao);
        const entityMatch = normalizedEntity === "todos" || String(f.fornecedor_id) === normalizedEntity;
        return periodMatch && entityMatch;
      });

      headers = ["Data Emissão", "Fornecedor", "Nº Fatura", "NIF", "IVA de Crédito (€)", "Tipo Fatura"];
      numericColumns = [4];
      title = "Relatório de Crédito de IVA (Fornecedores)";

      let totalIvaResultante = 0;
      filtered.forEach((f) => {
        const ivaCredito = getFaturaIva(f);
        if (ivaCredito > 0) {
          totalIvaResultante += ivaCredito;
          rows.push([
            f.data_emissao ? new Date(f.data_emissao).toLocaleDateString("pt-PT") : "N/A",
            f.fornecedor?.nome || "N/A",
            f.numero_fatura || "N/A",
            f.fornecedor?.nif || "---",
            ivaCredito.toFixed(2),
            (f.tipo || "compra").toUpperCase()
          ]);
        }
      });

      summaryTotal = totalIvaResultante;
      summaryLabel = "IVA Recuperável";
      totalRow = ["", "", "TOTAL IVA CRÉDITO", "", totalIvaResultante.toFixed(2), ""];
    } else if (reportType === "debito_iva") {
      const filtered = pedidosInput.filter((p) => {
        const isValidState = ["pronto", "entregue", "concluido"].includes(p.status?.toLowerCase());
        const periodMatch = filterByDateRange(p.created_at);
        const lojaMatch = normalizedEntity === "todos" || String(p.user_id) === normalizedEntity;

        let statusMatch = true;
        if (status !== "todos") {
          if (status === "pago") statusMatch = p.status?.toLowerCase() === "concluido";
          if (status === "nao_pago") statusMatch = ["pronto", "entregue"].includes(p.status?.toLowerCase());
        }
        return isValidState && periodMatch && lojaMatch && statusMatch;
      });

      headers = ["Data Pedido", "ID Pedido", "Loja", "Débito IVA (€)", "Status"];
      numericColumns = [3];
      title = "Relatório de Débito de IVA (Vendas)";

      let totalIvaDebito = 0;
      filtered.forEach((p) => {
        const sumIva = getPedidoIva(p);
        if (sumIva > 0) {
          totalIvaDebito += sumIva;
          rows.push([
            new Date(p.created_at).toLocaleDateString("pt-PT"),
            String(p.id).split("-")[0].toUpperCase(),
            p.loja_nome || "Loja Desconhecida",
            sumIva.toFixed(2),
            p.status?.toUpperCase() || ""
          ]);
        }
      });

      summaryTotal = totalIvaDebito;
      summaryLabel = "Total IVA Débito";
      totalRow = ["", "TOTAL IVA DÉBITO", "", totalIvaDebito.toFixed(2), ""];
    } else if (reportType === "receber") {
      const filtered = pedidosInput.filter((p) => {
        const isReceberBase = ["pronto", "entregue", "concluido"].includes(p.status?.toLowerCase());
        const periodMatch = filterByDateRange(p.created_at);

        let statusMatch = true;
        if (status !== "todos") {
          if (status === "pago") statusMatch = p.status?.toLowerCase() === "concluido";
          if (status === "nao_pago") statusMatch = ["pronto", "entregue"].includes(p.status?.toLowerCase());
        }

        const lojaMatch = normalizedEntity === "todos" || String(p.user_id) === normalizedEntity;
        return isReceberBase && periodMatch && statusMatch && lojaMatch;
      });

      headers = ["Data Pedido", "ID Pedido", "Loja", "Valor Total (€)", "Status Pagamento"];
      numericColumns = [3];
      title = "Relatório de Faturas a Receber";

      let totalValor = 0;
      rows = filtered.map((p) => {
        const calcTotal = getPedidoTotalComIva(p);
        totalValor += calcTotal;
        return [
          new Date(p.created_at).toLocaleDateString("pt-PT"),
          String(p.id).split("-")[0].toUpperCase(),
          p.loja_nome || "Loja Desconhecida",
          calcTotal.toFixed(2),
          p.status?.toLowerCase() === "concluido" ? "RECEBIDO" : "PENDENTE"
        ];
      });

      summaryTotal = totalValor;
      summaryLabel = "Valor Total";
      totalRow = ["", "", "TOTAL CALCULADO", totalValor.toFixed(2), ""];
    } else if (reportType === "despesas") {
      const filtered = faturasInput.filter((f) => {
        const isDespesa = f.tipo && f.tipo.startsWith("despesa");
        const periodMatch = filterByDateRange(f.data_emissao);
        let statusMatch = true;
        if (status !== "todos") {
          if (status === "pago") statusMatch = f.status_pagamento === "pago";
          if (status === "nao_pago") statusMatch = f.status_pagamento !== "pago";
        }

        const lojaId = getFaturaLojaId(f) || "armazem";
        const entityMatch = normalizedEntity === "todos" || lojaId === normalizedEntity;
        return isDespesa && periodMatch && statusMatch && entityMatch;
      });

      headers = ["Data Emissão", "Vencimento", "Loja", "Fornecedor", "Categoria", "Valor (€)", "Pendente (€)", "Status"];
      numericColumns = [5, 6];
      title = "Relatório de Despesas";

      let totalValor = 0;
      let totalPendente = 0;
      rows = filtered.map((f) => {
        const calcTotal = Number(f.valor_total || 0);
        let calcPendente = Number(f.valor_pendente !== undefined ? f.valor_pendente : calcTotal);
        if (f.status_pagamento === "pago") calcPendente = 0;

        totalValor += calcTotal;
        totalPendente += calcPendente;

        let lojaNome = "Armazém Central";
        const lId = getFaturaLojaId(f);
        if (lId) {
          const l = lojas.find((x) => String(x.id) === lId);
          if (l) lojaNome = l.name || l.nome;
        }

        return [
          f.data_emissao ? new Date(f.data_emissao).toLocaleDateString("pt-PT") : "N/A",
          f.data_vencimento ? new Date(f.data_vencimento).toLocaleDateString("pt-PT") : "N/A",
          lojaNome,
          f.fornecedor?.nome || "---",
          (f.tipo || "despesa").replace("despesa_", "").toUpperCase(),
          calcTotal.toFixed(2),
          calcPendente.toFixed(2),
          (f.status_pagamento || "pendente").toUpperCase()
        ];
      });

      summaryTotal = totalValor;
      summaryLabel = "Total Despesas";
      totalRow = ["", "", "", "", "TOTAL CALCULADO", totalValor.toFixed(2), totalPendente.toFixed(2), ""];
    } else if (reportType === "fechos") {
      const filtered = fechosInput
        .filter((f) => {
          const periodMatch = filterByDateRange(f.data);
          const entityMatch = normalizedEntity === "todos" || String(f.loja_id) === normalizedEntity;
          return periodMatch && entityMatch;
        })
        .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

      headers = ["Data", "Loja", "Sys MB", "Sys Dinh.", "Sys Mesa", "Sys Uber", "Total Sys", "Real MB", "Real Dinh.", "Real Mesa", "Real Uber", "Total Real", "Diferença"];
      numericColumns = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
      title = "Relatório de Fechos de Caixa";

      let tSysMb = 0, tSysDinh = 0, tSysMesa = 0, tSysUber = 0, tTotalSys = 0;
      let tRealMb = 0, tRealDinh = 0, tRealMesa = 0, tRealUber = 0, tTotalReal = 0;
      let tDiff = 0;

      rows = filtered.map((f) => {
        let lojaNome = f.loja_id;
        const l = lojas.find((x) => String(x.id) === String(f.loja_id));
        if (l) lojaNome = l.name || l.nome;

        const sysMb = Number(f.sys_mb || 0);
        const sysDinh = Number(f.sys_dinheiro || 0);
        const sysMesa = Number(f.sys_mesa || 0);
        const sysUber = Number(f.sys_uber || 0);
        const totSys = sysMb + sysDinh + sysMesa + sysUber;

        const realMb = Number(f.real_mb || 0);
        const realDinh = Number(f.real_dinheiro || 0);
        const realMesa = Number(f.real_mesa || 0);
        const realUber = Number(f.real_uber || 0);
        const totReal = realMb + realDinh + realMesa + realUber;

        const diff = totReal - totSys;

        tSysMb += sysMb; tSysDinh += sysDinh; tSysMesa += sysMesa; tSysUber += sysUber; tTotalSys += totSys;
        tRealMb += realMb; tRealDinh += realDinh; tRealMesa += realMesa; tRealUber += realUber; tTotalReal += totReal;
        tDiff += diff;

        return [
          f.data ? new Date(f.data).toLocaleDateString("pt-PT") : "N/A",
          lojaNome,
          sysMb.toFixed(2),
          sysDinh.toFixed(2),
          sysMesa.toFixed(2),
          sysUber.toFixed(2),
          totSys.toFixed(2),
          realMb.toFixed(2),
          realDinh.toFixed(2),
          realMesa.toFixed(2),
          realUber.toFixed(2),
          totReal.toFixed(2),
          diff.toFixed(2)
        ];
      });

      summaryTotal = tTotalReal;
      summaryLabel = "Total Real";
      totalRow = [
        "", "TOTAIS",
        tSysMb.toFixed(2), tSysDinh.toFixed(2), tSysMesa.toFixed(2), tSysUber.toFixed(2), tTotalSys.toFixed(2),
        tRealMb.toFixed(2), tRealDinh.toFixed(2), tRealMesa.toFixed(2), tRealUber.toFixed(2), tTotalReal.toFixed(2),
        tDiff.toFixed(2)
      ];
    } else if (reportType === "consumo_lojas") {
      const pedidos = pedidosInput.filter((p: any) => filterByDateRange(p.created_at));
      const faturas = faturasInput.filter((f: any) => filterByDateRange(f.data_emissao));

      const lojaStats: Record<string, { id: string; nome: string; consumo: number; compras_diretas: number; despesas: number }> = {};

      lojas.forEach((l) => {
        lojaStats[String(l.id)] = {
          id: String(l.id),
          nome: l.name || l.nome || "Loja " + l.id,
          consumo: 0,
          compras_diretas: 0,
          despesas: 0
        };
      });

      pedidos.forEach((p) => {
        if (["pronto", "entregue", "concluido"].includes(p.status?.toLowerCase())) {
          const uid = String(p.user_id);
          const total = Number(p.total || 0) + getPedidoIva(p);
          if (lojaStats[uid]) lojaStats[uid].consumo += total;
        }
      });

      faturas.forEach((f) => {
        const lojaId = getFaturaLojaId(f);
        if (lojaId && lojaStats[lojaId]) {
          if (f.tipo === "compra") lojaStats[lojaId].compras_diretas += Number(f.valor_total || 0);
          if (f.tipo === "despesa" || f.tipo?.startsWith("despesa")) lojaStats[lojaId].despesas += Number(f.valor_total || 0);
        }
      });

      let listStats = Object.values(lojaStats);
      if (normalizedEntity !== "todos") {
        listStats = listStats.filter((s) => s.id === normalizedEntity);
      }

      headers = ["Loja", "Consumo Armazém (€)", "Compras Diretas (€)", "Despesas (€)", "Total Gastos (€)"];
      numericColumns = [1, 2, 3, 4];
      title = "Relatório de Valores Totais Gastos das Lojas";

      let totC = 0, totDir = 0, totDesp = 0, totGen = 0;
      rows = listStats.map((s) => {
        totC += s.consumo;
        totDir += s.compras_diretas;
        totDesp += s.despesas;
        const tot = s.consumo + s.compras_diretas + s.despesas;
        totGen += tot;
        return [s.nome, s.consumo.toFixed(2), s.compras_diretas.toFixed(2), s.despesas.toFixed(2), tot.toFixed(2)];
      });

      summaryTotal = totGen;
      summaryLabel = "Total Gastos";
      totalRow = ["TOTAL", totC.toFixed(2), totDir.toFixed(2), totDesp.toFixed(2), totGen.toFixed(2)];
    } else if (reportType === "fornecedores") {
      const faturasPeriodo = faturasInput.filter((f: any) => filterByDateRange(f.data_emissao));
      const statsMap = new Map<string, { count: number; total: number; pendente: number }>();

      faturasPeriodo.forEach((f: any) => {
        if (!f.fornecedor_id) return;
        const key = String(f.fornecedor_id);
        const cur = statsMap.get(key) || { count: 0, total: 0, pendente: 0 };
        cur.count += 1;
        cur.total += Number(f.valor_total || 0);
        cur.pendente += f.status_pagamento === "pago" ? 0 : Number(f.valor_pendente ?? f.valor_total ?? 0);
        statsMap.set(key, cur);
      });

      let filteredForn = fornecedores;
      if (normalizedEntity !== "todos") {
        filteredForn = filteredForn.filter((fn) => String(fn.id) === normalizedEntity);
      }

      headers = ["Fornecedor", "NIF", "Tipo", "Nº Faturas", "Total Faturado (€)", "Pendente (€)"];
      numericColumns = [3, 4, 5];
      title = "Relatório de Fornecedores";

      let grandTotal = 0;
      let grandPendente = 0;
      let grandCount = 0;

      rows = filteredForn.map((fn) => {
        const st = statsMap.get(String(fn.id)) || { count: 0, total: 0, pendente: 0 };
        grandTotal += st.total;
        grandPendente += st.pendente;
        grandCount += st.count;
        return [
          fn.nome || "N/A",
          fn.contribuinte || fn.nif || "---",
          (fn.tipo || "fornecedor").toUpperCase(),
          String(st.count),
          st.total.toFixed(2),
          st.pendente.toFixed(2)
        ];
      });

      summaryTotal = grandTotal;
      summaryLabel = "Total Faturado";
      totalRow = ["TOTAL", "", "", String(grandCount), grandTotal.toFixed(2), grandPendente.toFixed(2)];
    }

    if (searchFilter.trim() !== "") {
      const term = searchFilter.trim().toLowerCase();
      rows = rows.filter((r) => r.some((cell) => String(cell).toLowerCase().includes(term)));
    }

    return { title, headers, rows, totalRow, summaryTotal, summaryLabel, numericColumns };
  };

  const livePreview = useMemo(() => {
    if (!hasInteracted) return null;
    return computeReportResult(rawFaturas || [], rawPedidos || [], rawFechos || [], quickSearch);
  }, [hasInteracted, reportType, startDate, endDate, status, normalizedEntity, quickSearch, rawFaturas, rawPedidos, rawFechos, fornecedores, lojas]);

  // Dynamic contextual suggestions generated from real records as filters are selected
  const smartSuggestions = useMemo<QuickSuggestion[]>(() => {
    if (!hasInteracted) return [];
    const list: QuickSuggestion[] = [];
    const faturasArr = rawFaturas || [];
    const pedidosArr = rawPedidos || [];
    const fechosArr = rawFechos || [];

    // 1. Date-range suggestions (populate startDate & endDate directly from months that have records)
    if (!startDate && !endDate) {
      const monthCounts = new Map<string, { y: number; m: number; count: number }>();
      const registerDate = (dStr: string) => {
        const dt = parseRecordDate(dStr);
        if (!dt) return;
        const y = dt.getFullYear();
        const m = dt.getMonth() + 1;
        const key = `${y}-${String(m).padStart(2, "0")}`;
        const cur = monthCounts.get(key) || { y, m, count: 0 };
        cur.count += 1;
        monthCounts.set(key, cur);
      };

      if (["pagar", "faturas_pagas", "iva_credito", "despesas", "fornecedores"].includes(reportType)) {
        faturasArr.forEach((f) => {
          if (reportType === "pagar" && f.status_pagamento === "pago") return;
          if (reportType === "faturas_pagas" && f.status_pagamento !== "pago") return;
          if (reportType === "despesas" && !f.tipo?.startsWith("despesa")) return;
          if (reportType === "iva_credito" && getFaturaIva(f) <= 0) return;
          registerDate(f.data_emissao);
        });
      } else if (["receber", "debito_iva", "consumo_lojas"].includes(reportType)) {
        pedidosArr.forEach((p) => {
          if (!["pronto", "entregue", "concluido"].includes(p.status?.toLowerCase())) return;
          registerDate(p.created_at);
        });
      } else if (reportType === "fechos") {
        fechosArr.forEach((f) => registerDate(f.data));
      }

      Array.from(monthCounts.entries())
        .sort((a, b) => b[0].localeCompare(a[0]))
        .slice(0, 3)
        .forEach(([key, info]) => {
          const lastDay = new Date(info.y, info.m, 0).getDate();
          const sIso = `${info.y}-${String(info.m).padStart(2, "0")}-01`;
          const eIso = `${info.y}-${String(info.m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
          list.push({
            id: `sug_dates_${key}`,
            label: `01/${String(info.m).padStart(2, "0")}/${info.y} a ${String(lastDay).padStart(2, "0")}/${String(info.m).padStart(2, "0")}/${info.y}`,
            meta: `${info.count} reg.`,
            apply: () => {
              setStartDate(sIso);
              setEndDate(eIso);
              setHasInteracted(true);
            }
          });
        });
    }

    // 2. Top Supplier / Store suggestions based on current report + date range when entity === "todos"
    if (normalizedEntity === "todos") {
      if (["pagar", "faturas_pagas", "iva_credito", "fornecedores"].includes(reportType)) {
        const map = new Map<string, { nome: string; count: number; val: number; entityVal: string }>();
        faturasArr.forEach((f) => {
          if (!f.fornecedor_id || !filterByDateRange(f.data_emissao)) return;
          if (reportType === "pagar" && f.status_pagamento === "pago") return;
          if (reportType === "faturas_pagas" && f.status_pagamento !== "pago") return;
          if (reportType === "iva_credito" && getFaturaIva(f) <= 0) return;

          const fid = String(f.fornecedor_id);
          const entityVal = ["pagar", "faturas_pagas"].includes(reportType) ? `fornecedor_${fid}` : fid;
          const nome = f.fornecedor?.nome || fornecedores.find((fn) => String(fn.id) === fid)?.nome || `Fornecedor #${fid}`;
          const amount =
            reportType === "iva_credito"
              ? getFaturaIva(f)
              : reportType === "pagar"
              ? Number(f.valor_pendente ?? f.valor_total ?? 0)
              : Number(f.valor_total || 0);

          const prev = map.get(fid) || { nome, count: 0, val: 0, entityVal };
          prev.count += 1;
          prev.val += amount;
          map.set(fid, prev);
        });

        Array.from(map.values())
          .sort((a, b) => b.val - a.val)
          .slice(0, 5)
          .forEach((item) => {
            list.push({
              id: `sug_forn_${item.entityVal}`,
              label: item.nome,
              meta: `${item.count} faturas · ${formatCurrency(item.val)}`,
              apply: () => {
                setEntity(item.entityVal);
                setHasInteracted(true);
              }
            });
          });
      } else if (["receber", "debito_iva", "consumo_lojas"].includes(reportType)) {
        const map = new Map<string, { nome: string; count: number; val: number }>();
        pedidosArr.forEach((p) => {
          if (!["pronto", "entregue", "concluido"].includes(p.status?.toLowerCase())) return;
          if (!filterByDateRange(p.created_at)) return;
          if (status === "pago" && p.status?.toLowerCase() !== "concluido") return;
          if (status === "nao_pago" && !["pronto", "entregue"].includes(p.status?.toLowerCase())) return;

          const lid = String(p.user_id);
          const nome = p.loja_nome || lojas.find((l) => String(l.id) === lid)?.name || `Loja #${lid}`;
          const amount = reportType === "debito_iva" ? getPedidoIva(p) : getPedidoTotalComIva(p);
          if (reportType === "debito_iva" && amount <= 0) return;

          const prev = map.get(lid) || { nome, count: 0, val: 0 };
          prev.count += 1;
          prev.val += amount;
          map.set(lid, prev);
        });

        Array.from(map.entries())
          .sort((a, b) => b[1].val - a[1].val)
          .slice(0, 5)
          .forEach(([lid, info]) => {
            list.push({
              id: `sug_loja_${lid}`,
              label: info.nome,
              meta: `${info.count} ped. · ${formatCurrency(info.val)}`,
              apply: () => {
                setEntity(lid);
                setHasInteracted(true);
              }
            });
          });
      } else if (reportType === "despesas") {
        const map = new Map<string, { nome: string; count: number; val: number }>();
        faturasArr.forEach((f) => {
          if (!f.tipo?.startsWith("despesa") || !filterByDateRange(f.data_emissao)) return;
          if (status === "pago" && f.status_pagamento !== "pago") return;
          if (status === "nao_pago" && f.status_pagamento === "pago") return;

          const lid = getFaturaLojaId(f) || "armazem";
          const nome =
            lid === "armazem"
              ? "Armazém Central"
              : lojas.find((l) => String(l.id) === lid)?.name || `Loja #${lid}`;
          const prev = map.get(lid) || { nome, count: 0, val: 0 };
          prev.count += 1;
          prev.val += Number(f.valor_total || 0);
          map.set(lid, prev);
        });

        Array.from(map.entries())
          .sort((a, b) => b[1].val - a[1].val)
          .slice(0, 5)
          .forEach(([lid, info]) => {
            list.push({
              id: `sug_desp_${lid}`,
              label: info.nome,
              meta: `${info.count} desp. · ${formatCurrency(info.val)}`,
              apply: () => {
                setEntity(lid);
                setHasInteracted(true);
              }
            });
          });
      }
    }

    // 3. Payment status suggestions when status === "todos" on applicable reports
    if (status === "todos" && ["receber", "despesas", "debito_iva"].includes(reportType)) {
      if (reportType === "despesas") {
        const base = faturasArr.filter((f) => {
          if (!f.tipo?.startsWith("despesa") || !filterByDateRange(f.data_emissao)) return false;
          const lid = getFaturaLojaId(f) || "armazem";
          return normalizedEntity === "todos" || lid === normalizedEntity;
        });
        const unpaid = base.filter((f) => f.status_pagamento !== "pago").length;
        const paid = base.filter((f) => f.status_pagamento === "pago").length;
        if (unpaid > 0) {
          list.push({
            id: "sug_status_pendente",
            label: "Apenas Pendentes",
            meta: `${unpaid} reg.`,
            apply: () => {
              setStatus("nao_pago");
              setHasInteracted(true);
            }
          });
        }
        if (paid > 0) {
          list.push({
            id: "sug_status_pago",
            label: "Apenas Pagos",
            meta: `${paid} reg.`,
            apply: () => {
              setStatus("pago");
              setHasInteracted(true);
            }
          });
        }
      } else {
        const base = pedidosArr.filter((p) => {
          if (!["pronto", "entregue", "concluido"].includes(p.status?.toLowerCase())) return false;
          if (!filterByDateRange(p.created_at)) return false;
          return normalizedEntity === "todos" || String(p.user_id) === normalizedEntity;
        });
        const unpaid = base.filter((p) => ["pronto", "entregue"].includes(p.status?.toLowerCase())).length;
        const paid = base.filter((p) => p.status?.toLowerCase() === "concluido").length;
        if (unpaid > 0) {
          list.push({
            id: "sug_status_areceber",
            label: "Apenas A Receber",
            meta: `${unpaid} ped.`,
            apply: () => {
              setStatus("nao_pago");
              setHasInteracted(true);
            }
          });
        }
        if (paid > 0) {
          list.push({
            id: "sug_status_recebidos",
            label: "Apenas Recebidos",
            meta: `${paid} ped.`,
            apply: () => {
              setStatus("pago");
              setHasInteracted(true);
            }
          });
        }
      }
    }

    return list;
  }, [hasInteracted, reportType, startDate, endDate, status, normalizedEntity, rawFaturas, rawPedidos, rawFechos, fornecedores, lojas]);

  const handleExport = async () => {
    setLoading(true);
    try {
      let faturasData = rawFaturas;
      let pedidosData = rawPedidos;
      let fechosData = rawFechos;

      if (["pagar", "faturas_pagas", "iva_credito", "despesas", "consumo_lojas", "fornecedores"].includes(reportType) && faturasData === null) {
        const res = await api.get("/admin/faturas");
        faturasData = Array.isArray(res.data) ? res.data : [];
        setRawFaturas(faturasData);
      }
      if (["receber", "debito_iva", "consumo_lojas"].includes(reportType) && pedidosData === null) {
        const res = await api.get("/pedidos?all=true");
        pedidosData = Array.isArray(res.data) ? res.data : [];
        setRawPedidos(pedidosData);
      }
      if (reportType === "fechos" && fechosData === null) {
        const res = await api.get("/admin/fechos");
        fechosData = Array.isArray(res.data) ? res.data : [];
        setRawFechos(fechosData);
      }

      const computed = computeReportResult(faturasData || [], pedidosData || [], fechosData || [], quickSearch);
      const exportRows = computed.totalRow ? [...computed.rows, computed.totalRow] : computed.rows;

      if (format === "pdf") {
        printGenericDocument({
          title: computed.title,
          headers: computed.headers,
          data: exportRows,
          docNumber: `FIN-${new Date().getFullYear()}-${reportType.toUpperCase()}`,
          footerNotes: "Relatório Financeiro gerado pelo sistema ERP Lost Wind."
        });
      } else {
        const csvContent = [
          computed.headers.join(","),
          ...exportRows.map((row) => row.map((cell: any) => `"${cell}"`).join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `${computed.title}.csv`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      Swal.fire({
        icon: "success",
        title: "Sucesso!",
        text: "O relatório foi gerado e baixado.",
        confirmButtonColor: "#3b82f6"
      });
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: "error",
        title: "Erro",
        text: "Houve um problema ao gerar o relatório.",
        confirmButtonColor: "#3b82f6"
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
    { id: "despesas", title: "Despesas", icon: Receipt, color: "text-purple-500", bg: "bg-purple-500/10", border: "border-purple-500" },
    { id: "consumo_lojas", title: "Totais Lojas", icon: Store, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500" },
    { id: "fechos", title: "Fechos de Caixa", icon: Store, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500" },
    { id: "fornecedores", title: "Fornecedores", icon: Users, color: "text-cyan-500", bg: "bg-cyan-500/10", border: "border-cyan-500" }
  ];

  const entityOptions = useMemo(() => {
    return [
      { id: "todos", nome: "Todos(as)" },
      ...(["pagar", "faturas_pagas"].includes(reportType)
        ? [
            ...fornecedores.map((f) => ({ id: `fornecedor_${f.id}`, nome: `${f.nome} (Fornecedor)` })),
            ...lojas.map((l) => ({ id: `loja_${l.id}`, nome: `${l.name || l.nome} (Loja)` }))
          ]
        : []),
      ...(["iva_credito", "fornecedores"].includes(reportType)
        ? fornecedores.map((f) => ({ id: String(f.id), nome: f.nome }))
        : []),
      ...(["receber", "consumo_lojas", "debito_iva", "fechos"].includes(reportType)
        ? lojas.map((l) => ({ id: String(l.id), nome: l.name || l.nome }))
        : []),
      ...(reportType === "despesas"
        ? [
            { id: "armazem", nome: "Armazém Central" },
            ...lojas.map((l) => ({ id: String(l.id), nome: l.name || l.nome }))
          ]
        : [])
    ];
  }, [reportType, fornecedores, lojas]);

  const activePeriodLabel = useMemo(() => {
    if (startDate && endDate) return `${formatIsoInputDate(startDate)} a ${formatIsoInputDate(endDate)}`;
    if (startDate) return `Desde ${formatIsoInputDate(startDate)}`;
    if (endDate) return `Até ${formatIsoInputDate(endDate)}`;
    return "Todas as datas";
  }, [startDate, endDate]);

  const activeEntityLabel = useMemo(() => {
    if (normalizedEntity === "todos") return "Todos(as)";
    const found = entityOptions.find((o) => String(o.id) === String(normalizedEntity));
    return found ? found.nome : normalizedEntity;
  }, [normalizedEntity, entityOptions]);

  const handleResetFilters = () => {
    setStartDate("");
    setEndDate("");
    setStatus("todos");
    setEntity("todos");
    setQuickSearch("");
    setHasInteracted(false);
  };

  return (
    <div className={embedded ? "" : "pt-2 px-4 md:pt-4 md:px-6 lg:px-8 pb-32"}>
      {!embedded && (
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-zinc-800 pb-2 mb-8">
          <div>
            <BrandTitle title="Relatórios Financeiros" titleClassName="-mt-7 pl-0 pt-0 ml-0" hideUnderline />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-3 mb-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-zinc-950 p-3 xl:p-4 rounded-xl border border-zinc-800 shadow-sm relative overflow-hidden flex flex-col justify-center">
          <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-2 truncate">A Receber (Valor Total Vencido)</p>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-amber-500/10 rounded-lg flex items-center justify-center text-amber-500 border border-amber-500/20 shrink-0">
              <TrendingUp size={14} />
            </div>
            <p className="text-lg font-black text-zinc-100 tabular-nums truncate">€{totalReceberVencido.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}</p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-zinc-950 p-3 xl:p-4 rounded-xl border border-zinc-800 shadow-sm relative overflow-hidden flex flex-col justify-center">
          <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-2 truncate">Recebido (Valor Total Recebido)</p>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-500 border border-emerald-500/20 shrink-0">
              <Wallet size={14} />
            </div>
            <p className="text-lg font-black text-zinc-100 tabular-nums truncate">€{totalRecebido.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}</p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-zinc-950 p-3 xl:p-4 rounded-xl border border-zinc-800 shadow-sm relative overflow-hidden flex flex-col justify-center">
          <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-2 truncate">Valor Total a Pagar</p>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-orange-500/10 rounded-lg flex items-center justify-center text-orange-500 border border-orange-500/20 shrink-0">
              <AlertTriangle size={14} />
            </div>
            <p className="text-lg font-black text-zinc-100 tabular-nums truncate">€{totalPagarGeral.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}</p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-zinc-950 p-3 xl:p-4 rounded-xl border border-zinc-800 shadow-sm relative overflow-hidden flex flex-col justify-center">
          <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-2 truncate">A Pagar (Valor Total Vencido)</p>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-rose-500/10 rounded-lg flex items-center justify-center text-rose-500 border border-rose-500/20 shrink-0">
              <TrendingDown size={14} />
            </div>
            <p className="text-lg font-black text-zinc-100 tabular-nums truncate">€{totalPagarVencido.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}</p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-zinc-950 p-3 xl:p-4 rounded-xl border border-zinc-800 shadow-sm relative overflow-hidden flex flex-col justify-center">
          <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-2 truncate">Balanço Estimado Vencido</p>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-500 border border-blue-500/20 shrink-0">
              <Layers size={14} />
            </div>
            <p className={cn("text-lg font-black tabular-nums truncate", saldo >= 0 ? "text-emerald-400" : "text-rose-400")}>
              {saldo >= 0 ? "+" : "-"}€{Math.abs(saldo).toLocaleString("pt-PT", { minimumFractionDigits: 2 })}
            </p>
          </div>
        </motion.div>
      </div>

      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6 flex flex-col h-full">
            <div className="flex-1">
              <label className="flex items-center gap-2 text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-3">
                <FileText size={14} /> Tipo de Relatório
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {reportOptions.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = reportType === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => {
                        setReportType(opt.id as ReportType);
                        setEntity("todos");
                        setStatus("todos");
                        setHasInteracted(true);
                      }}
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
                <Calendar size={14} /> Período do Relatório
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="block text-[10px] font-medium text-zinc-500 mb-1.5">Data Inicial</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setHasInteracted(true);
                    }}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 font-medium outline-none focus:border-blue-500 transition-colors tabular-nums"
                  />
                </div>
                <div>
                  <span className="block text-[10px] font-medium text-zinc-500 mb-1.5">Data Final</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setHasInteracted(true);
                    }}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 font-medium outline-none focus:border-blue-500 transition-colors tabular-nums"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-3">
                <Building2 size={14} />{" "}
                {["pagar", "faturas_pagas"].includes(reportType)
                  ? "Filtrar por Loja ou Fornecedor"
                  : ["iva_credito", "fornecedores"].includes(reportType)
                  ? "Filtrar por Fornecedor"
                  : reportType === "despesas"
                  ? "Filtrar por Loja ou Armazém"
                  : "Filtrar por Loja"}
              </label>
              <div className="relative">
                <SearchableCombobox
                  value={entity}
                  onChange={(val) => {
                    setEntity(val || "todos");
                    setHasInteracted(true);
                  }}
                  placeholder="Pesquisar..."
                  options={entityOptions}
                />
              </div>
            </div>

            {!["iva_credito", "consumo_lojas", "fornecedores", "faturas_pagas", "pagar", "fechos"].includes(reportType) && (
              <div>
                <label className="flex items-center gap-2 text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-3">
                  <Filter size={14} /> Status de Pagamento
                </label>
                <div className="relative">
                  <select
                    value={status}
                    onChange={(e) => {
                      setStatus(e.target.value);
                      setHasInteracted(true);
                    }}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 font-medium outline-none focus:border-blue-500 appearance-none transition-colors"
                  >
                    <option value="todos">Todos os Status</option>
                    <option value="pago">{reportType === "despesas" ? "Pagos" : "Recebidos"}</option>
                    <option value="nao_pago">{reportType === "despesas" ? "Pendentes" : "A Receber"}</option>
                  </select>
                  <ChevronDown size={16} className="absolute right-4 top-3.5 text-zinc-500 pointer-events-none" />
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

      {/* Bottom Interactive Preview & Smart Suggestions Box */}
      <div className="mt-6 bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden">
        {!hasInteracted ? (
          <div className="px-6 py-14 text-center flex flex-col items-center justify-center">
            <Search className="w-8 h-8 text-zinc-700 mb-3" />
            <h3 className="text-sm font-semibold text-zinc-300">Caixa de Resultados e Sugestões</h3>
            <p className="text-xs text-zinc-500 mt-1 max-w-md leading-relaxed">
              Selecione acima um tipo de relatório, período, fornecedor ou loja. Conforme ajustar os filtros, sugestões rápidas e os registos encontrados aparecerão automaticamente aqui.
            </p>
          </div>
        ) : (
          <div>
            {/* Header & Unboxed Active Filter Metadata */}
            <div className="px-6 py-4 border-b border-zinc-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-zinc-100 truncate">
                  {livePreview?.title || "Resultados da Pesquisa"}
                </h3>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-400 mt-1 tabular-nums">
                  <span>Período: {activePeriodLabel}</span>
                  <span aria-hidden="true">·</span>
                  <span className="truncate max-w-[240px]">Filtro: {activeEntityLabel}</span>
                  {!["iva_credito", "consumo_lojas", "fornecedores", "faturas_pagas", "pagar", "fechos"].includes(reportType) && status !== "todos" && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>Estado: {status === "pago" ? (reportType === "despesas" ? "Pagos" : "Recebidos") : reportType === "despesas" ? "Pendentes" : "A Receber"}</span>
                    </>
                  )}
                  {livePreview && !previewLoading && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="text-zinc-200 font-medium">{livePreview.rows.length} registos</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-zinc-100 font-semibold">
                        {livePreview.summaryLabel}: {formatCurrency(livePreview.summaryTotal)}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={quickSearch}
                    onChange={(e) => setQuickSearch(e.target.value)}
                    placeholder="Refinar nos resultados..."
                    className="w-full pl-8 pr-3 py-2 bg-zinc-900 border border-zinc-800 focus:border-blue-500 rounded-lg text-xs text-zinc-100 placeholder:text-zinc-500 outline-none transition-colors"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-xs font-medium text-zinc-300 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                  title="Limpar filtros e esvaziar caixa"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Limpar
                </button>
              </div>
            </div>

            {/* Contextual Smart Suggestions Bar */}
            {!previewLoading && smartSuggestions.length > 0 && (
              <div className="px-6 py-3 border-b border-zinc-800/80 bg-zinc-900/30 flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-zinc-500 mr-1 whitespace-nowrap shrink-0">
                  Sugestões para refinar:
                </span>
                {smartSuggestions.map((sug) => (
                  <button
                    key={sug.id}
                    type="button"
                    onClick={sug.apply}
                    className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-lg text-xs text-zinc-200 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer tabular-nums"
                  >
                    <span className="font-medium truncate max-w-[180px]">{sug.label}</span>
                    {sug.meta && (
                      <>
                        <span aria-hidden="true" className="text-zinc-600">·</span>
                        <span className="text-zinc-400">{sug.meta}</span>
                      </>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Results Table / Loading / Empty Result States */}
            {previewLoading ? (
              <div className="p-6 space-y-2.5">
                {[0, 1, 2, 3, 4].map((idx) => (
                  <div key={idx} className="h-9 bg-zinc-900/70 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : !livePreview || livePreview.rows.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="text-sm font-medium text-zinc-300">
                  Nenhum registo encontrado para esta combinação de filtros.
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  Experimente alargar o período ou limpar o filtro de entidade/pesquisa.
                </p>
                {((startDate !== "" || endDate !== "") || normalizedEntity !== "todos" || status !== "todos" || quickSearch !== "") && (
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                    {(startDate !== "" || endDate !== "") && (
                      <button
                        type="button"
                        onClick={() => {
                          setStartDate("");
                          setEndDate("");
                        }}
                        className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-xs font-medium text-zinc-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Limpar Datas
                      </button>
                    )}
                    {normalizedEntity !== "todos" && (
                      <button
                        type="button"
                        onClick={() => setEntity("todos")}
                        className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-xs font-medium text-zinc-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Mostrar Todas as Entidades
                      </button>
                    )}
                    {quickSearch !== "" && (
                      <button
                        type="button"
                        onClick={() => setQuickSearch("")}
                        className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-xs font-medium text-zinc-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Limpar Pesquisa Rápida
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div className="overflow-x-auto no-scrollbar">
                  <table className="w-full text-left min-w-[760px]">
                    <thead>
                      <tr className="border-b border-zinc-800 bg-zinc-900/40">
                        {livePreview.headers.map((h, i) => {
                          const isNumeric = livePreview.numericColumns.includes(i);
                          return (
                            <th
                              key={i}
                              className={cn(
                                "px-4 py-3 text-xs font-semibold text-zinc-400 whitespace-nowrap",
                                isNumeric ? "text-right" : "text-left"
                              )}
                            >
                              {h}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60 tabular-nums">
                      {livePreview.rows.slice(0, visibleLimit).map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-zinc-900/40 transition-colors">
                          {row.map((cell, cIdx) => {
                            const isNumeric = livePreview.numericColumns.includes(cIdx);
                            return (
                              <td
                                key={cIdx}
                                className={cn(
                                  "px-4 py-2.5 text-xs whitespace-nowrap",
                                  isNumeric ? "text-right font-mono text-zinc-100" : "text-zinc-300"
                                )}
                              >
                                {cell}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                    {livePreview.totalRow && quickSearch.trim() === "" && (
                      <tfoot>
                        <tr className="border-t border-zinc-800 bg-zinc-900/60 tabular-nums">
                          {livePreview.totalRow.map((cell, cIdx) => {
                            const isNumeric = livePreview.numericColumns.includes(cIdx);
                            return (
                              <td
                                key={cIdx}
                                className={cn(
                                  "px-4 py-3 text-xs font-bold whitespace-nowrap",
                                  isNumeric ? "text-right font-mono text-zinc-100" : "text-zinc-200"
                                )}
                              >
                                {cell}
                              </td>
                            );
                          })}
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>

                {livePreview.rows.length > visibleLimit && (
                  <div className="px-6 py-3 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400 tabular-nums">
                    <span>
                      A mostrar {visibleLimit} de {livePreview.rows.length} registos
                    </span>
                    <button
                      type="button"
                      onClick={() => setVisibleLimit((v) => v + 50)}
                      className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-xs font-medium text-zinc-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Mostrar mais 50
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

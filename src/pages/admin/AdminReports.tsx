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
  Users,
  Search,
  RotateCcw,
  Package,
  Check
} from "lucide-react";
import Swal from "sweetalert2";
import { motion } from "motion/react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { printGenericDocument } from "../../lib/printGenericDocument";
import { cn } from "../../lib/utils";
import { SearchableCombobox } from "../../components/ui/SearchableCombobox";
import { BrandTitle } from "../../components/BrandTitle";
import { sortCategories, sortGroupedCategories } from "../../lib/categoryUtils";

type ReportType =
  | "receber"
  | "pagar"
  | "faturas_pagas"
  | "iva_credito"
  | "debito_iva"
  | "consumo_lojas"
  | "fornecedores"
  | "fechos"
  | "estoque";

interface AppliedSearchFilters {
  reportType: ReportType;
  startDate: string;
  endDate: string;
  status: string;
  entity: string;
  centroCusto: string;
  contaAnalise: string;
  stockDate: string;
  stockCategories: string[];
}

function extractFaturaMeta(f: any, lojasList: any[]) {
  let centroCusto = "";
  let contaAnalise = "";
  let lojaId = "";

  if (f?.descrição && f.descrição !== "null") {
    try {
      const desc = typeof f.descrição === "string" ? JSON.parse(f.descrição) : f.descrição;
      lojaId = desc?.loja_id ? String(desc.loja_id).trim() : "";
      centroCusto = String(
        desc?.centro_custo ||
          (desc?.classificacao_tipo !== "conta_analise" ? desc?.classificacao_nome : "") ||
          ""
      ).trim();
      contaAnalise = String(
        desc?.conta_analise ||
          (desc?.classificacao_tipo === "conta_analise" ? desc?.classificacao_nome : "") ||
          ""
      ).trim();
    } catch {}
  }

  const lowerCC = centroCusto.toLowerCase();
  if (lowerCC === "armazém central" || lowerCC === "armazem central") {
    centroCusto = "DISTRIBUIDORA";
  } else if (
    lowerCC === "lost wind lda" ||
    lowerCC === "lost wind unipessoal" ||
    lowerCC === "lost wind unipessoal,lda" ||
    lowerCC === "lost wind unipessoal, lda" ||
    lowerCC === "administração / sede" ||
    lowerCC === "administracao / sede"
  ) {
    centroCusto = "LOST WIND UNIPESSOAL,LDA";
  } else if (!centroCusto && lojaId) {
    const st = lojasList.find((l: any) => String(l.id) === lojaId);
    if (st) centroCusto = st.name || st.nome || "";
  } else if (!centroCusto && !lojaId && f?.tipo === "compra_financeiro") {
    centroCusto = "DISTRIBUIDORA";
  }

  return { centroCusto, contaAnalise, lojaId };
}

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
  const [centroCusto, setCentroCusto] = useState("todos");
  const [contaAnalise, setContaAnalise] = useState("todos");
  const [stockDate, setStockDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [selectedStockCategories, setSelectedStockCategories] = useState<string[]>([]);

  // Bottom box state — starts empty and ONLY queries DB when clicking "Pesquisar"
  const [appliedSearch, setAppliedSearch] = useState<AppliedSearchFilters | null>(null);
  const [quickSearch, setQuickSearch] = useState("");
  const [visibleLimit, setVisibleLimit] = useState(50);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Datasets fetched ONLY when user clicks "Pesquisar" (or "Baixar Relatório")
  const [searchedFaturas, setSearchedFaturas] = useState<any[]>([]);
  const [searchedPedidos, setSearchedPedidos] = useState<any[]>([]);
  const [searchedFechos, setSearchedFechos] = useState<any[]>([]);
  const [searchedEstoque, setSearchedEstoque] = useState<any[]>([]);

  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [lojas, setLojas] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [savedContasAnalise, setSavedContasAnalise] = useState<string[]>([]);

  // Metrics
  const [totalPagarVencido, setTotalPagarVencido] = useState(0);
  const [totalPagarGeral, setTotalPagarGeral] = useState(0);
  const [totalReceberVencido, setTotalReceberVencido] = useState(0);
  const [totalRecebido, setTotalRecebido] = useState(0);
  const [saldo, setSaldo] = useState(0);

  useEffect(() => {
    const fetchGlobalMetrics = async () => {
      try {
        const [fornRes, userRes, metricsRes, catRes, contasRes] = await Promise.all([
          api.get("/admin/fornecedores").catch(() => ({ data: [] })),
          api.get("/admin/users").catch(() => ({ data: [] })),
          api.get("/admin/reports/summary-metrics").catch(() => ({ data: {} })),
          api.get("/categorias").catch(() => ({ data: [] })),
          api.get("/admin/financeiro/contas-analise").catch(() => ({ data: [] }))
        ]);

        if (Array.isArray(fornRes.data)) setFornecedores(fornRes.data);
        if (Array.isArray(userRes.data)) {
          setLojas(userRes.data.filter((u: any) => u.role === "loja"));
        }
        if (Array.isArray(catRes.data)) {
          setCategorias(sortCategories(catRes.data));
        }
        if (Array.isArray(contasRes.data)) {
          setSavedContasAnalise(contasRes.data);
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

  const normalizedEntity = !entity || entity === "todos" ? "todos" : entity;
  const normalizedCentroCusto = !centroCusto || centroCusto === "todos" ? "todos" : centroCusto;
  const normalizedContaAnalise = !contaAnalise || contaAnalise === "todos" ? "todos" : contaAnalise;

  const isDirtySinceLastSearch = useMemo(() => {
    if (!appliedSearch) return false;
    if (reportType === "estoque" || appliedSearch.reportType === "estoque") {
      if (appliedSearch.reportType !== reportType) return true;
      if (appliedSearch.stockDate !== stockDate) return true;
      const prevCats = [...(appliedSearch.stockCategories || [])].sort().join(",");
      const curCats = [...selectedStockCategories].sort().join(",");
      return prevCats !== curCats;
    }
    return (
      appliedSearch.reportType !== reportType ||
      appliedSearch.startDate !== startDate ||
      appliedSearch.endDate !== endDate ||
      appliedSearch.status !== status ||
      appliedSearch.entity !== normalizedEntity ||
      (["pagar", "faturas_pagas", "iva_credito"].includes(reportType) &&
        (appliedSearch.centroCusto !== normalizedCentroCusto ||
          appliedSearch.contaAnalise !== normalizedContaAnalise))
    );
  }, [
    appliedSearch,
    reportType,
    startDate,
    endDate,
    status,
    normalizedEntity,
    normalizedCentroCusto,
    normalizedContaAnalise,
    stockDate,
    selectedStockCategories
  ]);

  const parseRecordDate = (dateString: string): Date | null => {
    if (!dateString) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [y, m, d] = dateString.split("-").map(Number);
      return new Date(y, m - 1, d, 12, 0, 0, 0);
    }
    const dt = new Date(dateString);
    return isNaN(dt.getTime()) ? null : dt;
  };

  const filterByDateRange = (dateString: string, customStart: string, customEnd: string) => {
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

  const formatStockQty = (val: number, unit?: string) => {
    const num = Number(val || 0);
    const rounded = Math.round(num * 1000) / 1000;
    const formatted = Number.isInteger(rounded)
      ? rounded.toLocaleString("pt-PT")
      : rounded.toLocaleString("pt-PT", { minimumFractionDigits: 1, maximumFractionDigits: 3 });
    return unit ? `${formatted} ${unit}` : formatted;
  };

  const filterAndGroupEstoque = (estoqueInput: any[], selectedCats: string[], searchFilter = "") => {
    let filtered = estoqueInput;
    if (selectedCats && selectedCats.length > 0) {
      filtered = filtered.filter((item) => selectedCats.includes(String(item.categoria_id)));
    }
    if (searchFilter.trim() !== "") {
      const term = searchFilter.trim().toLowerCase();
      filtered = filtered.filter(
        (item) =>
          String(item.nome || "").toLowerCase().includes(term) ||
          String(item.categoria_nome || "").toLowerCase().includes(term)
      );
    }

    const groupedMap = new Map<string, any[]>();
    filtered.forEach((item) => {
      const catName = item.categoria_nome || "Sem Categoria";
      if (!groupedMap.has(catName)) groupedMap.set(catName, []);
      groupedMap.get(catName)!.push(item);
    });

    const sortedGroups = sortGroupedCategories(Array.from(groupedMap.entries())).map(
      ([catName, items]) => [
        catName,
        [...items].sort((a, b) => String(a.nome || "").localeCompare(String(b.nome || ""), "pt-PT"))
      ] as [string, any[]]
    );

    const flatItems = sortedGroups.flatMap(([, items]) => items);
    return { sortedGroups, flatItems };
  };

  const generateEstoquePdf = (
    estoqueInput: any[],
    selectedCats: string[],
    targetDateIso: string,
    searchFilter = ""
  ) => {
    const { sortedGroups, flatItems } = filterAndGroupEstoque(estoqueInput, selectedCats, searchFilter);
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 12;

    const todayIso = new Date().toISOString().split("T")[0];
    const effectiveDateIso = targetDateIso || todayIso;
    const dateLabel = formatIsoInputDate(effectiveDateIso);
    const emittedNow = new Date();
    const emittedLabel = `${emittedNow.toLocaleDateString("pt-PT")} ${emittedNow.toLocaleTimeString("pt-PT", {
      hour: "2-digit",
      minute: "2-digit"
    })}`;

    const catLabel =
      !selectedCats || selectedCats.length === 0
        ? "Todas as Categorias"
        : selectedCats
            .map((cid) =>
              cid === "sem_categoria"
                ? "Sem Categoria"
                : categorias.find((c) => String(c.id) === String(cid))?.nome || cid
            )
            .join(", ");

    // Top Header
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.line(marginX, 28, pageWidth - marginX, 28);

    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("RELATÓRIO DE ESTOQUE", marginX, 13);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text("Lost Wind — Armazém Central · Folha de Contagem e Conferência", marginX, 18.5);

    const catTextTrimmed = catLabel.length > 78 ? `${catLabel.slice(0, 75)}...` : catLabel;
    doc.text(`Categorias: ${catTextTrimmed}`, marginX, 24);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(`Data: ${dateLabel}`, pageWidth - marginX, 13, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text(`Total de Artigos: ${flatItems.length}`, pageWidth - marginX, 18.5, { align: "right" });
    doc.text(`Emissão: ${emittedLabel}`, pageWidth - marginX, 24, { align: "right" });

    const tableBody: any[] = [];
    sortedGroups.forEach(([catName, items]) => {
      tableBody.push([
        {
          content: `${catName.toUpperCase()} (${items.length})`,
          colSpan: 3,
          __isSection: true,
          styles: {
            fillColor: [226, 232, 240],
            textColor: [15, 23, 42],
            fontStyle: "bold",
            fontSize: 8.5,
            halign: "left",
            cellPadding: { top: 2, bottom: 2, left: 3, right: 3 }
          }
        }
      ]);

      items.forEach((item) => {
        tableBody.push([
          item.nome,
          formatStockQty(item.quantidade_atual, item.unidade_base),
          ""
        ]);
      });
    });

    if (tableBody.length === 0) {
      tableBody.push([
        {
          content: "Nenhum artigo encontrado para os filtros selecionados.",
          colSpan: 3,
          __isSection: true,
          styles: { halign: "center", textColor: [100, 116, 139], cellPadding: 6 }
        }
      ]);
    }

    autoTable(doc, {
      startY: 32,
      margin: { left: marginX, right: marginX, top: 14, bottom: 18 },
      head: [["NOME DO ARTIGO", "QUANTIDADE ATUAL", "NOVA QUANTIDADE"]],
      body: tableBody,
      theme: "grid",
      styles: {
        font: "helvetica",
        fontSize: 9,
        textColor: [15, 23, 42],
        lineColor: [203, 213, 225],
        lineWidth: 0.2,
        minCellHeight: 8.5,
        valign: "middle",
        cellPadding: { top: 1.8, bottom: 1.8, left: 3, right: 3 }
      },
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8.5,
        minCellHeight: 8
      },
      columnStyles: {
        0: { cellWidth: 104, halign: "left" },
        1: { cellWidth: 38, halign: "right", fontStyle: "bold" },
        2: { cellWidth: 44, halign: "center" }
      },
      didParseCell: (data: any) => {
        if (data.section === "head") {
          if (data.column.index === 1) data.cell.styles.halign = "right";
          if (data.column.index === 2) data.cell.styles.halign = "center";
        }
      },
      didDrawCell: (data: any) => {
        if (
          data.section === "body" &&
          data.column.index === 2 &&
          !(data.row.raw as any)?.[0]?.__isSection
        ) {
          const boxX = data.cell.x + 3;
          const boxY = data.cell.y + 1.5;
          const boxW = data.cell.width - 6;
          const boxH = data.cell.height - 3;
          doc.setDrawColor(148, 163, 184);
          doc.setLineWidth(0.25);
          doc.setFillColor(255, 255, 255);
          doc.roundedRect(boxX, boxY, boxW, boxH, 0.8, 0.8, "FD");
        }
      }
    });

    // Signature strip after table
    const finalY = (doc as any).lastAutoTable?.finalY || 40;
    let sigY = finalY + 12;
    if (sigY > pageHeight - 22) {
      doc.addPage();
      sigY = 24;
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(
      "Conferido por: ___________________________________________      Data da Contagem: ____ / ____ / ________",
      marginX,
      sigY
    );

    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(`Lost Wind — Relatório de Estoque (${dateLabel})`, marginX, pageHeight - 7);
      doc.text(`Página ${p} de ${totalPages}`, pageWidth - marginX, pageHeight - 7, { align: "right" });
    }

    doc.save(`Relatorio_Estoque_${effectiveDateIso}.pdf`);
  };

  const fetchDatasetsForType = async (
    targetType: ReportType,
    targetStartDate: string,
    targetStockDate = ""
  ) => {
    const needsFaturas = ["pagar", "faturas_pagas", "iva_credito", "consumo_lojas", "fornecedores"].includes(targetType);
    const needsPedidos = ["receber", "debito_iva", "consumo_lojas"].includes(targetType);
    const needsFechos = targetType === "fechos";
    const needsEstoque = targetType === "estoque";

    let faturasData: any[] = [];
    let pedidosData: any[] = [];
    let fechosData: any[] = [];
    let estoqueData: any[] = [];

    const tasks: PromiseLike<void>[] = [];

    if (needsFaturas) {
      tasks.push(
        api
          .get("/admin/faturas")
          .then((res) => {
            faturasData = Array.isArray(res.data) ? res.data : [];
          })
          .catch(() => {
            faturasData = [];
          })
      );
    }

    if (needsPedidos) {
      const pedidosUrl = targetStartDate
        ? `/pedidos?all=true&startDate=${encodeURIComponent(targetStartDate)}`
        : "/pedidos?all=true";
      tasks.push(
        api
          .get(pedidosUrl)
          .then((res) => {
            pedidosData = Array.isArray(res.data) ? res.data : [];
          })
          .catch(() => {
            pedidosData = [];
          })
      );
    }

    if (needsFechos) {
      tasks.push(
        api
          .get("/admin/fechos")
          .then((res) => {
            fechosData = Array.isArray(res.data) ? res.data : [];
          })
          .catch(() => {
            fechosData = [];
          })
      );
    }

    if (needsEstoque) {
      tasks.push(
        api
          .get("/admin/reports/estoque", {
            params: { date: targetStockDate || undefined }
          })
          .then((res) => {
            estoqueData = Array.isArray(res.data) ? res.data : [];
          })
          .catch(() => {
            estoqueData = [];
          })
      );
    }

    await Promise.all(tasks);
    return { faturasData, pedidosData, fechosData, estoqueData };
  };

  // Explicit search handler — ONLY called when clicking the "Pesquisar" button
  const handleSearch = async () => {
    const nextFilters: AppliedSearchFilters = {
      reportType,
      startDate,
      endDate,
      status,
      entity: normalizedEntity,
      centroCusto: normalizedCentroCusto,
      contaAnalise: normalizedContaAnalise,
      stockDate,
      stockCategories: [...selectedStockCategories]
    };

    setPreviewLoading(true);
    setVisibleLimit(50);
    setQuickSearch("");
    setAppliedSearch(nextFilters);

    try {
      const { faturasData, pedidosData, fechosData, estoqueData } = await fetchDatasetsForType(
        nextFilters.reportType,
        nextFilters.startDate,
        nextFilters.stockDate
      );
      setSearchedFaturas(faturasData);
      setSearchedPedidos(pedidosData);
      setSearchedFechos(fechosData);
      setSearchedEstoque(estoqueData);
    } catch (err) {
      console.error("Erro ao pesquisar relatórios:", err);
      Swal.fire("Erro", "Falha ao consultar os dados do relatório.", "error");
    } finally {
      setPreviewLoading(false);
    }
  };

  const computeReportResult = (
    activeFilters: AppliedSearchFilters,
    faturasInput: any[],
    pedidosInput: any[],
    fechosInput: any[],
    estoqueInput: any[] = [],
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
    const {
      reportType: rType,
      startDate: sDate,
      endDate: eDate,
      status: stFilter,
      entity: entFilter,
      centroCusto: ccFilter = "todos",
      contaAnalise: caFilter = "todos"
    } = activeFilters;

    let rows: string[][] = [];
    let totalRow: string[] | null = null;
    let headers: string[] = [];
    let title = "Relatório";
    let summaryTotal = 0;
    let summaryLabel = "Total";
    let numericColumns: number[] = [];

    if (rType === "pagar") {
      const filtered = faturasInput.filter((f) => {
        if (f.tipo !== "compra_financeiro" || f.status_pagamento === "em_conferencia") return false;
        const periodMatch = filterByDateRange(f.data_emissao, sDate, eDate);

        let statusMatch = true;
        if (stFilter === "pago") {
          statusMatch = f.status_pagamento === "pago";
        } else if (stFilter === "nao_pago") {
          statusMatch = f.status_pagamento !== "pago";
        }

        const fornecedorMatch =
          entFilter === "todos" ||
          String(f.fornecedor_id) === entFilter.replace("fornecedor_", "");

        const meta = extractFaturaMeta(f, lojas);

        let centroCustoMatch = true;
        if (ccFilter !== "todos") {
          if (ccFilter === "cc:DISTRIBUIDORA") {
            centroCustoMatch =
              meta.centroCusto.toUpperCase() === "DISTRIBUIDORA" ||
              (!meta.centroCusto && !meta.lojaId);
          } else if (ccFilter === "cc:LOST WIND UNIPESSOAL,LDA") {
            centroCustoMatch = meta.centroCusto.toUpperCase() === "LOST WIND UNIPESSOAL,LDA";
          } else if (ccFilter.startsWith("loja:")) {
            const sId = ccFilter.replace("loja:", "");
            const st = lojas.find((l: any) => String(l.id) === sId);
            const stName = String(st?.name || st?.nome || "").toLowerCase();
            centroCustoMatch =
              meta.lojaId === sId ||
              Boolean(stName && meta.centroCusto.toLowerCase() === stName);
          } else if (ccFilter.startsWith("custom:")) {
            const customName = ccFilter.replace("custom:", "");
            centroCustoMatch = meta.centroCusto.toLowerCase() === customName.toLowerCase();
          }
        }

        let contaAnaliseMatch = true;
        if (caFilter !== "todos") {
          contaAnaliseMatch = meta.contaAnalise.toLowerCase() === caFilter.toLowerCase();
        }

        return periodMatch && statusMatch && fornecedorMatch && centroCustoMatch && contaAnaliseMatch;
      });

      headers = [
        "Data Emissão",
        "Vencimento",
        "Fornecedor",
        "Centro de Custo",
        "Conta de Análise",
        "Nº Fatura",
        "Total (€)",
        "Pendente (€)",
        "Estado"
      ];
      numericColumns = [6, 7];
      title = "Relatório de Faturas a Pagar";

      let totalValor = 0;
      let totalPendente = 0;
      rows = filtered.map((f) => {
        const calcTotal = Number(f.valor_total || 0);
        const calcPendente =
          f.status_pagamento === "pago"
            ? 0
            : Number(f.valor_pendente !== undefined && f.valor_pendente !== null ? f.valor_pendente : calcTotal);
        const meta = extractFaturaMeta(f, lojas);

        totalValor += calcTotal;
        totalPendente += calcPendente;

        const estadoLabel =
          f.status_pagamento === "pago"
            ? "PAGO"
            : f.status_pagamento === "parcial"
            ? "PARCIAL"
            : "PENDENTE";

        return [
          f.data_emissao ? new Date(f.data_emissao).toLocaleDateString("pt-PT") : "N/A",
          f.data_vencimento ? new Date(f.data_vencimento).toLocaleDateString("pt-PT") : "N/A",
          f.fornecedor?.nome || "N/A",
          meta.centroCusto || "DISTRIBUIDORA",
          meta.contaAnalise || "---",
          f.numero_fatura || "N/A",
          calcTotal.toFixed(2),
          calcPendente.toFixed(2),
          estadoLabel
        ];
      });

      if (stFilter === "pago") {
        summaryTotal = totalValor;
        summaryLabel = "Total Pago";
      } else if (stFilter === "nao_pago") {
        summaryTotal = totalPendente;
        summaryLabel = "Total Pendente";
      } else {
        summaryTotal = totalValor;
        summaryLabel = "Valor Total";
      }
      totalRow = ["", "", "", "", "", "TOTAL CALCULADO", totalValor.toFixed(2), totalPendente.toFixed(2), ""];
    } else if (rType === "faturas_pagas") {
      const filtered = faturasInput.filter((f) => {
        if (f.tipo !== "compra_financeiro" || f.status_pagamento !== "pago") return false;
        const periodMatch = filterByDateRange(f.data_emissao, sDate, eDate);

        const fornecedorMatch =
          entFilter === "todos" ||
          String(f.fornecedor_id) === entFilter.replace("fornecedor_", "");

        const meta = extractFaturaMeta(f, lojas);

        let centroCustoMatch = true;
        if (ccFilter !== "todos") {
          if (ccFilter === "cc:DISTRIBUIDORA") {
            centroCustoMatch =
              meta.centroCusto.toUpperCase() === "DISTRIBUIDORA" ||
              (!meta.centroCusto && !meta.lojaId);
          } else if (ccFilter === "cc:LOST WIND UNIPESSOAL,LDA") {
            centroCustoMatch = meta.centroCusto.toUpperCase() === "LOST WIND UNIPESSOAL,LDA";
          } else if (ccFilter.startsWith("loja:")) {
            const sId = ccFilter.replace("loja:", "");
            const st = lojas.find((l: any) => String(l.id) === sId);
            const stName = String(st?.name || st?.nome || "").toLowerCase();
            centroCustoMatch =
              meta.lojaId === sId ||
              Boolean(stName && meta.centroCusto.toLowerCase() === stName);
          } else if (ccFilter.startsWith("custom:")) {
            const customName = ccFilter.replace("custom:", "");
            centroCustoMatch = meta.centroCusto.toLowerCase() === customName.toLowerCase();
          }
        }

        let contaAnaliseMatch = true;
        if (caFilter !== "todos") {
          contaAnaliseMatch = meta.contaAnalise.toLowerCase() === caFilter.toLowerCase();
        }

        return periodMatch && fornecedorMatch && centroCustoMatch && contaAnaliseMatch;
      });

      headers = [
        "Data Emissão",
        "Vencimento",
        "Fornecedor",
        "Centro de Custo",
        "Conta de Análise",
        "Nº Fatura",
        "Total (€)",
        "Estado"
      ];
      numericColumns = [6];
      title = "Relatório de Faturas Pagas";

      let totalValor = 0;
      rows = filtered.map((f) => {
        const calcTotal = Number(f.valor_total || 0);
        const meta = extractFaturaMeta(f, lojas);
        totalValor += calcTotal;

        return [
          f.data_emissao ? new Date(f.data_emissao).toLocaleDateString("pt-PT") : "N/A",
          f.data_vencimento ? new Date(f.data_vencimento).toLocaleDateString("pt-PT") : "N/A",
          f.fornecedor?.nome || "N/A",
          meta.centroCusto || "DISTRIBUIDORA",
          meta.contaAnalise || "---",
          f.numero_fatura || "N/A",
          calcTotal.toFixed(2),
          "PAGO"
        ];
      });

      summaryTotal = totalValor;
      summaryLabel = "Total Pago";
      totalRow = ["", "", "", "", "", "TOTAL PAGO", totalValor.toFixed(2), ""];
    } else if (rType === "iva_credito") {
      const filtered = faturasInput.filter((f) => {
        if (f.tipo !== "compra_financeiro" || f.status_pagamento === "em_conferencia") return false;
        const periodMatch = filterByDateRange(f.data_emissao, sDate, eDate);
        const fornecedorMatch =
          entFilter === "todos" ||
          String(f.fornecedor_id) === entFilter.replace("fornecedor_", "");

        const meta = extractFaturaMeta(f, lojas);

        let centroCustoMatch = true;
        if (ccFilter !== "todos") {
          if (ccFilter === "cc:DISTRIBUIDORA") {
            centroCustoMatch =
              meta.centroCusto.toUpperCase() === "DISTRIBUIDORA" ||
              (!meta.centroCusto && !meta.lojaId);
          } else if (ccFilter === "cc:LOST WIND UNIPESSOAL,LDA") {
            centroCustoMatch = meta.centroCusto.toUpperCase() === "LOST WIND UNIPESSOAL,LDA";
          } else if (ccFilter.startsWith("loja:")) {
            const sId = ccFilter.replace("loja:", "");
            const st = lojas.find((l: any) => String(l.id) === sId);
            const stName = String(st?.name || st?.nome || "").toLowerCase();
            centroCustoMatch =
              meta.lojaId === sId ||
              Boolean(stName && meta.centroCusto.toLowerCase() === stName);
          } else if (ccFilter.startsWith("custom:")) {
            const customName = ccFilter.replace("custom:", "");
            centroCustoMatch = meta.centroCusto.toLowerCase() === customName.toLowerCase();
          }
        }

        let contaAnaliseMatch = true;
        if (caFilter !== "todos") {
          contaAnaliseMatch = meta.contaAnalise.toLowerCase() === caFilter.toLowerCase();
        }

        return periodMatch && fornecedorMatch && centroCustoMatch && contaAnaliseMatch;
      });

      headers = [
        "Data Emissão",
        "Fornecedor",
        "NIF",
        "Centro de Custo",
        "Conta de Análise",
        "Nº Fatura",
        "Líquido (€)",
        "IVA Recuperável (€)",
        "Total (€)"
      ];
      numericColumns = [6, 7, 8];
      title = "Relatório de Crédito IVA (Compras) — Recuperável";

      let totalLiquido = 0;
      let totalIvaResultante = 0;
      let totalBruto = 0;

      filtered.forEach((f) => {
        const ivaCredito = getFaturaIva(f);
        if (ivaCredito > 0) {
          const calcTotal = Number(f.valor_total || 0);
          const calcLiquido =
            f.valor_liquido !== undefined && f.valor_liquido !== null
              ? Number(f.valor_liquido)
              : Math.max(0, calcTotal - ivaCredito);
          const meta = extractFaturaMeta(f, lojas);

          totalLiquido += calcLiquido;
          totalIvaResultante += ivaCredito;
          totalBruto += calcTotal;

          rows.push([
            f.data_emissao ? new Date(f.data_emissao).toLocaleDateString("pt-PT") : "N/A",
            f.fornecedor?.nome || "N/A",
            f.fornecedor?.nif || f.fornecedor?.contribuinte || "---",
            meta.centroCusto || "DISTRIBUIDORA",
            meta.contaAnalise || "---",
            f.numero_fatura || "N/A",
            calcLiquido.toFixed(2),
            ivaCredito.toFixed(2),
            calcTotal.toFixed(2)
          ]);
        }
      });

      summaryTotal = totalIvaResultante;
      summaryLabel = "Crédito IVA (Compras) Recuperável";
      totalRow = [
        "",
        "",
        "",
        "",
        "",
        "TOTAL RECUPERÁVEL",
        totalLiquido.toFixed(2),
        totalIvaResultante.toFixed(2),
        totalBruto.toFixed(2)
      ];
    } else if (rType === "debito_iva") {
      const filtered = pedidosInput.filter((p) => {
        const isValidState = ["pronto", "entregue", "concluido"].includes(p.status?.toLowerCase());
        const periodMatch = filterByDateRange(p.created_at, sDate, eDate);
        const lojaMatch = entFilter === "todos" || String(p.user_id) === entFilter;

        let statusMatch = true;
        if (stFilter !== "todos") {
          if (stFilter === "pago") statusMatch = p.status?.toLowerCase() === "concluido";
          if (stFilter === "nao_pago") statusMatch = ["pronto", "entregue"].includes(p.status?.toLowerCase());
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
    } else if (rType === "receber") {
      const filtered = pedidosInput.filter((p) => {
        const isReceberBase = ["pronto", "entregue", "concluido"].includes(p.status?.toLowerCase());
        const periodMatch = filterByDateRange(p.created_at, sDate, eDate);

        let statusMatch = true;
        if (stFilter !== "todos") {
          if (stFilter === "pago") statusMatch = p.status?.toLowerCase() === "concluido";
          if (stFilter === "nao_pago") statusMatch = ["pronto", "entregue"].includes(p.status?.toLowerCase());
        }

        const lojaMatch = entFilter === "todos" || String(p.user_id) === entFilter;
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
    } else if (rType === "fechos") {
      const filtered = fechosInput
        .filter((f) => {
          const periodMatch = filterByDateRange(f.data, sDate, eDate);
          const entityMatch = entFilter === "todos" || String(f.loja_id) === entFilter;
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
    } else if (rType === "consumo_lojas") {
      const pedidos = pedidosInput.filter((p: any) => filterByDateRange(p.created_at, sDate, eDate));
      const faturas = faturasInput.filter(
        (f: any) =>
          f.tipo === "compra_financeiro" &&
          f.status_pagamento !== "em_conferencia" &&
          filterByDateRange(f.data_emissao, sDate, eDate)
      );

      const lojaStats: Record<string, { id: string; nome: string; consumo: number; custos: number }> = {};

      lojas.forEach((l) => {
        lojaStats[String(l.id)] = {
          id: String(l.id),
          nome: l.name || l.nome || "Loja " + l.id,
          consumo: 0,
          custos: 0
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
        const meta = extractFaturaMeta(f, lojas);
        let targetLojaId = meta.lojaId && lojaStats[meta.lojaId] ? meta.lojaId : "";
        if (!targetLojaId && meta.centroCusto) {
          const ccLower = meta.centroCusto.toLowerCase();
          const matchedLoja = lojas.find(
            (l: any) => String(l.name || l.nome || "").trim().toLowerCase() === ccLower
          );
          if (matchedLoja) targetLojaId = String(matchedLoja.id);
        }
        if (targetLojaId && lojaStats[targetLojaId]) {
          lojaStats[targetLojaId].custos += Number(f.valor_total || 0);
        }
      });

      let listStats = Object.values(lojaStats);
      if (entFilter !== "todos") {
        listStats = listStats.filter((s) => s.id === entFilter);
      }

      headers = ["Loja", "Consumo Armazém (€)", "Custos (€)", "Total Gastos (€)"];
      numericColumns = [1, 2, 3];
      title = "Relatório de Compra + Custo das Lojas";

      let totC = 0, totCustos = 0, totGen = 0;
      rows = listStats.map((s) => {
        totC += s.consumo;
        totCustos += s.custos;
        const tot = s.consumo + s.custos;
        totGen += tot;
        return [s.nome, s.consumo.toFixed(2), s.custos.toFixed(2), tot.toFixed(2)];
      });

      summaryTotal = totGen;
      summaryLabel = "Total Compra + Custo";
      totalRow = ["TOTAL", totC.toFixed(2), totCustos.toFixed(2), totGen.toFixed(2)];
    } else if (rType === "fornecedores") {
      const faturasPeriodo = faturasInput.filter((f: any) => filterByDateRange(f.data_emissao, sDate, eDate));
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
      if (entFilter !== "todos") {
        filteredForn = filteredForn.filter((fn) => String(fn.id) === entFilter);
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
    } else if (rType === "estoque") {
      const { flatItems } = filterAndGroupEstoque(estoqueInput, activeFilters.stockCategories || [], "");
      headers = ["Categoria", "Nome do Artigo", "Quantidade Atual", "Nova Quantidade"];
      numericColumns = [2];
      title = "Relatório de Estoque";

      rows = flatItems.map((item) => [
        item.categoria_nome || "Sem Categoria",
        item.nome || "Artigo",
        formatStockQty(item.quantidade_atual, item.unidade_base),
        "________________"
      ]);

      summaryTotal = rows.length;
      summaryLabel = "Total de Artigos";
      totalRow = null;
    }

    if (searchFilter.trim() !== "") {
      const term = searchFilter.trim().toLowerCase();
      rows = rows.filter((r) => r.some((cell) => String(cell).toLowerCase().includes(term)));
      if (rType === "estoque") {
        summaryTotal = rows.length;
      }
    }

    return { title, headers, rows, totalRow, summaryTotal, summaryLabel, numericColumns };
  };

  const livePreview = useMemo(() => {
    if (!appliedSearch) return null;
    return computeReportResult(
      appliedSearch,
      searchedFaturas,
      searchedPedidos,
      searchedFechos,
      searchedEstoque,
      quickSearch
    );
  }, [appliedSearch, searchedFaturas, searchedPedidos, searchedFechos, searchedEstoque, quickSearch, fornecedores, lojas]);

  // Suggestions computed strictly in-memory over the dataset fetched by "Pesquisar" (zero extra DB calls)
  const smartSuggestions = useMemo<QuickSuggestion[]>(() => {
    if (!appliedSearch) return [];
    const {
      reportType: rType,
      startDate: sDate,
      endDate: eDate,
      status: stFilter,
      entity: entFilter
    } = appliedSearch;

    const list: QuickSuggestion[] = [];

    if (rType === "estoque") {
      if (!appliedSearch.stockCategories || appliedSearch.stockCategories.length === 0) {
        const catCounts = new Map<string, { id: string; nome: string; count: number }>();
        searchedEstoque.forEach((item) => {
          const cid = String(item.categoria_id || "sem_categoria");
          const cnome = item.categoria_nome || "Sem Categoria";
          const cur = catCounts.get(cid) || { id: cid, nome: cnome, count: 0 };
          cur.count += 1;
          catCounts.set(cid, cur);
        });

        Array.from(catCounts.values())
          .sort((a, b) => b.count - a.count)
          .slice(0, 6)
          .forEach((cat) => {
            list.push({
              id: `sug_est_cat_${cat.id}`,
              label: cat.nome,
              meta: `${cat.count} art.`,
              apply: () => {
                setSelectedStockCategories([cat.id]);
                setAppliedSearch((prev) => (prev ? { ...prev, stockCategories: [cat.id] } : null));
                setVisibleLimit(50);
              }
            });
          });
      }
      return list;
    }

    // 1. In-memory date-range refinements when no dates were entered yet
    if (!sDate && !eDate) {
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

      if (["pagar", "faturas_pagas", "iva_credito", "fornecedores"].includes(rType)) {
        searchedFaturas.forEach((f) => {
          if (rType === "pagar") {
            if (f.tipo !== "compra_financeiro" || f.status_pagamento === "em_conferencia") return;
            if (stFilter === "pago" && f.status_pagamento !== "pago") return;
            if (stFilter === "nao_pago" && f.status_pagamento === "pago") return;
          }
          if (rType === "faturas_pagas" && (f.tipo !== "compra_financeiro" || f.status_pagamento !== "pago")) return;
          if (rType === "iva_credito" && (f.tipo !== "compra_financeiro" || f.status_pagamento === "em_conferencia" || getFaturaIva(f) <= 0)) return;
          registerDate(f.data_emissao);
        });
      } else if (["receber", "debito_iva", "consumo_lojas"].includes(rType)) {
        searchedPedidos.forEach((p) => {
          if (!["pronto", "entregue", "concluido"].includes(p.status?.toLowerCase())) return;
          registerDate(p.created_at);
        });
      } else if (rType === "fechos") {
        searchedFechos.forEach((f) => registerDate(f.data));
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
              setAppliedSearch((prev) => (prev ? { ...prev, startDate: sIso, endDate: eIso } : null));
              setVisibleLimit(50);
            }
          });
        });
    }

    // 2. Top Supplier / Store refinements within already-fetched records
    if (entFilter === "todos") {
      if (["pagar", "faturas_pagas", "iva_credito", "fornecedores"].includes(rType)) {
        const map = new Map<string, { nome: string; count: number; val: number; entityVal: string }>();
        searchedFaturas.forEach((f) => {
          if (!f.fornecedor_id || !filterByDateRange(f.data_emissao, sDate, eDate)) return;
          if (rType === "pagar") {
            if (f.tipo !== "compra_financeiro" || f.status_pagamento === "em_conferencia") return;
            if (stFilter === "pago" && f.status_pagamento !== "pago") return;
            if (stFilter === "nao_pago" && f.status_pagamento === "pago") return;
          }
          if (rType === "faturas_pagas" && (f.tipo !== "compra_financeiro" || f.status_pagamento !== "pago")) return;
          if (rType === "iva_credito" && (f.tipo !== "compra_financeiro" || f.status_pagamento === "em_conferencia" || getFaturaIva(f) <= 0)) return;

          const fid = String(f.fornecedor_id);
          const entityVal = fid;
          const nome = f.fornecedor?.nome || fornecedores.find((fn) => String(fn.id) === fid)?.nome || `Fornecedor #${fid}`;
          const amount =
            rType === "iva_credito"
              ? getFaturaIva(f)
              : rType === "pagar" && stFilter === "nao_pago"
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
                setAppliedSearch((prev) => (prev ? { ...prev, entity: item.entityVal } : null));
                setVisibleLimit(50);
              }
            });
          });
      } else if (["receber", "debito_iva", "consumo_lojas"].includes(rType)) {
        const map = new Map<string, { nome: string; count: number; val: number }>();
        searchedPedidos.forEach((p) => {
          if (!["pronto", "entregue", "concluido"].includes(p.status?.toLowerCase())) return;
          if (!filterByDateRange(p.created_at, sDate, eDate)) return;
          if (stFilter === "pago" && p.status?.toLowerCase() !== "concluido") return;
          if (stFilter === "nao_pago" && !["pronto", "entregue"].includes(p.status?.toLowerCase())) return;

          const lid = String(p.user_id);
          const nome = p.loja_nome || lojas.find((l) => String(l.id) === lid)?.name || `Loja #${lid}`;
          const amount = rType === "debito_iva" ? getPedidoIva(p) : getPedidoTotalComIva(p);
          if (rType === "debito_iva" && amount <= 0) return;

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
                setAppliedSearch((prev) => (prev ? { ...prev, entity: lid } : null));
                setVisibleLimit(50);
              }
            });
          });
      }
    }

    // 3. Payment status refinements within already-fetched records
    if (stFilter === "todos" && ["pagar", "receber", "debito_iva"].includes(rType)) {
      if (rType === "pagar") {
        const base = searchedFaturas.filter((f) => {
          if (f.tipo !== "compra_financeiro" || f.status_pagamento === "em_conferencia") return false;
          if (!filterByDateRange(f.data_emissao, sDate, eDate)) return false;
          return entFilter === "todos" || String(f.fornecedor_id) === entFilter.replace("fornecedor_", "");
        });
        const unpaid = base.filter((f) => f.status_pagamento !== "pago").length;
        const paid = base.filter((f) => f.status_pagamento === "pago").length;
        if (unpaid > 0) {
          list.push({
            id: "sug_status_pagar_pendente",
            label: "Apenas Pendentes",
            meta: `${unpaid} fat.`,
            apply: () => {
              setStatus("nao_pago");
              setAppliedSearch((prev) => (prev ? { ...prev, status: "nao_pago" } : null));
              setVisibleLimit(50);
            }
          });
        }
        if (paid > 0) {
          list.push({
            id: "sug_status_pagar_pago",
            label: "Apenas Pagos",
            meta: `${paid} fat.`,
            apply: () => {
              setStatus("pago");
              setAppliedSearch((prev) => (prev ? { ...prev, status: "pago" } : null));
              setVisibleLimit(50);
            }
          });
        }
      } else {
        const base = searchedPedidos.filter((p) => {
          if (!["pronto", "entregue", "concluido"].includes(p.status?.toLowerCase())) return false;
          if (!filterByDateRange(p.created_at, sDate, eDate)) return false;
          return entFilter === "todos" || String(p.user_id) === entFilter;
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
              setAppliedSearch((prev) => (prev ? { ...prev, status: "nao_pago" } : null));
              setVisibleLimit(50);
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
              setAppliedSearch((prev) => (prev ? { ...prev, status: "pago" } : null));
              setVisibleLimit(50);
            }
          });
        }
      }
    }

    return list;
  }, [appliedSearch, searchedFaturas, searchedPedidos, searchedFechos, searchedEstoque, fornecedores, lojas]);

  const handleExport = async () => {
    setLoading(true);
    try {
      const exportFilters: AppliedSearchFilters = {
        reportType,
        startDate,
        endDate,
        status,
        entity: normalizedEntity,
        centroCusto: normalizedCentroCusto,
        contaAnalise: normalizedContaAnalise,
        stockDate,
        stockCategories: [...selectedStockCategories]
      };

      let faturasData = searchedFaturas;
      let pedidosData = searchedPedidos;
      let fechosData = searchedFechos;
      let estoqueData = searchedEstoque;

      // Only query DB on export if we haven't already fetched for the exact current filters
      if (!appliedSearch || isDirtySinceLastSearch) {
        const fetched = await fetchDatasetsForType(
          exportFilters.reportType,
          exportFilters.startDate,
          exportFilters.stockDate
        );
        faturasData = fetched.faturasData;
        pedidosData = fetched.pedidosData;
        fechosData = fetched.fechosData;
        estoqueData = fetched.estoqueData;
      }

      const activeQuickSearch = !isDirtySinceLastSearch ? quickSearch : "";

      if (reportType === "estoque") {
        if (format === "pdf") {
          generateEstoquePdf(
            estoqueData,
            exportFilters.stockCategories,
            exportFilters.stockDate,
            activeQuickSearch
          );
        } else {
          const { flatItems } = filterAndGroupEstoque(
            estoqueData,
            exportFilters.stockCategories,
            activeQuickSearch
          );
          const csvRows = [
            ["Categoria", "Nome do Artigo", "Quantidade Atual", "Unidade", "Nova Quantidade"].join(";"),
            ...flatItems.map((it) =>
              [
                `"${String(it.categoria_nome || "Sem Categoria").replace(/"/g, '""')}"`,
                `"${String(it.nome || "").replace(/"/g, '""')}"`,
                `"${formatStockQty(it.quantidade_atual)}"`,
                `"${it.unidade_base || "un"}"`,
                `""`
              ].join(";")
            )
          ].join("\n");

          const blob = new Blob(["\uFEFF" + csvRows], { type: "text/csv;charset=utf-8;" });
          const link = document.createElement("a");
          const url = URL.createObjectURL(blob);
          link.setAttribute("href", url);
          link.setAttribute(
            "download",
            `Relatorio_Estoque_${exportFilters.stockDate || new Date().toISOString().split("T")[0]}.csv`
          );
          link.style.visibility = "hidden";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } else {
        const computed = computeReportResult(
          exportFilters,
          faturasData,
          pedidosData,
          fechosData,
          estoqueData,
          activeQuickSearch
        );
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
    { id: "receber", title: "A Receber", icon: TrendingUp, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500" },
    { id: "iva_credito", title: "Crédito IVA", icon: FileSpreadsheet, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500" },
    { id: "debito_iva", title: "Débito IVA", icon: FileSpreadsheet, color: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500" },
    { id: "fechos", title: "Fechos de Caixa", icon: Store, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500" },
    { id: "consumo_lojas", title: "Compra + Custo", icon: Store, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500" },
    { id: "fornecedores", title: "Fornecedores", icon: Users, color: "text-cyan-500", bg: "bg-cyan-500/10", border: "border-cyan-500" },
    { id: "estoque", title: "Estoque", icon: Package, color: "text-teal-400", bg: "bg-teal-500/10", border: "border-teal-500" }
  ];

  const getEntityOptionsForType = (rType: ReportType) => [
    {
      id: "todos",
      nome: ["pagar", "faturas_pagas", "iva_credito", "fornecedores"].includes(rType)
        ? "Todos os Fornecedores"
        : "Todos(as)"
    },
    ...(["pagar", "faturas_pagas", "iva_credito", "fornecedores"].includes(rType)
      ? fornecedores.map((f) => ({ id: String(f.id), nome: f.nome }))
      : []),
    ...(["receber", "consumo_lojas", "debito_iva", "fechos"].includes(rType)
      ? lojas.map((l) => ({ id: String(l.id), nome: l.name || l.nome }))
      : [])
  ];

  const entityOptions = useMemo(() => getEntityOptionsForType(reportType), [reportType, fornecedores, lojas]);

  const centroCustoOptions = useMemo(() => {
    const customCentros = new Set<string>();
    const storeNames = new Set(lojas.map((l: any) => String(l.name || l.nome || "").toLowerCase()));
    const builtIn = new Set([
      "distribuidora",
      "lost wind lda",
      "lost wind unipessoal",
      "lost wind unipessoal,lda",
      "lost wind unipessoal, lda",
      "armazém central",
      "armazem central",
      "administração / sede",
      "administracao / sede",
      "logística / frota",
      "logistica / frota",
      "logistica/frota",
      "logística/frota",
      "a"
    ]);

    searchedFaturas.forEach((f) => {
      if (f.tipo !== "compra_financeiro" || f.status_pagamento === "em_conferencia") return;
      const meta = extractFaturaMeta(f, lojas);
      if (
        meta.centroCusto &&
        !builtIn.has(meta.centroCusto.toLowerCase()) &&
        !storeNames.has(meta.centroCusto.toLowerCase())
      ) {
        customCentros.add(meta.centroCusto);
      }
    });

    return [
      { id: "todos", nome: "Todos os Centros de Custo" },
      { id: "cc:DISTRIBUIDORA", nome: "DISTRIBUIDORA" },
      { id: "cc:LOST WIND UNIPESSOAL,LDA", nome: "LOST WIND UNIPESSOAL,LDA" },
      ...lojas.map((l: any) => ({ id: `loja:${l.id}`, nome: l.name || l.nome })),
      ...Array.from(customCentros)
        .sort((a, b) => a.localeCompare(b, "pt-PT"))
        .map((cc) => ({ id: `custom:${cc}`, nome: cc }))
    ];
  }, [lojas, searchedFaturas]);

  const contaAnaliseOptions = useMemo(() => {
    const contasMap = new Map<string, string>();
    savedContasAnalise.forEach((ca) => {
      const clean = String(ca || "").trim();
      if (clean && !contasMap.has(clean.toLowerCase())) {
        contasMap.set(clean.toLowerCase(), clean);
      }
    });
    searchedFaturas.forEach((f) => {
      if (f.tipo !== "compra_financeiro" || f.status_pagamento === "em_conferencia") return;
      const meta = extractFaturaMeta(f, lojas);
      if (meta.contaAnalise && !contasMap.has(meta.contaAnalise.toLowerCase())) {
        contasMap.set(meta.contaAnalise.toLowerCase(), meta.contaAnalise);
      }
    });

    return [
      { id: "todos", nome: "Todas as Contas de Análise" },
      ...Array.from(contasMap.values())
        .sort((a, b) => a.localeCompare(b, "pt-PT"))
        .map((ca) => ({ id: ca, nome: ca }))
    ];
  }, [savedContasAnalise, searchedFaturas, lojas]);

  const appliedPeriodLabel = useMemo(() => {
    if (!appliedSearch) return "Todas as datas";
    if (appliedSearch.reportType === "estoque") {
      return appliedSearch.stockDate ? formatIsoInputDate(appliedSearch.stockDate) : "Atual (Hoje)";
    }
    const { startDate: s, endDate: e } = appliedSearch;
    if (s && e) return `${formatIsoInputDate(s)} a ${formatIsoInputDate(e)}`;
    if (s) return `Desde ${formatIsoInputDate(s)}`;
    if (e) return `Até ${formatIsoInputDate(e)}`;
    return "Todas as datas";
  }, [appliedSearch]);

  const appliedEntityLabel = useMemo(() => {
    if (!appliedSearch) return "Todos(as)";
    if (appliedSearch.reportType === "estoque") {
      const cats = appliedSearch.stockCategories || [];
      if (cats.length === 0) return "Todas as Categorias";
      return cats
        .map((cid) =>
          cid === "sem_categoria"
            ? "Sem Categoria"
            : categorias.find((c) => String(c.id) === String(cid))?.nome || cid
        )
        .join(", ");
    }
    if (appliedSearch.entity === "todos") {
      return ["pagar", "faturas_pagas", "iva_credito", "fornecedores"].includes(appliedSearch.reportType)
        ? "Todos os Fornecedores"
        : "Todos(as)";
    }
    const opts = getEntityOptionsForType(appliedSearch.reportType);
    const found = opts.find((o) => String(o.id) === String(appliedSearch.entity));
    return found ? found.nome : appliedSearch.entity;
  }, [appliedSearch, fornecedores, lojas, categorias]);

  const appliedCentroCustoLabel = useMemo(() => {
    if (!appliedSearch || !appliedSearch.centroCusto || appliedSearch.centroCusto === "todos") {
      return "Todos";
    }
    const found = centroCustoOptions.find((o) => String(o.id) === String(appliedSearch.centroCusto));
    return found ? found.nome : appliedSearch.centroCusto;
  }, [appliedSearch, centroCustoOptions]);

  const appliedContaAnaliseLabel = useMemo(() => {
    if (!appliedSearch || !appliedSearch.contaAnalise || appliedSearch.contaAnalise === "todos") {
      return "Todas";
    }
    return appliedSearch.contaAnalise;
  }, [appliedSearch]);

  const toggleStockCategory = (catId: string) => {
    setSelectedStockCategories((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    );
  };

  const handleResetFilters = () => {
    setStartDate("");
    setEndDate("");
    setStatus("todos");
    setEntity("todos");
    setCentroCusto("todos");
    setContaAnalise("todos");
    setStockDate(new Date().toISOString().split("T")[0]);
    setSelectedStockCategories([]);
    setQuickSearch("");
    setAppliedSearch(null);
    setSearchedFaturas([]);
    setSearchedPedidos([]);
    setSearchedFechos([]);
    setSearchedEstoque([]);
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
              <div className="grid grid-cols-3 gap-2">
                {reportOptions.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = reportType === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setReportType(opt.id as ReportType);
                        setEntity("todos");
                        setStatus("todos");
                        setCentroCusto("todos");
                        setContaAnalise("todos");
                      }}
                      className={`flex items-center gap-2 p-2 px-2.5 rounded-lg border transition-all text-left cursor-pointer ${
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

            <div className="pt-6 border-t border-zinc-800/50 mt-auto grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleSearch}
                disabled={previewLoading}
                className="w-full px-5 py-3.5 bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed whitespace-nowrap shrink-0 cursor-pointer"
              >
                {previewLoading ? (
                  <span className="animate-pulse">A Pesquisar...</span>
                ) : (
                  <>
                    <Search size={18} /> Pesquisar
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleExport}
                disabled={loading}
                className="w-full px-5 py-3.5 bg-blue-500 text-white font-bold text-sm rounded-xl hover:bg-blue-600 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20 whitespace-nowrap shrink-0 cursor-pointer"
              >
                {loading ? (
                  <span className="animate-pulse">A Processar...</span>
                ) : (
                  <>
                    <Download size={18} /> Baixar Relatório
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {reportType === "estoque" ? (
              <>
                <div>
                  <label className="flex items-center gap-2 text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-3">
                    <Calendar size={14} /> Data do Estoque
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={stockDate}
                      onChange={(e) => setStockDate(e.target.value)}
                      className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 font-medium outline-none focus:border-teal-500 transition-colors tabular-nums"
                    />
                    <button
                      type="button"
                      onClick={() => setStockDate(new Date().toISOString().split("T")[0])}
                      className="px-3.5 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-xs font-semibold text-zinc-300 transition-colors whitespace-nowrap cursor-pointer"
                    >
                      Hoje
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="flex items-center gap-2 text-[11px] font-bold text-zinc-400 uppercase tracking-widest">
                      <Layers size={14} /> Filtrar por Categorias
                    </label>
                    {selectedStockCategories.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedStockCategories([])}
                        className="text-[10px] font-semibold text-teal-400 hover:text-teal-300 transition-colors cursor-pointer"
                      >
                        Selecionar todas
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedStockCategories([])}
                      className={cn(
                        "px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer",
                        selectedStockCategories.length === 0
                          ? "bg-teal-500/15 border-teal-500 text-teal-300"
                          : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                      )}
                    >
                      {selectedStockCategories.length === 0 && <Check size={12} />}
                      Todas as Categorias
                    </button>
                    {categorias.map((cat) => {
                      const cid = String(cat.id);
                      const isActive = selectedStockCategories.includes(cid);
                      return (
                        <button
                          key={cid}
                          type="button"
                          onClick={() => toggleStockCategory(cid)}
                          className={cn(
                            "px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer",
                            isActive
                              ? "bg-teal-500/15 border-teal-500 text-teal-300"
                              : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                          )}
                        >
                          {isActive && <Check size={12} />}
                          {cat.nome}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <>
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
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 font-medium outline-none focus:border-blue-500 transition-colors tabular-nums"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] font-medium text-zinc-500 mb-1.5">Data Final</span>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 font-medium outline-none focus:border-blue-500 transition-colors tabular-nums"
                      />
                    </div>
                  </div>
                </div>

                {["pagar", "faturas_pagas", "iva_credito"].includes(reportType) ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="flex items-center gap-2 text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-2.5">
                          <Building2 size={14} /> Centro de Custo
                        </label>
                        <SearchableCombobox
                          value={centroCusto}
                          onChange={(val) => setCentroCusto(val || "todos")}
                          placeholder="Pesquisar Centro de Custo..."
                          options={centroCustoOptions}
                        />
                      </div>

                      <div>
                        <label className="flex items-center gap-2 text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-2.5">
                          <Layers size={14} /> Conta de Análise
                        </label>
                        <SearchableCombobox
                          value={contaAnalise}
                          onChange={(val) => setContaAnalise(val || "todos")}
                          placeholder="Pesquisar Conta de Análise..."
                          options={contaAnaliseOptions}
                        />
                      </div>
                    </div>

                    <div className={cn("grid grid-cols-1 gap-3", reportType === "pagar" ? "sm:grid-cols-2" : "")}>
                      <div>
                        <label className="flex items-center gap-2 text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-2.5">
                          <Users size={14} /> Filtrar por Fornecedor
                        </label>
                        <SearchableCombobox
                          value={entity}
                          onChange={(val) => setEntity(val || "todos")}
                          placeholder="Pesquisar fornecedor..."
                          options={entityOptions}
                        />
                      </div>

                      {reportType === "pagar" && (
                        <div>
                          <label className="flex items-center gap-2 text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-2.5">
                            <Filter size={14} /> Estado de Pagamento
                          </label>
                          <div className="relative">
                            <select
                              value={status}
                              onChange={(e) => setStatus(e.target.value)}
                              className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 sm:py-2 text-sm text-zinc-100 font-medium outline-none focus:border-blue-500 appearance-none transition-colors"
                            >
                              <option value="todos">Todos os Estados</option>
                              <option value="nao_pago">Pendentes</option>
                              <option value="pago">Pagos</option>
                            </select>
                            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="flex items-center gap-2 text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-3">
                        <Building2 size={14} />{" "}
                        {reportType === "fornecedores"
                          ? "Filtrar por Fornecedor"
                          : "Filtrar por Loja"}
                      </label>
                      <div className="relative">
                        <SearchableCombobox
                          value={entity}
                          onChange={(val) => setEntity(val || "todos")}
                          placeholder="Pesquisar..."
                          options={entityOptions}
                        />
                      </div>
                    </div>

                    {!["iva_credito", "consumo_lojas", "fornecedores", "faturas_pagas", "fechos"].includes(reportType) && (
                      <div>
                        <label className="flex items-center gap-2 text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-3">
                          <Filter size={14} /> Status de Pagamento
                        </label>
                        <div className="relative">
                          <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 font-medium outline-none focus:border-blue-500 appearance-none transition-colors"
                          >
                            <option value="todos">Todos os Status</option>
                            <option value="pago">Recebidos</option>
                            <option value="nao_pago">A Receber</option>
                          </select>
                          <ChevronDown size={16} className="absolute right-4 top-3.5 text-zinc-500 pointer-events-none" />
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            <div>
              <label className="flex items-center gap-2 text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-3">
                Formato Final do Arquivo
              </label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setFormat("pdf")}
                  className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border transition-all cursor-pointer ${
                    format === "pdf"
                      ? "bg-red-500/10 border-red-500 text-red-500"
                      : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-800/50"
                  }`}
                >
                  <FileText size={18} /> <span className="font-bold text-sm tracking-wide">PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormat("csv")}
                  className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border transition-all cursor-pointer ${
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

      {/* Bottom Interactive Preview & Smart Suggestions Box — Populated ONLY on "Pesquisar" click */}
      <div className="mt-6 bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden">
        {!appliedSearch ? (
          <div className="px-6 py-14 text-center flex flex-col items-center justify-center">
            <Search className="w-8 h-8 text-zinc-700 mb-3" />
            <h3 className="text-sm font-semibold text-zinc-300">Caixa de Resultados e Sugestões</h3>
            <p className="text-xs text-zinc-500 mt-1 max-w-md leading-relaxed">
              Escolha o tipo de relatório, defina as datas ou filtros desejados acima e clique em <strong className="text-zinc-300">Pesquisar</strong> para consultar o banco de dados e exibir os resultados aqui.
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
                  <span>{appliedSearch.reportType === "estoque" ? "Data" : "Período"}: {appliedPeriodLabel}</span>
                  <span aria-hidden="true">·</span>
                  <span className="truncate max-w-[300px]">
                    {appliedSearch.reportType === "estoque"
                      ? `Categorias: ${appliedEntityLabel}`
                      : ["pagar", "faturas_pagas", "iva_credito"].includes(appliedSearch.reportType)
                      ? `Fornecedor: ${appliedEntityLabel}`
                      : `Filtro: ${appliedEntityLabel}`}
                  </span>
                  {["pagar", "faturas_pagas", "iva_credito"].includes(appliedSearch.reportType) && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>Centro de Custo: {appliedCentroCustoLabel}</span>
                      <span aria-hidden="true">·</span>
                      <span>Conta Análise: {appliedContaAnaliseLabel}</span>
                    </>
                  )}
                  {!["iva_credito", "consumo_lojas", "fornecedores", "faturas_pagas", "fechos", "estoque"].includes(appliedSearch.reportType) && appliedSearch.status !== "todos" && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>
                        Estado:{" "}
                        {appliedSearch.status === "pago"
                          ? appliedSearch.reportType === "pagar"
                            ? "Pagos"
                            : "Recebidos"
                          : appliedSearch.reportType === "pagar"
                          ? "Pendentes"
                          : "A Receber"}
                      </span>
                    </>
                  )}
                  {livePreview && !previewLoading && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="text-zinc-200 font-medium">
                        {livePreview.rows.length} {appliedSearch.reportType === "estoque" ? "artigos" : "registos"}
                      </span>
                      {appliedSearch.reportType !== "estoque" && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-zinc-100 font-semibold">
                            {livePreview.summaryLabel}: {formatCurrency(livePreview.summaryTotal)}
                          </span>
                        </>
                      )}
                    </>
                  )}
                  {isDirtySinceLastSearch && !previewLoading && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="text-amber-400 font-medium">
                        Filtros alterados — clique em Pesquisar para atualizar
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
                    onChange={(e) => {
                      setQuickSearch(e.target.value);
                      setVisibleLimit(50);
                    }}
                    placeholder="Filtrar nos resultados carregados..."
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

            {/* Contextual Smart Suggestions Bar (operates in-memory over fetched results — zero DB calls) */}
            {!previewLoading && smartSuggestions.length > 0 && (
              <div className="px-6 py-3 border-b border-zinc-800/80 bg-zinc-900/30 flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-zinc-500 mr-1 whitespace-nowrap shrink-0">
                  Sugestões nos resultados:
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
                  Ajuste as datas ou filtros acima e clique em Pesquisar novamente.
                </p>
                {quickSearch !== "" && (
                  <div className="mt-4 flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => setQuickSearch("")}
                      className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-xs font-medium text-zinc-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Limpar Filtro Local
                    </button>
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
